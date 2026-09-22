"use client";

import * as React from "react";

/**
 * The cameras and microphones this browser can see, kept current as devices
 * are plugged in and out.
 *
 * `refreshKey` exists because device LABELS are empty until permission has
 * been granted. Bumping it after a successful getUserMedia re-enumerates, and
 * "Microphone 1" becomes "Jabra Evolve 20".
 */

export type MediaDeviceLists = {
  audio: MediaDeviceInfo[];
  video: MediaDeviceInfo[];
};

const EMPTY: MediaDeviceLists = { audio: [], video: [] };

export function useMediaDevices(refreshKey: unknown = 0): MediaDeviceLists {
  const [devices, setDevices] = React.useState<MediaDeviceLists>(EMPTY);

  React.useEffect(() => {
    const mediaDevices =
      typeof navigator === "undefined" ? undefined : navigator.mediaDevices;
    if (!mediaDevices?.enumerateDevices) return;

    let cancelled = false;
    const refresh = async () => {
      try {
        const list = await mediaDevices.enumerateDevices();
        if (cancelled) return;
        setDevices({
          // Empty ids are the pre-permission placeholders some browsers list;
          // selecting one would mean nothing.
          audio: list.filter((d) => d.kind === "audioinput" && d.deviceId),
          video: list.filter((d) => d.kind === "videoinput" && d.deviceId),
        });
      } catch {
        // Enumeration failing leaves the previous list in place.
      }
    };

    void refresh();
    mediaDevices.addEventListener("devicechange", refresh);
    return () => {
      cancelled = true;
      mediaDevices.removeEventListener("devicechange", refresh);
    };
  }, [refreshKey]);

  return devices;
}
