import { describe, expect, it, vi } from "vitest";
import { cameraErrorMessage, chooseCameraDevice, isExternalCameraDevice, requestCameraStream } from "./camera";

function makeStream(audioTracks: MediaStreamTrack[] = []) {
  return {
    getAudioTracks: () => audioTracks,
  } as unknown as MediaStream;
}

describe("camera acquisition", () => {
  it("falls back to a video-only stream when microphone access is unavailable", async () => {
    const stream = makeStream();
    const getUserMedia = vi.fn()
      .mockRejectedValueOnce(new DOMException("No microphone", "NotFoundError"))
      .mockResolvedValueOnce(stream);

    const result = await requestCameraStream({ getUserMedia }, "environment", true);

    expect(getUserMedia).toHaveBeenCalledTimes(2);
    expect(getUserMedia.mock.calls[0][0]).toMatchObject({ audio: true, video: { facingMode: { ideal: "environment" } } });
    expect(getUserMedia.mock.calls[1][0]).toMatchObject({ audio: false, video: { facingMode: { ideal: "environment" } } });
    expect(result).toEqual({ stream, audioAvailable: false });
  });

  it("keeps the camera available when microphone permission is denied", async () => {
    const stream = makeStream();
    const getUserMedia = vi.fn()
      .mockRejectedValueOnce(new DOMException("Microphone permission denied", "NotAllowedError"))
      .mockResolvedValueOnce(stream);

    const result = await requestCameraStream({ getUserMedia }, "user", true);

    expect(getUserMedia).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ stream, audioAvailable: false });
  });

  it("retries with browser-default camera settings after an unsupported camera preference", async () => {
    const stream = makeStream();
    const getUserMedia = vi.fn()
      .mockRejectedValueOnce(new DOMException("Constraint unavailable", "OverconstrainedError"))
      .mockResolvedValueOnce(stream);

    const result = await requestCameraStream({ getUserMedia }, "user", false);

    expect(getUserMedia).toHaveBeenCalledTimes(2);
    expect(getUserMedia.mock.calls[1][0]).toEqual({ video: true, audio: false });
    expect(result.stream).toBe(stream);
  });

  it("uses a more forgiving fallback for phone cameras when strict constraints are rejected", async () => {
    const stream = makeStream();
    const getUserMedia = vi.fn()
      .mockRejectedValueOnce(new DOMException("Constraint unavailable on phone", "OverconstrainedError"))
      .mockRejectedValueOnce(new DOMException("Width is unsupported", "OverconstrainedError"))
      .mockResolvedValueOnce(stream);

    const result = await requestCameraStream({ getUserMedia }, "environment", false);

    expect(getUserMedia).toHaveBeenCalledTimes(3);
    expect(getUserMedia.mock.calls[2][0]).toMatchObject({ audio: false, video: { facingMode: { ideal: "environment" } } });
    expect(result).toEqual({ stream, audioAvailable: false });
  });

  it("does not retry after camera permission is denied", async () => {
    const getUserMedia = vi.fn().mockRejectedValue(new DOMException("Permission denied", "NotAllowedError"));

    await expect(requestCameraStream({ getUserMedia }, "user", false)).rejects.toMatchObject({ name: "NotAllowedError" });
    expect(getUserMedia).toHaveBeenCalledTimes(1);
  });

  it("explains when no camera device is available", () => {
    expect(cameraErrorMessage(new DOMException("No camera", "NotFoundError"), true)).toContain("Kamera tidak ditemukan");
  });

  it("prefers USB/OTG cameras before built-in phone cameras", () => {
    const external = { deviceId: "usb-1", label: "USB Camera (UVC)" } as MediaDeviceInfo;
    const internal = { deviceId: "rear-1", label: "Rear camera" } as MediaDeviceInfo;

    expect(isExternalCameraDevice(external)).toBe(true);
    expect(isExternalCameraDevice(internal)).toBe(false);
    expect(chooseCameraDevice([internal, external], "environment")?.deviceId).toBe("usb-1");
  });

  it("tries a device-specific request before the facing-mode constraint for USB OTG devices", async () => {
    const stream = makeStream();
    const getUserMedia = vi.fn()
      .mockRejectedValueOnce(new DOMException("Camera does not support facing mode", "OverconstrainedError"))
      .mockResolvedValueOnce(stream);

    const result = await requestCameraStream({ getUserMedia }, "environment", false, "usb-camera-1");

    expect(getUserMedia).toHaveBeenCalledTimes(2);
    expect(getUserMedia.mock.calls[0][0]).toMatchObject({ audio: false, video: { deviceId: { ideal: "usb-camera-1" } } });
    expect(result).toEqual({ stream, audioAvailable: false });
  });
});