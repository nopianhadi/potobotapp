create extension if not exists pgcrypto;

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index workspace_members_user_idx on public.workspace_members (user_id, workspace_id);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  event_date date,
  timezone text not null default 'UTC',
  experience text not null default 'photo' check (experience in ('photo', 'gif', 'boomerang', 'video', '360')),
  status text not null default 'draft' check (status in ('draft', 'ready', 'active', 'completed', 'archived')),
  settings jsonb not null default '{}'::jsonb,
  guest_link_enabled boolean not null default false,
  guest_password_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_id_workspace_unique unique (id, workspace_id)
);
create index events_workspace_updated_idx on public.events (workspace_id, updated_at desc);
create index events_workspace_date_idx on public.events (workspace_id, event_date desc);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  capture_mode text not null check (capture_mode in ('photo', 'gif', 'boomerang', 'video', '360')),
  status text not null default 'started' check (status in ('started', 'completed', 'cancelled', 'failed')),
  consent boolean,
  consent_text_version text,
  answers jsonb not null default '[]'::jsonb,
  guest_label text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint sessions_id_workspace_unique unique (id, workspace_id),
  constraint sessions_event_workspace_fk foreign key (event_id, workspace_id)
    references public.events (id, workspace_id) on delete cascade,
  constraint sessions_completion_order check (completed_at is null or completed_at >= started_at)
);
create index sessions_workspace_event_started_idx on public.sessions (workspace_id, event_id, started_at desc);
create index sessions_workspace_status_idx on public.sessions (workspace_id, status, started_at desc);

create table public.media_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete set null,
  media_type text not null check (media_type in ('photo', 'gif', 'video')),
  storage_path text not null,
  mime_type text not null,
  byte_size bigint not null check (byte_size > 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint media_id_workspace_unique unique (id, workspace_id),
  constraint media_event_workspace_fk foreign key (event_id, workspace_id)
    references public.events (id, workspace_id) on delete cascade,
  constraint media_session_workspace_fk foreign key (session_id, workspace_id)
    references public.sessions (id, workspace_id) on delete set null (session_id)
);
create index media_workspace_event_created_idx on public.media_items (workspace_id, event_id, created_at desc);
create index media_session_idx on public.media_items (session_id);
create unique index media_storage_path_unique on public.media_items (storage_path);

create table public.share_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  media_id uuid references public.media_items(id) on delete set null,
  channel text not null check (channel in ('download', 'web_share', 'email', 'sms', 'whatsapp', 'qr')),
  status text not null default 'requested' check (status in ('requested', 'sent', 'failed')),
  provider_reference text,
  created_at timestamptz not null default now(),
  constraint share_event_workspace_fk foreign key (event_id, workspace_id)
    references public.events (id, workspace_id) on delete cascade,
  constraint share_media_workspace_fk foreign key (media_id, workspace_id)
    references public.media_items (id, workspace_id) on delete set null (media_id)
);
create index share_events_workspace_event_created_idx on public.share_events (workspace_id, event_id, created_at desc);
create index share_events_media_idx on public.share_events (media_id);

create table public.print_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  media_id uuid not null references public.media_items(id) on delete cascade,
  printer_label text,
  status text not null default 'queued' check (status in ('queued', 'printing', 'completed', 'failed', 'cancelled')),
  options jsonb not null default '{}'::jsonb,
  error_code text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint print_event_workspace_fk foreign key (event_id, workspace_id)
    references public.events (id, workspace_id) on delete cascade,
  constraint print_media_workspace_fk foreign key (media_id, workspace_id)
    references public.media_items (id, workspace_id) on delete cascade
);
create index print_jobs_workspace_event_created_idx on public.print_jobs (workspace_id, event_id, created_at desc);
create index print_jobs_status_created_idx on public.print_jobs (status, created_at);

create or replace function public.is_workspace_member(target_workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = target_workspace and m.user_id = auth.uid()
  );
$$;

create or replace function public.can_manage_workspace(target_workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = target_workspace
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin', 'editor')
  );
$$;

create or replace function public.can_admin_workspace(target_workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = target_workspace
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  );
$$;

create or replace function public.is_workspace_owner(target_workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = target_workspace
      and m.user_id = auth.uid()
      and m.role = 'owner'
  );
$$;

create or replace function public.prevent_last_workspace_owner_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if pg_trigger_depth() > 1 then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  if old.role = 'owner'
    and (tg_op = 'DELETE' or (tg_op = 'UPDATE' and new.role <> 'owner'))
    and not exists (
      select 1 from public.workspace_members m
      where m.workspace_id = old.workspace_id
        and m.user_id <> old.user_id
        and m.role = 'owner'
    ) then
    raise exception 'A workspace must retain at least one owner';
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger workspace_members_keep_owner
before update or delete on public.workspace_members
for each row execute function public.prevent_last_workspace_owner_change();

create or replace function public.add_workspace_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.workspace_members (workspace_id, user_id, role)
  values (new.id, new.created_by, 'owner');
  return new;
end;
$$;

create trigger workspaces_add_owner
after insert on public.workspaces
for each row execute function public.add_workspace_owner();

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.events enable row level security;
alter table public.sessions enable row level security;
alter table public.media_items enable row level security;
alter table public.share_events enable row level security;
alter table public.print_jobs enable row level security;

create policy workspaces_read_member on public.workspaces for select
  using (public.is_workspace_member(id));
create policy workspaces_create_self on public.workspaces for insert
  with check (created_by = auth.uid());
create policy workspaces_update_admin on public.workspaces for update
  using (public.can_admin_workspace(id)) with check (public.can_admin_workspace(id));
create policy workspaces_delete_owner on public.workspaces for delete
  using (public.is_workspace_owner(id));
create policy members_read_member on public.workspace_members for select
  using (public.is_workspace_member(workspace_id));
create policy members_create_owner on public.workspace_members for insert
  with check (public.is_workspace_owner(workspace_id));
create policy members_update_owner on public.workspace_members for update
  using (public.is_workspace_owner(workspace_id))
  with check (public.is_workspace_owner(workspace_id));
create policy members_delete_owner on public.workspace_members for delete
  using (public.is_workspace_owner(workspace_id));
create policy events_read_member on public.events for select
  using (public.is_workspace_member(workspace_id));
create policy events_write_editor on public.events for all
  using (public.can_manage_workspace(workspace_id))
  with check (public.can_manage_workspace(workspace_id));
create policy sessions_read_member on public.sessions for select
  using (public.is_workspace_member(workspace_id));
create policy sessions_write_editor on public.sessions for all
  using (public.can_manage_workspace(workspace_id))
  with check (public.can_manage_workspace(workspace_id));
create policy media_read_member on public.media_items for select
  using (public.is_workspace_member(workspace_id));
create policy media_write_editor on public.media_items for all
  using (public.can_manage_workspace(workspace_id))
  with check (public.can_manage_workspace(workspace_id));
create policy shares_read_member on public.share_events for select
  using (public.is_workspace_member(workspace_id));
create policy shares_write_editor on public.share_events for all
  using (public.can_manage_workspace(workspace_id))
  with check (public.can_manage_workspace(workspace_id));
create policy print_jobs_read_member on public.print_jobs for select
  using (public.is_workspace_member(workspace_id));
create policy print_jobs_write_editor on public.print_jobs for all
  using (public.can_manage_workspace(workspace_id))
  with check (public.can_manage_workspace(workspace_id));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-media',
  'event-media',
  false,
  52428800,
  array['image/jpeg', 'image/png', 'image/gif', 'video/webm']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy event_media_read_member on storage.objects for select
  using (
    bucket_id = 'event-media'
    and public.is_workspace_member(((storage.foldername(name))[1])::uuid)
  );
create policy event_media_insert_editor on storage.objects for insert
  with check (
    bucket_id = 'event-media'
    and public.can_manage_workspace(((storage.foldername(name))[1])::uuid)
  );
create policy event_media_delete_editor on storage.objects for delete
  using (
    bucket_id = 'event-media'
    and public.can_manage_workspace(((storage.foldername(name))[1])::uuid)
  );