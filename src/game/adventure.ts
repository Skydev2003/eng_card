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

export const mascots = {
  fox: "จิ้งจอก", bunny: "กระต่าย", chick: "ลูกเจี๊ยบ",
};
export const palettes = {
  original: { label: "สีดั้งเดิม", swatch: "#fbbd58" },
  mint: { label: "มิ้นต์", swatch: "#86e6b0" },
  berry: { label: "เบอร์รี", swatch: "#ed91ba" },
};
export type Avatar = { mascot: keyof typeof mascots; palette: keyof typeof palettes };
export const defaultAvatar: Avatar = { mascot: "fox", palette: "original" };

export function validAvatar(value: unknown): value is Avatar {
  if (!value || typeof value !== "object") return false;
  const avatar = value as Partial<Avatar>;
  return typeof avatar.mascot === "string" && Object.hasOwn(mascots, avatar.mascot)
    && typeof avatar.palette === "string" && Object.hasOwn(palettes, avatar.palette);
}

const avatarHues: Record<Avatar["mascot"], Record<Avatar["palette"], number>> = {
  fox: { original: 0, mint: 112, berry: -53 },
  bunny: { original: 0, mint: -53, berry: 132 },
  chick: { original: 0, mint: 96, berry: -77 },
};

export function avatarHue(avatar: Avatar) {
  return avatarHues[avatar.mascot][avatar.palette];
}
