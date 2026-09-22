"use client";

import * as React from "react";

/**
 * A live microphone level, for the pre-join screen.
 *
 * Answers "is my mic actually working?" BEFORE anyone joins. That question
 * otherwise gets asked out loud, mid-call, to people who cannot hear it.
 *
 * The level is written straight onto an element's style every animation
 * frame rather than through React state: a meter re-rendering its whole card
 * sixty times a second is a real cost on the mid-range phones this audience
 * is on, and nothing else needs the number.
 */

/**
 * RMS level of time-domain samples, scaled to 0..1.
 *
 * Analyser byte samples are centred on 128 (silence). Normal speech sits
 * around 0.05–0.2 RMS, so the value is amplified before clamping — otherwise
 * the bar would barely move for anything short of shouting.
 */
export function rmsLevel(samples: Uint8Array, gain = 4): number {
  if (samples.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    const centred = (samples[i] - 128) / 128;
    sum += centred * centred;
  }
  const rms = Math.sqrt(sum / samples.length);
  return Math.min(1, rms * gain);
}

type AudioContextCtor = typeof AudioContext;

export function useAudioMeter(
  stream: MediaStream | null
): React.RefObject<HTMLDivElement | null> {
  const meterRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const track = stream?.getAudioTracks()[0];
    if (!stream || !track) return;

    const Ctor: AudioContextCtor | undefined =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: AudioContextCtor })
        .webkitAudioContext;
    if (!Ctor) return;

    const context = new Ctor();
    // A stream of just the audio track: the analyser never needs video, and
    // a camera track in the graph would be one more thing kept alive.
    const source = context.createMediaStreamSource(new MediaStream([track]));
    const analyser = context.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    // Deliberately NOT connected to context.destination: routing your own
    // microphone to your own speakers is instant feedback howl.

    const samples = new Uint8Array(analyser.fftSize);
    let frame = 0;
    let smoothed = 0;

    const tick = () => {
      analyser.getByteTimeDomainData(samples);
      // Fast attack, slow release — how every hardware meter behaves, and it
      // stops the bar flickering between syllables.
      const level = rmsLevel(samples);
      smoothed = level > smoothed ? level : smoothed * 0.85 + level * 0.15;
      const element = meterRef.current;
      if (element) element.style.transform = `scaleX(${smoothed.toFixed(3)})`;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      source.disconnect();
      // Each AudioContext holds an audio thread; browsers cap how many can
      // exist, and a leaked one per preview would eventually exhaust it.
      void context.close();
    };
  }, [stream]);

  return meterRef;
}
