"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { db } from "../../src/lib/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  getDocs,
  getDoc,
  deleteDoc,
  increment,
} from "firebase/firestore";
import { Track, TrackRequest } from "../../src/types";
import {
  trackAdminLogin,
  trackMarkAsPlayed,
  trackDeleteRequest,
  trackTabChange,
} from "../../src/lib/analytics";
import { trackPageView } from "../../src/lib/analytics-firebase";

interface TrackWithRequests extends Track {
  requests?: TrackRequest[];
}

type TabType = "pending" | "played" | "analytics";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<TabType>("pending");
  const [pendingTracks, setPendingTracks] = useState<TrackWithRequests[]>([]);
  const [playedTracks, setPlayedTracks] = useState<TrackWithRequests[]>([]);
  const [collapsedTrackIds, setCollapsedTrackIds] = useState<Set<string>>(
    new Set()
  );
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [analyticsData, setAnalyticsData] = useState({
    totalPageViews: 0,
    uniqueSessions: 0,
    requestSubmissions: 0,
    pageBreakdown: {} as Record<string, number>,
  });

  useEffect(() => {
    document.title = "Admin | Music Request";
    trackPageView("admin");
  }, []);

  // 認証状態をチェック
  useEffect(() => {
    const auth = sessionStorage.getItem("admin_authenticated");
    if (auth === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  // 🔑 ログイン処理
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const correctPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;

    if (password === correctPassword) {
      setIsAuthenticated(true);
      sessionStorage.setItem("admin_authenticated", "true");
      setError("");
      // GA: 管理画面ログイン
      trackAdminLogin();
    } else {
      setError("パスワードが間違っています");
      setPassword("");
    }
  };

  // 🚪 ログアウト処理
  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem("admin_authenticated");
  };

  // 📋 リクエスト中の曲を取得
  useEffect(() => {
    if (!isAuthenticated) return;
    const q = query(
      collection(db, "tracks"),
      where("status", "==", "pending"),
      orderBy("totalRequests", "desc")
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const data: TrackWithRequests[] = [];

      for (const docSnap of snapshot.docs) {
        const trackData = { id: docSnap.id, ...docSnap.data() } as TrackWithRequests;

        // リクエスト詳細を取得
        const requestsRef = collection(db, "tracks", docSnap.id, "requests");
        const requestsQuery = query(requestsRef, orderBy("requestedAt", "desc"));
        const requestsSnap = await getDocs(requestsQuery);

        const requests: TrackRequest[] = [];
        requestsSnap.forEach((reqDoc) => {
          requests.push({ id: reqDoc.id, ...reqDoc.data() } as TrackRequest);
        });

        trackData.requests = requests;
        data.push(trackData);
      }

      setPendingTracks(data);
    });

    return () => unsubscribe();
  }, [isAuthenticated]);

  // ✅ 再生済みの曲を取得
  useEffect(() => {
    if (!isAuthenticated) return;
    const q = query(
      collection(db, "tracks"),
      where("status", "==", "played")
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const data: TrackWithRequests[] = [];

      for (const docSnap of snapshot.docs) {
        const trackData = { id: docSnap.id, ...docSnap.data() } as TrackWithRequests;

        // リクエスト詳細を取得
        const requestsRef = collection(db, "tracks", docSnap.id, "requests");
        const requestsQuery = query(requestsRef, orderBy("requestedAt", "desc"));
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

      setPlayedTracks(data);
    });

    return () => unsubscribe();
  }, [isAuthenticated]);

  // 📊 アナリティクスデータを取得
  useEffect(() => {
    if (!isAuthenticated) return;

    const analyticsQuery = query(collection(db, "analytics"));

    const unsubscribe = onSnapshot(analyticsQuery, (snapshot) => {
      let totalPageViews = 0;
      let requestSubmissions = 0;
      const uniqueSessions = new Set<string>();
      const pageBreakdown: Record<string, number> = {};

      snapshot.forEach((doc) => {
        const data = doc.data();

        if (data.sessionId) {
          uniqueSessions.add(data.sessionId);
        }

        if (data.type === "page_view") {
          totalPageViews++;
          const page = data.page || "unknown";
          pageBreakdown[page] = (pageBreakdown[page] || 0) + 1;
        } else if (data.type === "request_submission") {
          requestSubmissions++;
        }
      });

      setAnalyticsData({
        totalPageViews,
        uniqueSessions: uniqueSessions.size,
        requestSubmissions,
        pageBreakdown,
      });
    });

    return () => unsubscribe();
  }, [isAuthenticated]);

  const markAsPlayed = async (id: string, title: string) => {
    try {
      const trackRef = doc(db, "tracks", id);
      const { serverTimestamp } = await import("firebase/firestore");
      await updateDoc(trackRef, {
        status: "played",
        playedAt: serverTimestamp(),
      });
      // GA: 再生済みマーク
      trackMarkAsPlayed(title);
    } catch (error) {
      console.error("再生済み更新エラー:", error);
    }
  };

  // 📋 リクエスト表示の切り替え
  const toggleRequests = (trackId: string) => {
    setCollapsedTrackIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(trackId)) {
        newSet.delete(trackId);
      } else {
        newSet.add(trackId);
      }
      return newSet;
    });
  };

  // 🗑️ リクエストを削除
  const deleteRequestHandler = async (trackId: string, requestId: string, trackTitle: string) => {
    if (!confirm("このリクエストを削除しますか？")) {
      return;
    }

    try {
      const requestRef = doc(db, "tracks", trackId, "requests", requestId);
      await deleteDoc(requestRef);

      // GA: リクエスト削除
      trackDeleteRequest(trackTitle);

      const trackRef = doc(db, "tracks", trackId);
      const trackSnap = await getDoc(trackRef);

      if (trackSnap.exists()) {
        const currentRequests = trackSnap.data().totalRequests || 0;

        // リクエストが1件だけの場合は曲ごと削除
        if (currentRequests <= 1) {
          await deleteDoc(trackRef);
        } else {
          // totalRequestsを減らす
          await updateDoc(trackRef, {
            totalRequests: increment(-1),
          });
        }
      }
    } catch (error) {
      console.error("リクエスト削除エラー:", error);
    }
  };

  // 未認証の場合はログインフォームを表示
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="glass rounded-lg p-10 w-full max-w-md">
          <h1 className="text-3xl font-extralight tracking-widest mb-2 text-center text-white">
            Admin
          </h1>
          <p className="text-slate-600 text-xs text-center mb-8 tracking-wide">Enter password to login</p>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-xs font-normal text-slate-500 tracking-wider uppercase mb-3">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full glass p-4 rounded-lg placeholder:text-slate-600
                         focus:outline-none focus:border-purple-500 focus:glass-hover
                         transition-all duration-200 text-white tracking-wide"
                placeholder="Enter password"
                autoFocus
              />
            </div>

            {error && (
              <div className="glass border border-purple-500 text-purple-400 p-4 rounded-lg text-sm tracking-wide">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full gradient-primary py-4 rounded-lg text-white font-light tracking-widest
                       hover:opacity-90 active:scale-95 transition-all duration-200"
            >
              LOGIN
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 認証済みの場合は管理画面を表示
  const tracks = activeTab === "pending" ? pendingTracks : playedTracks;

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto min-h-screen">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 pt-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extralight tracking-widest text-white">
            Admin
          </h1>
        </div>
        <button
          onClick={handleLogout}
          className="glass px-6 py-2.5 rounded-lg text-sm font-light tracking-wider hover:glass-hover hover:text-white
                   transition-all duration-200 touch-manipulation text-slate-400"
        >
          Logout
        </button>
      </div>

      {/* タブ切り替え */}
      <div className="flex gap-3 mb-8 overflow-x-auto pb-2">
        <button
          onClick={() => {
            setActiveTab("pending");
            trackTabChange("pending");
          }}
          className={`flex-1 sm:flex-none px-6 py-3 rounded-lg font-light tracking-wider transition-all duration-200 touch-manipulation whitespace-nowrap ${
            activeTab === "pending"
              ? "gradient-primary text-white"
              : "glass hover:glass-hover text-slate-400 hover:text-white"
          }`}
        >
          Pending ({pendingTracks.length})
        </button>
        <button
          onClick={() => {
            setActiveTab("played");
            trackTabChange("played");
          }}
          className={`flex-1 sm:flex-none px-6 py-3 rounded-lg font-light tracking-wider transition-all duration-200 touch-manipulation whitespace-nowrap ${
            activeTab === "played"
              ? "gradient-primary text-white"
              : "glass hover:glass-hover text-slate-400 hover:text-white"
          }`}
        >
          Played ({playedTracks.length})
        </button>
        <button
          onClick={() => {
            setActiveTab("analytics");
            trackTabChange("analytics");
          }}
          className={`flex-1 sm:flex-none px-6 py-3 rounded-lg font-light tracking-wider transition-all duration-200 touch-manipulation whitespace-nowrap ${
            activeTab === "analytics"
              ? "gradient-primary text-white"
              : "glass hover:glass-hover text-slate-400 hover:text-white"
          }`}
        >
          Analytics
        </button>
      </div>

      {/* Analytics タブ */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          {/* サマリーカード */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="glass rounded-lg p-6 text-center">
              <div className="text-3xl font-extralight text-white mb-2">
                {analyticsData.totalPageViews}
              </div>
              <div className="text-xs text-slate-500 tracking-widest uppercase">
                Page Views
              </div>
            </div>

            <div className="glass rounded-lg p-6 text-center">
              <div className="text-3xl font-extralight text-purple-400 mb-2">
                {analyticsData.uniqueSessions}
              </div>
              <div className="text-xs text-slate-500 tracking-widest uppercase">
                Sessions
              </div>
            </div>

            <div className="glass rounded-lg p-6 text-center">
              <div className="text-3xl font-extralight text-purple-400 mb-2">
                {analyticsData.requestSubmissions}
              </div>
              <div className="text-xs text-slate-500 tracking-widest uppercase">
                Requests
              </div>
            </div>

            <div className="glass rounded-lg p-6 text-center">
              <div className="text-3xl font-extralight text-purple-400 mb-2">
                {analyticsData.totalPageViews > 0
                  ? ((analyticsData.requestSubmissions / analyticsData.totalPageViews) * 100).toFixed(1)
                  : "0"}%
              </div>
              <div className="text-xs text-slate-500 tracking-widest uppercase">
                Conversion
              </div>
            </div>
          </div>

          {/* ページ別内訳 */}
          <div className="glass rounded-lg p-6">
            <h2 className="text-sm font-light text-slate-500 mb-6 tracking-widest uppercase">
              Page Breakdown
            </h2>
            {Object.keys(analyticsData.pageBreakdown).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(analyticsData.pageBreakdown)
                  .sort(([, a], [, b]) => b - a)
                  .map(([page, count]) => (
                    <div
                      key={page}
                      className="flex items-center justify-between p-4 rounded-lg glass"
                    >
                      <div className="font-light text-white tracking-wide capitalize">
                        {page}
                      </div>
                      <div className="text-purple-400 font-light tracking-wide">
                        {count}
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center text-slate-600 py-8">
                <div className="text-sm tracking-wide">No data yet</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tracks タブ */}
      {(activeTab === "pending" || activeTab === "played") && tracks.length === 0 && (
        <div className="glass rounded-lg p-12 text-center">
          <div className="text-slate-600 text-sm tracking-wide">
            {activeTab === "pending"
              ? "No requests yet"
              : "No played tracks yet"}
          </div>
        </div>
      )}

      {(activeTab === "pending" || activeTab === "played") && tracks.map((track) => (
        <div
          key={track.id}
          className="glass rounded-lg mb-3 overflow-hidden hover:glass-hover hover:border-purple-500 transition-all duration-200"
        >
          {/* メイン情報 */}
          <div className="p-6 flex items-center gap-5">
            {/* アートワーク */}
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
              <div className="font-light text-lg truncate text-white tracking-wide">{track.title}</div>
              <div className="text-slate-500 text-sm truncate tracking-wide">
                {track.artist}
              </div>
              <button
                onClick={() => toggleRequests(track.id)}
                className="inline-flex items-center gap-2 mt-3 text-xs text-purple-400 hover:text-purple-300
                         transition-colors tracking-wider"
              >
                <span className="hidden sm:inline">{track.totalRequests} {track.totalRequests === 1 ? 'request' : 'requests'}</span>
                <span className="sm:hidden">{track.totalRequests}</span>
                <span>{collapsedTrackIds.has(track.id) ? "▶" : "▼"}</span>
              </button>
              {/* 再生日時 */}
              {activeTab === "played" && track.playedAt?.toDate?.() && (
                <div className="text-purple-400 text-xs mt-2 tracking-wide">
                  Played {new Date(track.playedAt.toDate()).toLocaleString("ja-JP", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              )}
            </div>

            {/* ボタン */}
            {activeTab === "pending" && (
              <button
                onClick={() => markAsPlayed(track.id, track.title)}
                className="gradient-primary px-5 py-3 rounded-lg text-white text-sm font-light tracking-wider
                         hover:opacity-90 active:scale-95
                         transition-all duration-200 flex-shrink-0 touch-manipulation"
              >
                Mark Played
              </button>
            )}
          </div>

          {/* リクエスト詳細 */}
          {!collapsedTrackIds.has(track.id) && (
            <div className="border-t border-slate-800 bg-black/50 p-6">
              {track.requests && track.requests.length > 0 ? (
                <div className="space-y-3">
                  <div className="text-xs font-light text-slate-500 uppercase tracking-widest mb-4">
                    Requests ({track.requests.length})
                  </div>
                  {track.requests.map((request, index) => (
                    <div
                      key={index}
                      className="glass rounded-lg p-4 hover:glass-hover transition-all duration-200"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-grow min-w-0">
                          {/* ニックネーム */}
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white font-light text-sm">
                              {request.nickname.charAt(0).toUpperCase()}
                            </div>
                            <div className="font-light text-white tracking-wide">
                              {request.nickname}
                            </div>
                          </div>

                          {/* メッセージ */}
                          {request.message && (
                            <div className="text-sm text-slate-400 mt-2 pl-11 break-words glass rounded-lg p-3 tracking-wide">
                              {request.message}
                            </div>
                          )}

                          {/* 時刻 */}
                          <div className="text-xs text-slate-600 mt-2 pl-11 tracking-wide">
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

                        {/* 削除ボタン */}
                        <button
                          onClick={() => deleteRequestHandler(track.id, request.id!, track.title)}
                          className="px-3 py-1.5 glass hover:glass-hover text-slate-500 hover:text-purple-400
                                   text-xs rounded-lg transition-all flex-shrink-0 touch-manipulation tracking-wide"
                          title="Delete"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-slate-600 py-8">
                  <div className="text-sm tracking-wide">No requests</div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

