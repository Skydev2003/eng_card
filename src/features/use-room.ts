"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RoomAction, RoomView } from "@/game/room";

type Session = RoomView & { offset: number };

export function useRoom() {
  const [room, setRoom] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  const code = room?.code;
  const topic = room?.topic;
  const activeDeadline = room?.phase === "playing" ? room.endsAt - room.offset : null;

  const refresh = useCallback(async (roomCode: string, resume = false, signal?: AbortSignal) => {
    try {
      const response = await fetch(`/api/rooms?code=${roomCode}`, { cache: "no-store", signal });
      if (signal?.aborted) return;
      if (response.status === 401 || response.status === 404) {
        sessionStorage.removeItem("wordRunRoom");
        setRoom((current) => current?.code === roomCode ? null : current);
        if (!resume) setError("เซสชันห้องหมดอายุ กรุณาเข้าร่วมอีกครั้ง");
        return;
      }
      if (!response.ok) throw new Error();
      const data: RoomView = await response.json();
      if (signal?.aborted || sessionStorage.getItem("wordRunRoom") !== roomCode) return;
      setRoom((current) => current && (current.code !== roomCode || (current.version > data.version || (current.version === data.version && current.serverNow > data.serverNow)))
        ? current : { ...data, offset: data.serverNow - Date.now() });
    } catch {
      if (!signal?.aborted) setError("เชื่อมต่อห้องไม่ได้ ระบบจะลองเชื่อมต่อใหม่");
    }
  }, []);

  useEffect(() => {
    const saved = sessionStorage.getItem("wordRunRoom");
    const controller = new AbortController();
    const resume = setTimeout(() => { if (saved) void refresh(saved, true, controller.signal); }, 0);
    return () => { clearTimeout(resume); controller.abort(); };
  }, [refresh]);

  useEffect(() => {
    if (!code || !topic) return;
    let connected = false;
    let debounce: ReturnType<typeof setTimeout>;
    let interval: ReturnType<typeof setTimeout>;
    let disposed = false;
    let unsubscribe: (() => void) | undefined;
    const controller = new AbortController();
    const reload = () => refresh(code, false, controller.signal);
    const schedule = () => {
      if (disposed) return;
      interval = setTimeout(async () => { await reload(); schedule(); }, connected ? 12_000 : 2_500);
    };
    const queueReload = () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => { void reload(); }, 120);
    };
    schedule();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (url && key) {
      void import("@supabase/supabase-js").then(({ createClient }) => {
        if (disposed) return;
        const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
        const channel = client.channel(topic).on("broadcast", { event: "changed" }, queueReload);
        unsubscribe = () => { void client.removeChannel(channel); };
        channel.subscribe((status) => {
          connected = status === "SUBSCRIBED";
          if (connected) queueReload();
        });
      }).catch(() => { connected = false; });
    }
    window.addEventListener("focus", queueReload);
    return () => {
      disposed = true;
      controller.abort();
      clearTimeout(interval);
      clearTimeout(debounce);
      unsubscribe?.();
      window.removeEventListener("focus", queueReload);
    };
  }, [code, topic, refresh]);

  useEffect(() => {
    if (!code || activeDeadline === null) return;
    const timer = setTimeout(() => { void refresh(code); }, Math.max(0, activeDeadline - Date.now()) + 150);
    return () => clearTimeout(timer);
  }, [code, activeDeadline, refresh]);

  async function send(action: RoomAction) {
    if (pending.current) return false;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, ...action }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "ทำรายการไม่สำเร็จ");
      if (data) {
        const next: RoomView = data;
        sessionStorage.setItem("wordRunRoom", next.code);
        setRoom((current) => current?.code === next.code && current.version > next.version
          ? current : { ...next, offset: next.serverNow - Date.now() });
      } else {
        sessionStorage.removeItem("wordRunRoom");
        setRoom(null);
      }
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "เชื่อมต่อไม่ได้ กรุณาลองอีกครั้ง");
      return false;
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return { room, busy, error, send, refresh, clearError: () => setError("") };
}
