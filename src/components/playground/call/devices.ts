import { CAMERA_CONSTRAINTS } from "./negotiation";

/**
 * Camera and microphone selection — pure helpers plus a guarded preference
 * store. The browser APIs themselves live in the hooks; the choices live here.
 */

export type DevicePrefs = {
  audio: string | null;
  video: string | null;
};

const DEVICES_KEY = "pmp.playground.call.devices";

export function readDevicePrefs(): DevicePrefs {
  try {
    const raw = window.localStorage.getItem(DEVICES_KEY);
    if (!raw) return { audio: null, video: null };
    const parsed = JSON.parse(raw) as Partial<DevicePrefs>;
    return {
      audio: typeof parsed.audio === "string" ? parsed.audio : null,
      video: typeof parsed.video === "string" ? parsed.video : null,
    };
  } catch {
    return { audio: null, video: null };
  }
}

export function writeDevicePrefs(prefs: DevicePrefs): void {
  try {
    window.localStorage.setItem(DEVICES_KEY, JSON.stringify(prefs));
  } catch {
    // Not remembered, still works.
  }
}

/**
 * The device to use: the remembered one if it is still plugged in, otherwise
 * the first available, otherwise none. A remembered headset that has since
 * been unplugged must not make joining fail.
 */
export function pickDevice(
  devices: readonly { deviceId: string }[],
  preferred: string | null
): string | null {
  if (preferred && devices.some((device) => device.deviceId === preferred)) {
    return preferred;
  }
  return devices[0]?.deviceId ?? null;
}

/**
 * A human name for a device. Browsers return EMPTY labels until the page has
 * been granted permission for that kind of device, so a list shown before the
 * first prompt would be a column of blanks without this fallback.
 */
export function deviceLabel(
  device: { label: string },
  index: number,
  fallback: string
): string {
  return device.label.trim() || `${fallback} ${index + 1}`;
}

/**
 * Microphone constraints.
 *
 * `exact` is for an explicit choice from the picker — if that device is gone,
 * failing loudly is right. Otherwise `ideal`: a remembered device is a
 * preference, and a missing one should quietly fall back rather than throw
 * OverconstrainedError at someone just trying to join.
 *
 * Echo cancellation and noise suppression are on explicitly: in a room where
 * people talk over a shared board from laptops, they are the difference
 * between usable and not.
 */
export function audioConstraints(
  deviceId: string | null,
  exact = false
): MediaTrackConstraints {
  const base: MediaTrackConstraints = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  };
  if (!deviceId) return base;
  return { ...base, deviceId: exact ? { exact: deviceId } : { ideal: deviceId } };
}

/** Camera constraints, with the same exact/ideal rule. */
export function videoConstraints(
  deviceId: string | null,
  exact = false
): MediaTrackConstraints {
  if (!deviceId) return CAMERA_CONSTRAINTS;
  return {
    ...CAMERA_CONSTRAINTS,
    deviceId: exact ? { exact: deviceId } : { ideal: deviceId },
  };
}

/** Classify a getUserMedia failure for a message a person can act on. */
export function mediaErrorKind(error: unknown): "permission" | "device" {
  return error instanceof DOMException &&
    (error.name === "NotAllowedError" || error.name === "SecurityError")
    ? "permission"
    : "device";
}
