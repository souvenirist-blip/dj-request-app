"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { db } from "../../src/lib/firebase";
// import ShareButtons from "../../src/components/ShareButtons";
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  orderBy as firestoreOrderBy,
} from "firebase/firestore";
import { Track, TrackRequest } from "../../src/types";
import { trackPageView } from "../../src/lib/analytics-firebase";

interface TrackWithRequests extends Track {
  requests?: TrackRequest[];
}

export default function HistoryPage() {
  const [tracks, setTracks] = useState<TrackWithRequests[]>([]);
  const [expandedTrackIds, setExpandedTrackIds] = useState<Set<string>>(
    new Set()
  );
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    document.title = "History | Music Request";
    trackPageView("history");
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

    const q = query(
      collection(db, "tracks"),
      where("status", "==", "played")
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const data: TrackWithRequests[] = [];

      for (const docSnap of snapshot.docs) {
        const trackData = {
          id: docSnap.id,
          ...docSnap.data(),
        } as TrackWithRequests;

        // リクエスト詳細を取得
        const requestsRef = collection(db, "tracks", docSnap.id, "requests");
        const requestsQuery = query(requestsRef, firestoreOrderBy("requestedAt", "desc"));
        const requestsSnap = await getDocs(requestsQuery);

        const requests: TrackRequest[] = [];
        requestsSnap.forEach((reqDoc) => {
          requests.push({ id: reqDoc.id, ...reqDoc.data() } as TrackRequest);
        });

        trackData.requests = requests;
        data.push(trackData);
      }

      // クライアント側でplayedAtでソート（新しい順）
      data.sort((a, b) => {
        const aTime = a.playedAt?.toDate?.()?.getTime() || 0;
        const bTime = b.playedAt?.toDate?.()?.getTime() || 0;
        return bTime - aTime;
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

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto min-h-screen">
      {/* ヘッダー */}
      <div className="text-center pt-8 pb-8">
        <h1 className="text-4xl sm:text-5xl font-extralight tracking-widest text-white mb-2">
          Music Request
        </h1>
        <div className="text-slate-500 text-sm mb-4 tracking-widest uppercase">
          History
        </div>
        <div className="text-slate-600 text-xs mb-6 tracking-wide">
          {tracks.length > 0 ? `${tracks.length} played tracks` : "No tracks played yet"}
        </div>
        <div className="flex gap-4 justify-center text-sm flex-wrap">
          <Link
            href="/admin"
            className="text-slate-400 hover:text-purple-400 transition-colors tracking-wide"
          >
            Admin
          </Link>
          <span className="text-slate-700">|</span>
          <Link
            href="/requests"
            className="text-slate-400 hover:text-purple-400 transition-colors tracking-wide"
          >
            Requests
          </Link>
          <span className="text-slate-700">|</span>
          <Link
            href="/stats"
            className="text-slate-400 hover:text-purple-400 transition-colors tracking-wide"
          >
            Stats
          </Link>
        </div>
      </div>

      {/* 再生済み曲がない場合 */}
      {tracks.length === 0 && (
        <div className="glass rounded-lg p-12 text-center mb-6">
          <div className="text-slate-600 text-sm mb-8 tracking-wider">
            No tracks played yet
          </div>
          <Link
            href="/admin"
            className="inline-block gradient-primary px-8 py-3 rounded-lg text-white font-light tracking-wider
                     hover:opacity-90 active:scale-95 transition-all duration-200"
          >
            Back to Admin
          </Link>
        </div>
      )}

      {/* 再生済み曲一覧 */}
      <div className="space-y-3 mb-6">
        {tracks.map((track, index) => (
          <div
            key={track.id}
            className="glass rounded-lg overflow-hidden hover:glass-hover hover:border-purple-500 transition-all duration-200 animate-fade-in"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="p-6 flex items-center gap-5">
              {/* アルバムアートワーク */}
              <Image
                src={track.image || "/placeholder.png"}
                alt={track.title}
                width={80}
                height={80}
                className="w-20 h-20 rounded object-cover flex-shrink-0"
                unoptimized={!track.image}
              />

              {/* 曲情報 */}
              <div className="flex-grow min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs text-purple-400 tracking-wider">
                    PLAYED
                  </span>
                  <span className="text-xs text-slate-600 tracking-wider">
                    {track.totalRequests} {track.totalRequests === 1 ? 'request' : 'requests'}
                  </span>
                </div>
                <div className="font-light text-lg text-white truncate tracking-wide">
                  {track.title}
                </div>
                <div className="text-slate-500 text-sm truncate tracking-wide mb-2">
                  {track.artist}
                </div>

                {/* 再生日時 */}
                {track.playedAt?.toDate?.() && (
                  <div className="text-xs text-slate-600 tracking-wide">
                    {new Date(track.playedAt.toDate()).toLocaleString("ja-JP", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                )}

                {/* リクエストした人 */}
                {track.requests && track.requests.length > 0 && (
                  <div className="text-xs text-slate-600 mt-1 tracking-wide">
                    {track.requests.length <= 3
                      ? track.requests.map((r) => r.nickname).join(", ")
                      : `${track.requests
                          .slice(0, 3)
                          .map((r) => r.nickname)
                          .join(", ")} +${track.requests.length - 3}`}
                  </div>
                )}

                {/* メッセージ表示ボタン */}
                {track.requests && track.requests.some((r) => r.message) && (
                  <button
                    onClick={() => toggleExpand(track.id)}
                    className="mt-3 text-xs text-slate-500 hover:text-purple-400 transition-colors tracking-wide"
                  >
                    {expandedTrackIds.has(track.id)
                      ? "Hide messages"
                      : "View messages"}
                  </button>
                )}
              </div>
            </div>

            {/* メッセージ詳細 */}
            {expandedTrackIds.has(track.id) &&
              track.requests &&
              track.requests.some((r) => r.message) && (
                <div className="border-t border-slate-800 bg-black/50 p-5 space-y-3">
                  {track.requests
                    .filter((r) => r.message)
                    .map((request, idx) => (
                      <div
                        key={idx}
                        className="glass rounded-lg p-4 text-sm"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-white font-light text-xs">
                            {request.nickname.charAt(0).toUpperCase()}
                          </div>
                          <div className="font-light text-white text-xs tracking-wider">
                            {request.nickname}
                          </div>
                        </div>
                        <div className="text-slate-400 pl-9 tracking-wide">
                          {request.message}
                        </div>
                      </div>
                    ))}
                </div>
              )}
          </div>
        ))}
      </div>

      {/* シェアセクション */}
      {/* <div className="glass rounded-lg p-5 mb-6">
        <ShareButtons />
      </div> */}
    </div>
  );
}
