"use client";

import { useId } from "react";
import { Compass, Leaf, Settings2, Zap } from "lucide-react";
import { DEFAULT_QUESTION_SECONDS, QUESTION_SECONDS } from "@/game/question-timer";
import { categories, difficulties, type Settings } from "@/game/rules";

const difficultyOptions = {
  easy: { title: "ง่าย", hint: "คำพื้นฐาน ตัวเลือกต่างกันชัด", icon: Leaf },
  normal: { title: "ปกติ", hint: "คำหลากหลาย ตัวเลือกหมวดเดียวกัน", icon: Compass },
  hard: { title: "ยาก", hint: "ศัพท์เฉพาะขึ้น ตัวเลือกที่คล้ายกัน", icon: Zap },
};

export function RoundSettings({ value, onChange, disabled = false }: {
  value: Settings; onChange: (value: Settings) => void; disabled?: boolean;
}) {
  const difficultyName = useId();
  return <fieldset disabled={disabled} className="settings">
    <legend><Settings2 size={17} /> ตั้งค่ารอบ</legend>
    <label>หมวดคำศัพท์<select value={value.category} onChange={(e) => onChange({ ...value, category: e.target.value as Settings["category"] })}>
      {Object.entries(categories).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
    </select></label>
    <label>จำนวนหัวใจ<select value={value.hearts} onChange={(e) => onChange({ ...value, hearts: Number(e.target.value) })}>
      {[1, 2, 3, 4, 5].map((hearts) => <option key={hearts} value={hearts}>{hearts} ดวง</option>)}
    </select></label>
    <label className="question-setting">เวลาต่อข้อ<select value={value.questionSeconds ?? DEFAULT_QUESTION_SECONDS}
      onChange={(e) => onChange({ ...value, questionSeconds: Number(e.target.value) })}>
      {QUESTION_SECONDS.map((seconds) => <option key={seconds} value={seconds}>{seconds} วินาที</option>)}
    </select></label>
    <fieldset className="difficulty-field">
      <legend>ระดับความยาก</legend>
      <div className="difficulty-options">{Object.keys(difficulties).map((key) => {
        const difficulty = key as Settings["difficulty"];
        const { icon: Icon, title, hint } = difficultyOptions[difficulty];
        return <label key={key} className="difficulty-option">
          <input type="radio" name={difficultyName} value={key} checked={value.difficulty === key}
            onChange={() => onChange({ ...value, difficulty })} />
          <span className="difficulty-card"><Icon size={18} /><strong>{title}</strong><small>{hint}</small></span>
        </label>;
      })}</div>
    </fieldset>
  </fieldset>;
}
