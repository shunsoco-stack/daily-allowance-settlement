"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { restore, STORAGE_KEY, validateData } from "@/lib/storage";
import { japanNow } from "@/lib/dates";
import type { Data } from "@/lib/types";

type Store = { data: Data; today: string; update: (data: Data) => boolean; notice: string };
const Context = createContext<Store | null>(null);
export function Provider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ data: Data; today: string } | null>(null);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const now = new Date();
      try {
        const result = restore(localStorage.getItem(STORAGE_KEY), now);
        setState({ data: result.data, today: japanNow(now).date });
        if (result.recovered) setNotice("保存データが壊れていたため、既定データに戻しました。");
        localStorage.setItem(STORAGE_KEY, JSON.stringify(result.data));
      } catch {
        setState({ data: restore(null, now).data, today: japanNow(now).date });
        setNotice("ブラウザの保存領域を利用できません。変更は保存できません。");
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  function update(data: Data) {
    if (!validateData(data)) {
      setNotice("入力を確認してください。日付・時刻・規程・現場の整合性に問題があります。");
      return false;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setState((old) => (old ? { ...old, data } : null));
      setNotice("変更をこのブラウザに保存しました。");
      return true;
    } catch {
      setNotice("保存できませんでした。ブラウザの保存容量・設定を確認してください。");
      return false;
    }
  }
  if (!state) return <div className="loading">精算データを準備しています…</div>;
  return (
    <Context.Provider value={{ ...state, update, notice }}>
      {notice && (
        <div className="notice no-print" role="status">
          {notice}
          <button aria-label="通知を閉じる" onClick={() => setNotice("")}>
            ×
          </button>
        </div>
      )}
      {children}
    </Context.Provider>
  );
}
export function useData() {
  const value = useContext(Context);
  if (!value) throw new Error("データの初期化が必要です");
  return value;
}
