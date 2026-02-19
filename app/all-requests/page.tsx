"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { db } from "../../src/lib/firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  getDocs,
} from "firebase/firestore";
import { Track, TrackRequest } from "../../src/types";

interface TrackWithRequests extends Track {
  requests?: TrackRequest[];
}

export default function AllRequestsPage() {
  const [tracks, setTracks] = useState<TrackWithRequests[]>([]);
  const [expandedTrackIds, setExpandedTrackIds] = useState<Set<string>>(
    new Set()
  );
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    document.title = "All Requests | Music Request";
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

  useEffect(() => {
    if (!isAuthenticated) return;

    const q = query(collection(db, "tracks"));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const data: TrackWithRequests[] = [];

      for (const docSnap of snapshot.docs) {
        const trackData = {
          id: docSnap.id,
          ...docSnap.data(),
        } as TrackWithRequests;

        // 削除済みをスキップ
        if (trackData.deletedAt) continue;

        // リクエスト詳細を取得
        const requestsRef = collection(db, "tracks", docSnap.id, "requests");
        const requestsQuery = query(requestsRef, orderBy("requestedAt", "desc"));
        const requestsSnap = await getDocs(requestsQuery);

        const requests: TrackRequest[] = [];
        requestsSnap.forEach((reqDoc) => {
          const req = { id: reqDoc.id, ...reqDoc.data() } as TrackRequest;
          // 削除済みを除外
          if (!req.deletedAt) {
            requests.push(req);
          }
        });

        trackData.requests = requests;
        data.push(trackData);
      }

      // 最新のリクエスト時間でソート（新しい順）
      data.sort((a, b) => {
        // 各トラックの最新のリクエスト時間を取得
        const aLatestTime = a.requests && a.requests.length > 0
          ? Math.max(...a.requests.map(r => r.requestedAt?.toDate?.()?.getTime() || 0))
          : 0;
        const bLatestTime = b.requests && b.requests.length > 0
          ? Math.max(...b.requests.map(r => r.requestedAt?.toDate?.()?.getTime() || 0))
          : 0;
        return bLatestTime - aLatestTime;
      });

      setTracks(data);
    });

    return () => unsubscribe();
  }, [isAuthenticated]);

  const toggleExpand = (trackId: string) => {
    setExpandedTrackIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(trackId)) {
        newSet.delete(trackId);
      } else {
        newSet.add(trackId);
      }
      return newSet;
    });
  };

  // 認証チェック中またはリダイレクト中は何も表示しない
  if (isChecking || !isAuthenticated) {
    return null;
  }

  const pendingTracks = tracks.filter((t) => t.status === "pending");
  const playedTracks = tracks.filter((t) => t.status === "played");

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto min-h-screen">
      {/* ヘッダー */}
      <div className="text-center pt-8 pb-8">
        <h1 className="text-4xl sm:text-5xl font-extralight tracking-widest text-white mb-2">
          Music Request
        </h1>
        <div className="text-slate-500 text-sm mb-4 tracking-widest uppercase">
          All Requests
        </div>
        <div className="text-slate-600 text-xs mb-6 tracking-wide">
          {tracks.length > 0 ? `${tracks.length}曲 (未再生: ${pendingTracks.length}, 再生済み: ${playedTracks.length})` : "リクエストがありません"}
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
        </div>
      </div>

      {/* リクエストがない場合 */}
      {tracks.length === 0 && (
        <div className="glass rounded-lg p-12 text-center mb-6">
          <div className="text-slate-600 text-sm mb-8 tracking-wider">
            リクエストがありません
          </div>
          <Link
            href="/admin"
            className="inline-block gradient-primary px-8 py-3 rounded-lg text-white font-light tracking-wider
                     hover:opacity-90 active:scale-95 transition-all duration-200"
          >
            Dashboardに戻る
          </Link>
        </div>
      )}

      {/* リクエスト一覧 */}
      <div className="space-y-3 mb-6">
        {tracks.map((track, index) => (
          <div
            key={track.id}
            className="glass rounded-lg overflow-hidden hover:glass-hover hover:border-purple-500 transition-all duration-200 animate-fade-in"
            style={{ animationDelay: `${index * 30}ms` }}
          >
            <div className="p-5 sm:p-6 flex items-center gap-4 sm:gap-5">
              {/* アルバムアートワーク */}
              <Image
                src={track.image || "/placeholder.png"}
                alt={track.title}
                width={64}
                height={64}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded object-cover flex-shrink-0"
                unoptimized={!track.image}
              />

              {/* 曲情報 */}
              <div className="flex-grow min-w-0">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <span className="text-xs text-purple-400 tracking-wider">
                    {track.totalRequests} リクエスト
                  </span>
                  {track.status === "played" ? (
                    <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-400 rounded tracking-wider">
                      再生済み
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-1 bg-slate-700/50 text-slate-400 rounded tracking-wider">
                      未再生
                    </span>
                  )}
                </div>
                <div className="font-light text-base sm:text-lg text-white truncate tracking-wide">
                  {track.title}
                </div>
                <div className="text-slate-500 text-sm truncate tracking-wide mb-2">
                  {track.artist}
                </div>

                {/* 最新リクエスト時刻 */}
                {track.requests && track.requests.length > 0 && track.requests[0].requestedAt?.toDate?.() && (
                  <div className="text-slate-600 text-xs tracking-wide mb-2">
                    最新: {new Date(track.requests[0].requestedAt.toDate()).toLocaleString("ja-JP", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                )}

                {/* リクエストした人 */}
                {track.requests && track.requests.length > 0 && (
                  <div className="text-xs text-slate-600 tracking-wide">
                    {track.requests.length <= 3
                      ? track.requests.map((r) => r.nickname).join(", ")
                      : `${track.requests
                          .slice(0, 3)
                          .map((r) => r.nickname)
                          .join(", ")} 他${track.requests.length - 3}人`}
                  </div>
                )}

                {/* メッセージ表示ボタン */}
                {track.requests && track.requests.some((r) => r.message) && (
                  <button
                    onClick={() => toggleExpand(track.id)}
                    className="mt-3 text-xs text-slate-500 hover:text-purple-400 transition-colors tracking-wide"
                  >
                    {expandedTrackIds.has(track.id)
                      ? "メッセージを隠す ▲"
                      : "メッセージを表示 ▼"}
                  </button>
                )}
              </div>
            </div>

            {/* メッセージ詳細 */}
            {expandedTrackIds.has(track.id) &&
              track.requests &&
              track.requests.some((r) => r.message) && (
                <div className="border-t border-slate-800 bg-black/50 p-4 sm:p-5 space-y-3">
                  {track.requests
                    .filter((r) => r.message)
                    .map((request, idx) => (
                      <div
                        key={idx}
                        className="glass rounded-lg p-3 sm:p-4 text-sm"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-7 h-7 rounded-full bg-purple-500 flex items-center justify-center text-white font-light text-xs">
                            {request.nickname.charAt(0).toUpperCase()}
                          </div>
                          <div className="font-light text-white text-sm tracking-wider">
                            {request.nickname}
                          </div>
                          <div className="text-xs text-slate-600 tracking-wide">
                            {request.requestedAt?.toDate?.()
                              ? new Date(
                                  request.requestedAt.toDate()
                                ).toLocaleString("ja-JP", {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : ""}
                          </div>
                        </div>
                        <div className="text-slate-400 pl-10 tracking-wide break-words">
                          {request.message}
                        </div>
                      </div>
                    ))}
                </div>
              )}
          </div>
        ))}
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
