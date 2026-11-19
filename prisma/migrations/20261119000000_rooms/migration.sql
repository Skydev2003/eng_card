CREATE TABLE "game_rooms" (
  "code" VARCHAR(6) PRIMARY KEY,
  "topic" TEXT NOT NULL UNIQUE,
  "version" INTEGER NOT NULL DEFAULT 1,
  "state" JSONB NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "game_rooms_expiresAt_idx" ON "game_rooms" ("expiresAt");
ALTER TABLE "game_rooms" ENABLE ROW LEVEL SECURITY;

-- Broadcast a signal only. The API verifies membership before serving the snapshot.
CREATE FUNCTION public.notify_word_run() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  PERFORM realtime.send('{}'::jsonb, 'changed', NEW.topic, false);
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.notify_word_run() FROM PUBLIC;

DO $$
BEGIN
  IF to_regprocedure('realtime.send(jsonb,text,text,boolean)') IS NOT NULL THEN
    CREATE TRIGGER word_run_changed AFTER UPDATE OF version ON public.game_rooms
    FOR EACH ROW EXECUTE FUNCTION public.notify_word_run();
  END IF;
END;
$$;
