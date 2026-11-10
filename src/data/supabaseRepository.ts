import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppRepository } from "./repository";
import { normalizeEventSettings, sessionAnswersText, type BoothEvent, type CaptureMode, type EventSettings, type MediaItem, type NewEventInput, type PrintRecord, type SavedSession, type ShareChannel, type ShareRecord, type SurveyAnswer } from "./types";

const mediaBucket = "event-media";
const maxMediaBytes = 50 * 1024 * 1024;

function makeId() {
  return crypto.randomUUID();
}

function mapAnswers(answers: unknown): SurveyAnswer[] {
  if (!Array.isArray(answers)) return [];
  const result: SurveyAnswer[] = [];
  for (const entry of answers) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    if (typeof row.answer !== "string") continue;
    result.push({
      questionId: typeof row.questionId === "string" ? row.questionId : "",
      prompt: typeof row.prompt === "string" ? row.prompt : "",
      answer: row.answer,
    });
  }
  return result;
}

function mapEvent(row: Record<string, unknown>): BoothEvent {
  return {
    id: String(row.id),
    title: String(row.title),
    date: typeof row.event_date === "string" ? row.event_date : "",
    timezone: typeof row.timezone === "string" ? row.timezone : "UTC",
    experience: row.experience as CaptureMode,
    status: row.status as BoothEvent["status"],
    settings: normalizeEventSettings(row.settings as Partial<EventSettings> ?? {}),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapSession(row: Record<string, unknown>): SavedSession {
  const answers = mapAnswers(row.answers);
  return {
    id: String(row.id),
    eventId: String(row.event_id),
    mode: row.capture_mode as CaptureMode,
    consent: typeof row.consent === "boolean" ? row.consent : null,
    answer: sessionAnswersText(answers),
    answers,
    startedAt: String(row.started_at),
    completedAt: typeof row.completed_at === "string" ? row.completed_at : String(row.started_at),
  };
}

function mapPrint(row: Record<string, unknown>): PrintRecord {
  const options = row.options && typeof row.options === "object" ? row.options as Record<string, unknown> : {};
  return {
    id: String(row.id),
    eventId: String(row.event_id),
    mediaId: String(row.media_id),
    copies: typeof options.copies === "number" ? options.copies : 1,
    createdAt: String(row.created_at),
  };
}

function mapShare(row: Record<string, unknown>): ShareRecord {
  return {
    id: String(row.id),
    eventId: String(row.event_id),
    mediaId: row.media_id === null || row.media_id === undefined ? null : String(row.media_id),
    channel: row.channel as ShareChannel,
    createdAt: String(row.created_at),
  };
}

export function createSupabaseRepository(client: SupabaseClient): AppRepository {
  let workspacePromise: Promise<string> | null = null;

  async function getWorkspaceId(): Promise<string> {
    if (workspacePromise) return workspacePromise;
    workspacePromise = (async () => {
      const { data: userData, error: userError } = await client.auth.getUser();
      if (userError || !userData.user) throw userError ?? new Error("Sesi akun tidak tersedia.");
      const { data: memberships, error: membershipError } = await client
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", userData.user.id)
        .order("created_at", { ascending: true })
        .limit(1);
      if (membershipError) throw membershipError;
      const membership = memberships?.[0] as { workspace_id: string } | undefined;
      if (membership) return membership.workspace_id;

      const displayName = userData.user.email?.split("@")[0] || "Event studio";
      const { data: workspace, error: workspaceError } = await client
        .from("workspaces")
        .insert({ name: `${displayName} workspace`, created_by: userData.user.id })
        .select("id")
        .single();
      if (workspaceError) throw workspaceError;
      return String((workspace as { id: string }).id);
    })().catch((error: unknown) => {
      workspacePromise = null;
      throw error;
    });
    return workspacePromise;
  }

  async function fetchMedia(row: Record<string, unknown>): Promise<MediaItem> {
    const storagePath = String(row.storage_path);
    const { data: signed, error: signedError } = await client.storage.from(mediaBucket).createSignedUrl(storagePath, 300);
    if (signedError) throw signedError;
    const response = await fetch(signed.signedUrl);
    if (!response.ok) throw new Error("Media tidak dapat diunduh dari penyimpanan privat.");
    const blob = await response.blob();
    return {
      id: String(row.id),
      eventId: String(row.event_id),
      sessionId: String(row.session_id ?? ""),
      type: row.media_type as MediaItem["type"],
      blob,
      createdAt: String(row.created_at),
      size: Number(row.byte_size),
    };
  }

  async function deleteSession(sessionId: string, workspaceId: string) {
    await client.from("sessions").delete().eq("id", sessionId).eq("workspace_id", workspaceId);
  }

  return {
    async listEvents() {
      const workspaceId = await getWorkspaceId();
      const { data, error } = await client.from("events").select("*").eq("workspace_id", workspaceId).order("updated_at", { ascending: false });
      if (error) throw error;
      return (data as Record<string, unknown>[]).map(mapEvent);
    },

    async getEvent(id) {
      const workspaceId = await getWorkspaceId();
      const { data, error } = await client.from("events").select("*").eq("id", id).eq("workspace_id", workspaceId).maybeSingle();
      if (error) throw error;
      return data ? mapEvent(data as Record<string, unknown>) : undefined;
    },

    async saveEvent(input: NewEventInput, id?: string) {
      const workspaceId = await getWorkspaceId();
      const values = {
        title: input.title.trim(),
        event_date: input.date || null,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        experience: input.experience,
        status: input.status ?? "draft",
        settings: input.settings,
        updated_at: new Date().toISOString(),
      };
      const result = id
        ? await client.from("events").update(values).eq("id", id).eq("workspace_id", workspaceId).select("*").single()
        : await client.from("events").insert({ ...values, workspace_id: workspaceId }).select("*").single();
      if (result.error) throw result.error;
      return mapEvent(result.data as Record<string, unknown>);
    },

    async duplicateEvent(id) {
      const source = await this.getEvent(id);
      if (!source) throw new Error("Event tidak ditemukan.");
      return this.saveEvent({ title: `${source.title} (salinan)`, date: source.date, experience: source.experience, settings: structuredClone(source.settings), status: "draft" });
    },

    async deleteEvent(id) {
      const workspaceId = await getWorkspaceId();
      const { data: media, error: mediaError } = await client.from("media_items").select("storage_path").eq("event_id", id).eq("workspace_id", workspaceId);
      if (mediaError) throw mediaError;
      const paths = (media as Array<{ storage_path: string }>).map((item) => item.storage_path);
      if (paths.length) {
        const { error: storageError } = await client.storage.from(mediaBucket).remove(paths);
        if (storageError) throw storageError;
      }
      const { error } = await client.from("events").delete().eq("id", id).eq("workspace_id", workspaceId);
      if (error) throw error;
    },

    async listMedia(eventId) {
      const workspaceId = await getWorkspaceId();
      const { data, error } = await client.from("media_items").select("*").eq("event_id", eventId).eq("workspace_id", workspaceId).order("created_at", { ascending: false });
      if (error) throw error;
      return Promise.all((data as Record<string, unknown>[]).map(fetchMedia));
    },

    async countMedia(eventId) {
      const workspaceId = await getWorkspaceId();
      const { count, error } = await client.from("media_items").select("id", { count: "exact", head: true }).eq("event_id", eventId).eq("workspace_id", workspaceId);
      if (error) throw error;
      return count ?? 0;
    },

    async getMedia(id) {
      const workspaceId = await getWorkspaceId();
      const { data, error } = await client.from("media_items").select("*").eq("id", id).eq("workspace_id", workspaceId).maybeSingle();
      if (error) throw error;
      return data ? fetchMedia(data as Record<string, unknown>) : undefined;
    },

    async saveCapture(input) {
      if (input.blob.size <= 0 || input.blob.size > maxMediaBytes) {
        throw new Error("Media harus berukuran antara 1 byte dan 50 MB.");
      }
      const workspaceId = await getWorkspaceId();
      const sessionId = makeId();
      const mediaId = makeId();
      const startedAt = input.startedAt || new Date().toISOString();
      const completedAt = new Date().toISOString();
      const answers = input.answers.map((entry) => ({ questionId: entry.questionId, prompt: entry.prompt, answer: entry.answer.trim().slice(0, 300) }));
      const answer = sessionAnswersText(answers) || input.answer.trim();
      const extension = input.mediaType === "photo" ? "jpg" : input.mediaType === "gif" ? "gif" : "webm";
      const contentType = input.blob.type.split(";")[0] || "application/octet-stream";
      const storagePath = `${workspaceId}/${input.eventId}/${sessionId}/${mediaId}.${extension}`;
      const sessionRow = {
        id: sessionId,
        workspace_id: workspaceId,
        event_id: input.eventId,
        capture_mode: input.mode,
        status: "completed",
        consent: input.consent,
        answers,
        started_at: startedAt,
        completed_at: completedAt,
      };
      const { error: sessionError } = await client.from("sessions").insert(sessionRow);
      if (sessionError) throw sessionError;

      let uploaded = false;
      try {
        const { error: uploadError } = await client.storage.from(mediaBucket).upload(storagePath, input.blob, {
          contentType,
          upsert: false,
        });
        if (uploadError) throw uploadError;
        uploaded = true;
        const mediaRow = {
          id: mediaId,
          workspace_id: workspaceId,
          event_id: input.eventId,
          session_id: sessionId,
          media_type: input.mediaType,
          storage_path: storagePath,
          mime_type: contentType,
          byte_size: input.blob.size,
        };
        const { error: mediaError } = await client.from("media_items").insert(mediaRow);
        if (mediaError) throw mediaError;
      } catch (error) {
        if (uploaded) await client.storage.from(mediaBucket).remove([storagePath]);
        await deleteSession(sessionId, workspaceId);
        throw error;
      }

      return {
        media: { id: mediaId, eventId: input.eventId, sessionId, type: input.mediaType, blob: input.blob, createdAt: completedAt, size: input.blob.size },
        session: { id: sessionId, eventId: input.eventId, mode: input.mode, consent: input.consent, answer, answers, startedAt, completedAt },
      };
    },

    async deleteMedia(id) {
      const workspaceId = await getWorkspaceId();
      const { data, error } = await client.from("media_items").select("storage_path").eq("id", id).eq("workspace_id", workspaceId).maybeSingle();
      if (error) throw error;
      if (!data) return;
      const { error: storageError } = await client.storage.from(mediaBucket).remove([(data as { storage_path: string }).storage_path]);
      if (storageError) throw storageError;
      const { error: deleteError } = await client.from("media_items").delete().eq("id", id).eq("workspace_id", workspaceId);
      if (deleteError) throw deleteError;
    },

    async listSessions(eventId) {
      const workspaceId = await getWorkspaceId();
      const { data, error } = await client.from("sessions").select("*").eq("event_id", eventId).eq("workspace_id", workspaceId).order("completed_at", { ascending: false });
      if (error) throw error;
      return (data as Record<string, unknown>[]).map(mapSession);
    },

    async recordPrint(input) {
      const workspaceId = await getWorkspaceId();
      const { data, error } = await client.from("print_jobs")
        .insert({
          workspace_id: workspaceId,
          event_id: input.eventId,
          media_id: input.mediaId,
          status: "completed",
          options: { copies: Math.max(1, Math.floor(input.copies) || 1) },
        })
        .select("id, event_id, media_id, options, created_at")
        .single();
      if (error) throw error;
      return mapPrint(data as Record<string, unknown>);
    },

    async listPrints(eventId) {
      const workspaceId = await getWorkspaceId();
      const { data, error } = await client.from("print_jobs")
        .select("id, event_id, media_id, options, created_at")
        .eq("event_id", eventId)
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as Record<string, unknown>[]).map(mapPrint);
    },

    async recordShare(input) {
      const workspaceId = await getWorkspaceId();
      const { data, error } = await client.from("share_events")
        .insert({ workspace_id: workspaceId, event_id: input.eventId, media_id: input.mediaId, channel: input.channel, status: "sent" })
        .select("id, event_id, media_id, channel, created_at")
        .single();
      if (error) throw error;
      return mapShare(data as Record<string, unknown>);
    },

    async listShares(eventId) {
      const workspaceId = await getWorkspaceId();
      const { data, error } = await client.from("share_events")
        .select("id, event_id, media_id, channel, created_at")
        .eq("event_id", eventId)
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as Record<string, unknown>[]).map(mapShare);
    },
  };
}