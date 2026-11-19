export const STAGE_LENGTH = 10;
export const stages = [
  { name: "ป่าแสงเช้า", scene: "forest" },
  { name: "ลำน้ำสีมรกต", scene: "river" },
  { name: "ซากเมืองเถาวัลย์", scene: "ruins" },
  { name: "ทุ่งแสงอาทิตย์", scene: "grove" },
] as const;

export function runProgress(correct: number) {
  const distance = correct * 100;
  const stageIndex = Math.min(stages.length - 1, Math.floor(correct / STAGE_LENGTH));
  const steps = Math.min(STAGE_LENGTH, correct - stageIndex * STAGE_LENGTH);
  return { distance, stageIndex, steps, stage: stages[stageIndex] };
}

export const hikers = {
  midnight: "แมวดำ", bear: "หมีน้อย", straw: "แมวหมวกฟาง", tabby: "แมวลาย",
  bunny: "กระต่าย", lamb: "แกะน้อย", sloth: "สลอธ", capybara: "คาปิบารา",
  otter: "นากน้อย", calico: "แมวสามสี",
};

const mascots = { ...hikers, fox: "จิ้งจอก", chick: "ลูกเจี๊ยบ" };

export function mascotArt(mascot: Avatar["mascot"]): keyof typeof hikers {
  if (mascot === "fox") return "calico";
  if (mascot === "chick") return "bear";
  return mascot;
}

export function peerOffset(peerCorrect: number, localCorrect: number) {
  return Math.max(-29, Math.min(33, (peerCorrect - localCorrect) * 3.5));
}

export const palettes = {
  original: { label: "สีดั้งเดิม", swatch: "#fbbd58" },
  mint: { label: "มิ้นต์", swatch: "#86e6b0" },
  berry: { label: "เบอร์รี", swatch: "#ed91ba" },
};
export type Avatar = { mascot: keyof typeof mascots; palette: keyof typeof palettes };
export const defaultAvatar: Avatar = { mascot: "calico", palette: "original" };

export function validAvatar(value: unknown): value is Avatar {
  if (!value || typeof value !== "object") return false;
  const avatar = value as Partial<Avatar>;
  return typeof avatar.mascot === "string" && Object.hasOwn(mascots, avatar.mascot)
    && typeof avatar.palette === "string" && Object.hasOwn(palettes, avatar.palette);
}

const baseHues: Record<keyof typeof hikers, number> = {
  midnight: 17, bear: 38, straw: 41, tabby: -8, bunny: 195,
  lamb: 73, sloth: 81, capybara: 27, otter: 28, calico: 35,
};

export function avatarHue(avatar: Avatar) {
  if (avatar.palette === "original") return 0;
  const tint = avatar.palette === "mint" ? 136 : 325;
  return tint - baseHues[mascotArt(avatar.mascot)];
}
