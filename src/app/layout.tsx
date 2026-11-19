import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WordRun · วิ่งหนีซอมบี้ ฝึกศัพท์อังกฤษ",
  description: "ดูภาพ เลือกคำศัพท์ แล้ววิ่งหนีซอมบี้ เล่นคนเดียวหรือแข่งกับเพื่อนได้สูงสุด 6 คน",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="th"><body>{children}</body></html>;
}
