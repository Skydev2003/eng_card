"use client";

import { useEffect, useRef, useState } from "react";

type Sound = "right" | "wrong" | "stage" | "click";
type Preferences = { music: boolean; effects: boolean };
const silent: Preferences = { music: false, effects: false };
const storageKey = "wordRunAudio";
const notes: Record<Sound, number[]> = {
  right: [659, 880], wrong: [247, 196], stage: [523, 659, 784, 1047], click: [392],
};

class ForestAudio {
  private readonly context = new AudioContext();
  private readonly effectGain = this.context.createGain();
  private readonly musicGain = this.context.createGain();
  private readonly windGain = this.context.createGain();
  private birds: ReturnType<typeof setInterval> | undefined;
  private suspendTimer: ReturnType<typeof setTimeout> | undefined;
  private wind: AudioBufferSourceNode | undefined;
  private musicTask: Promise<void> | undefined;
  private closed = false;
  private inTrail = false;
  private preferences = silent;

  constructor() {
    this.effectGain.gain.value = 0;
    this.musicGain.gain.value = 0;
    this.windGain.gain.value = 0;
    this.effectGain.connect(this.context.destination);
    this.musicGain.connect(this.context.destination);
    this.windGain.connect(this.effectGain);
  }

  private tone(frequency: number, offset: number, length: number, volume: number, end = frequency) {
    const ctx = this.context;
    const when = ctx.currentTime + offset;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.frequency.setValueAtTime(frequency, when);
    oscillator.frequency.exponentialRampToValueAtTime(end, when + length);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(volume, when + 0.023);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + length);
    oscillator.connect(gain).connect(this.effectGain);
    oscillator.start(when);
    oscillator.stop(when + length + 0.01);
  }

  private startWind() {
    if (this.wind) return;
    const ctx = this.context;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 5, ctx.sampleRate);
    const samples = buffer.getChannelData(0);
    let drift = 0;
    for (let i = 0; i < samples.length; i++) {
      drift = (drift + (Math.random() - 0.5) * 0.06) / 1.035;
      const endFade = Math.min(1, i / 2_000, (samples.length - i) / 2_000);
      samples[i] = drift * (0.43 + 0.23 * Math.sin(i / 14000)) * endFade;
    }
    this.wind = ctx.createBufferSource();
    this.wind.buffer = buffer;
    this.wind.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 470;
    this.wind.connect(filter).connect(this.windGain);
    this.wind.start();
    this.birds = setInterval(() => {
      if (document.hidden || !this.inTrail || !this.preferences.effects || ctx.state !== "running") return;
      this.tone(1500, 0, 0.08, 0.028, 2400);
      this.tone(2240, 0.13, 0.11, 0.027, 1620);
    }, 6_800);
  }

  private async startMusic() {
    const response = await fetch("/audio/lanterns-in-the-glade.mp3");
    if (!response.ok) throw new Error("Music unavailable");
    const buffer = await this.context.decodeAudioData(await response.arrayBuffer());
    if (this.closed) return;
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(this.musicGain);
    source.start();
  }

  apply(preferences: Preferences, inTrail: boolean, interaction = false) {
    if (this.closed) return;
    this.preferences = preferences;
    this.inTrail = inTrail;
    clearTimeout(this.suspendTimer);
    const ctx = this.context;
    if (interaction && (preferences.music || preferences.effects) && ctx.state !== "running") {
      void ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;
    this.effectGain.gain.setTargetAtTime(preferences.effects ? 0.5 : 0, now, 0.025);
    this.musicGain.gain.setTargetAtTime(preferences.music ? (inTrail ? 0.15 : 0.24) : 0, now, 0.04);
    this.windGain.gain.setTargetAtTime(inTrail && preferences.effects ? 1 : 0, now, 0.045);
    if (preferences.effects && inTrail) this.startWind();
    if (preferences.music) this.musicTask ??= this.startMusic().catch(() => { this.musicTask = undefined; });
    if (!preferences.music && !preferences.effects && ctx.state === "running") {
      this.suspendTimer = setTimeout(() => { void ctx.suspend().catch(() => {}); }, 220);
    }
  }

  play(sound: Sound) {
    if (!this.preferences.effects || this.context.state !== "running") return;
    notes[sound].forEach((frequency, index) => this.tone(frequency, index * 0.07,
      sound === "click" ? 0.085 : 0.17, sound === "click" ? 0.052 : 0.12));
  }

  close() {
    this.closed = true;
    clearInterval(this.birds);
    clearTimeout(this.suspendTimer);
    void this.context.close().catch(() => {});
  }
}

export function useTrailAudio(inTrail: boolean) {
  const audio = useRef<ForestAudio | null>(null);
  const preferenceRef = useRef(silent);
  const [preferences, setPreferences] = useState(silent);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const saved = JSON.parse(localStorage.getItem(storageKey) ?? "{}") as Partial<Preferences>;
        const next = { music: saved?.music === true, effects: saved?.effects === true };
        preferenceRef.current = next;
        setPreferences(next);
      } catch {}
    });
    return () => {
      cancelAnimationFrame(frame);
      audio.current?.close();
      audio.current = null;
    };
  }, []);

  useEffect(() => {
    audio.current?.apply(preferenceRef.current, inTrail);
    function unlock(event: PointerEvent | KeyboardEvent) {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest("[data-audio-toggle]")) return;
      if (event instanceof KeyboardEvent && event.key !== "Enter" && event.key !== " " && event.key !== "1" && event.key !== "2") return;
      const next = preferenceRef.current;
      if (!next.music && !next.effects) return;
      try {
        const controller = audio.current ??= new ForestAudio();
        controller.apply(next, inTrail, true);
        if (target?.closest("button")) controller.play("click");
      } catch {}
    }
    window.addEventListener("pointerdown", unlock, true);
    window.addEventListener("keydown", unlock, true);
    return () => {
      window.removeEventListener("pointerdown", unlock, true);
      window.removeEventListener("keydown", unlock, true);
    };
  }, [inTrail]);

  function toggle(channel: keyof Preferences) {
    const current = preferenceRef.current;
    const next = { ...current, [channel]: !current[channel] };
    try {
      if ((next.music || next.effects) && !audio.current) audio.current = new ForestAudio();
      audio.current?.apply(next, inTrail, true);
      if (channel === "effects" && next.effects) audio.current?.play("click");
      preferenceRef.current = next;
      setPreferences(next);
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
    } catch {}
  }

  return {
    music: preferences.music, enabled: preferences.effects, toggleMusic: () => toggle("music"),
    toggle: () => toggle("effects"), play: (sound: Sound) => audio.current?.play(sound),
  };
}

export type TrailAudio = ReturnType<typeof useTrailAudio>;
