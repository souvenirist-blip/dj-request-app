"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getTodayStats } from "../../src/lib/analytics-firebase";

export default function AnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState({
    totalPageViews: 0,
    requestSubmissions: 0,
    pageBreakdown: {} as Record<string, number>,
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    document.title = "Analytics | Music Request";
  }, []);

  // 認証状態をチェック
  useEffect(() => {
    const auth = sessionStorage.getItem("admin_authenticated");
    if (auth === "true") {
      setIsAuthenticated(true);
    } else {
      // 未認証の場合は管理画面にリダイレクト
      window.location.href = "/admin";
    }
    setIsChecking(false);
  }, []);

  // アナリティクスデータを取得
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchAnalytics = async () => {
      const stats = await getTodayStats();

      if (stats) {
        const pageBreakdown: Record<string, number> = {};

        // pageViewsオブジェクトからtotal以外の全てのページを取得
        if (stats.pageViews) {
          Object.entries(stats.pageViews).forEach(([key, value]) => {
            if (key !== "total" && typeof value === "number") {
              pageBreakdown[key] = value;
            }
          });
        }

        setAnalyticsData({
          totalPageViews: stats.pageViews?.total || 0,
          requestSubmissions: stats.requestSubmissions || 0,
          pageBreakdown,
        });
      }
    };

    fetchAnalytics();

    // 定期的に更新（30秒ごと）
    const interval = setInterval(fetchAnalytics, 30000);

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // 認証チェック中またはリダイレクト中は何も表示しない
  if (isChecking || !isAuthenticated) {
    return null;
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto min-h-screen">
      {/* ヘッダー */}
      <div className="text-center pt-8 pb-8">
        <h1 className="text-4xl sm:text-5xl font-extralight tracking-widest text-white mb-2">
          Music Request
        </h1>
        <div className="text-slate-500 text-sm mb-4 tracking-widest uppercase">
          Analytics
        </div>
        <div className="text-slate-600 text-xs mb-6 tracking-wide">
          アクセス解析
        </div>
        <div className="flex gap-4 justify-center text-sm flex-wrap">
          <Link
            href="/admin"
            className={pathname === "/admin" ? "text-purple-400 tracking-wide" : "text-slate-400 hover:text-purple-400 transition-colors tracking-wide"}
          >
            Dashboard
          </Link>
          <span className="text-slate-700">|</span>
          <Link
            href="/all-requests"
            className={pathname === "/all-requests" ? "text-purple-400 tracking-wide" : "text-slate-400 hover:text-purple-400 transition-colors tracking-wide"}
          >
            All Requests
          </Link>
          <span className="text-slate-700">|</span>
          <Link
            href="/stats"
            className={pathname === "/stats" ? "text-purple-400 tracking-wide" : "text-slate-400 hover:text-purple-400 transition-colors tracking-wide"}
          >
            Stats
          </Link>
          <span className="text-slate-700">|</span>
          <Link
            href="/analytics"
            className={pathname === "/analytics" ? "text-purple-400 tracking-wide" : "text-slate-400 hover:text-purple-400 transition-colors tracking-wide"}
          >
            Analytics
          </Link>
        </div>
      </div>

      {/* 今日のデータであることを明示 */}
      <div className="glass rounded-lg p-4 mb-6 text-center animate-fade-in">
        <div className="text-sm text-slate-500 tracking-widest uppercase">
          Today's Activity (Resets at 6:00 AM JST)
        </div>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
        <div className="glass rounded-lg p-5 sm:p-6 text-center animate-fade-in">
          <div className="text-2xl sm:text-3xl font-extralight text-white mb-2">
            {analyticsData.totalPageViews}
          </div>
          <div className="text-xs text-slate-500 tracking-widest uppercase">
            ページビュー
          </div>
        </div>

        <div className="glass rounded-lg p-5 sm:p-6 text-center animate-fade-in" style={{ animationDelay: "50ms" }}>
          <div className="text-2xl sm:text-3xl font-extralight text-purple-400 mb-2">
            {analyticsData.requestSubmissions}
          </div>
          <div className="text-xs text-slate-500 tracking-widest uppercase">
            リクエスト送信
          </div>
        </div>

        <div className="glass rounded-lg p-5 sm:p-6 text-center animate-fade-in" style={{ animationDelay: "100ms" }}>
          <div className="text-2xl sm:text-3xl font-extralight text-purple-400 mb-2">
            {analyticsData.totalPageViews > 0
              ? ((analyticsData.requestSubmissions / analyticsData.totalPageViews) * 100).toFixed(1)
              : "0"}%
          </div>
          <div className="text-xs text-slate-500 tracking-widest uppercase">
            コンバージョン率
          </div>
        </div>

        <div className="glass rounded-lg p-5 sm:p-6 text-center animate-fade-in" style={{ animationDelay: "150ms" }}>
          <div className="text-2xl sm:text-3xl font-extralight text-purple-400 mb-2">
            {Object.keys(analyticsData.pageBreakdown).length}
          </div>
          <div className="text-xs text-slate-500 tracking-widest uppercase">
            ユニークページ
          </div>
        </div>
      </div>

      {/* ページ別内訳 */}
      <div className="glass rounded-lg p-5 sm:p-6 mb-6 animate-fade-in" style={{ animationDelay: "200ms" }}>
        <h2 className="text-sm font-light text-slate-500 mb-5 sm:mb-6 tracking-widest uppercase">
          ページ別アクセス
        </h2>
        {Object.keys(analyticsData.pageBreakdown).length > 0 ? (
          <div className="space-y-2 sm:space-y-3">
            {Object.entries(analyticsData.pageBreakdown)
              .sort(([, a], [, b]) => b - a)
              .map(([page, count]) => (
                <div
                  key={page}
                  className="flex items-center justify-between p-3 sm:p-4 rounded-lg glass hover:glass-hover transition-all duration-200"
                >
                  <div className="font-light text-white tracking-wide capitalize text-sm sm:text-base">
                    {page}
                  </div>
                  <div className="text-purple-400 font-light tracking-wide text-sm sm:text-base">
                    {count}
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className="text-center text-slate-600 py-10">
            <div className="text-sm tracking-wide">データがありません</div>
          </div>
        )}
      </div>

      {/* ナビゲーション */}
      <div className="flex gap-3 justify-center pb-8 flex-wrap">
        <Link
          href="/admin"
          className="gradient-primary px-6 sm:px-8 py-3 rounded-lg text-white font-light tracking-wider
                   hover:opacity-90 active:scale-95 transition-all duration-200"
        >
          Dashboard
        </Link>
        <Link
          href="/all-requests"
          className="glass px-6 sm:px-8 py-3 rounded-lg text-slate-400 font-light tracking-wider
                   hover:glass-hover hover:text-white active:scale-95
                   transition-all duration-200"
        >
          All Requests
        </Link>
        <Link
          href="/stats"
          className="glass px-6 sm:px-8 py-3 rounded-lg text-slate-400 font-light tracking-wider
                   hover:glass-hover hover:text-white active:scale-95
                   transition-all duration-200"
        >
          Stats
        </Link>
      </div>
    </div>
  );
}
