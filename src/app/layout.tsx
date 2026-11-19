import type { Metadata } from "next";
import "@fontsource-variable/noto-sans";
import "@fontsource-variable/noto-sans-thai";
import "./globals.css";

export const metadata: Metadata = {
  title: "WordRun · วิ่งหนีเจ้ามอนสเตอร์ ฝึกศัพท์อังกฤษ",
  description: "ดูภาพ เลือกคำศัพท์ แล้ววิ่งหนีเจ้ามอนสเตอร์ เล่นคนเดียวหรือแข่งกับเพื่อนได้สูงสุด 6 คน",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="th"><body>{children}</body></html>;
}
