import { create } from "zustand";
import { persist } from "zustand/middleware";
import { defaultAvatar, validAvatar, type Avatar } from "@/game/adventure";

export const useAvatar = create<{ avatar: Avatar; setAvatar: (avatar: Avatar) => void }>()(persist(
  (set) => ({ avatar: defaultAvatar, setAvatar: (avatar) => set({ avatar }) }),
  {
    name: "wordRunAvatar",
    skipHydration: true,
    merge(persisted, current) {
      const avatar = (persisted as { avatar?: unknown } | undefined)?.avatar;
      return validAvatar(avatar) ? { ...current, avatar } : current;
    },
  },
));
