"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
const links = [
  ["/", "概要", "▦"],
  ["/entries", "作業記録", "▤"],
  ["/summary", "精算集計", "▥"],
  ["/rules", "規程設定", "⚙"],
  ["/sites", "現場マスタ", "⌖"],
];
export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <div className="app-shell">
      <aside className="sidebar no-print">
        <Link href="/" className="brand">
          <span className="brand-mark">日</span>
          <span>
            日当・手当<span className="brand-sub">交通費精算</span>
          </span>
        </Link>
        <div className="workspace">
          <span className="avatar">青</span>
          <div>
            青凪フィールドチーム<small>個人ワークスペース・デモ</small>
          </div>
        </div>
        <p className="nav-label">ワークスペース</p>
        <nav>
          {links.map(([href, label, icon]) => (
            <Link
              key={href}
              href={href}
              className={(href === "/" ? path === href : path.startsWith(href)) ? "active" : ""}
            >
              <span aria-hidden="true">{icon}</span>
              {label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="local-status">
            <i /> このブラウザに保存
          </div>
          <p>
            日々の作業を、
            <br />
            確かな精算に。
          </p>
          <Link href="/about">ⓘ このデモについて</Link>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar no-print">
          <span>日当・手当・交通費精算</span>
          <span className="demo-badge">DEMO WORKSPACE</span>
        </header>
        <main>{children}</main>
        <footer>デモ用の架空データです。給与計算ではありません。</footer>
      </div>
    </div>
  );
}
