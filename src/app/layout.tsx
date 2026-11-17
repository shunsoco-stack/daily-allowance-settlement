import type { Metadata } from "next";
import { Provider } from "@/components/provider";
import { Shell } from "@/components/shell";
import "./globals.css";
export const metadata: Metadata = {
  title: "日当・手当・交通費精算",
  description:
    "現場の作業時間・移動・宿泊から、規程に沿った手当を自動計算。金額の根拠と締め日ごとの精算集計を確認できます。",
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <Shell>
          <Provider>{children}</Provider>
        </Shell>
      </body>
    </html>
  );
}
