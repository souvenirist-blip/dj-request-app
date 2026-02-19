"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
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

interface TrackWithRequests extends Track {
  requests?: TrackRequest[];
}

type TabType = "pending" | "played";

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
  const pathname = usePathname();

  useEffect(() => {
    document.title = "Dashboard | Music Request";
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
      where("status", "==", "pending")
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const data: TrackWithRequests[] = [];

      for (const docSnap of snapshot.docs) {
        const trackData = { id: docSnap.id, ...docSnap.data() } as TrackWithRequests;

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
        const aLatestTime = a.requests && a.requests.length > 0
          ? Math.max(...a.requests.map(r => r.requestedAt?.toDate?.()?.getTime() || 0))
          : 0;
        const bLatestTime = b.requests && b.requests.length > 0
          ? Math.max(...b.requests.map(r => r.requestedAt?.toDate?.()?.getTime() || 0))
          : 0;
        return bLatestTime - aLatestTime;
      });

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
        const aLatestTime = a.requests && a.requests.length > 0
          ? Math.max(...a.requests.map(r => r.requestedAt?.toDate?.()?.getTime() || 0))
          : 0;
        const bLatestTime = b.requests && b.requests.length > 0
          ? Math.max(...b.requests.map(r => r.requestedAt?.toDate?.()?.getTime() || 0))
          : 0;
        return bLatestTime - aLatestTime;
      });

      setPlayedTracks(data);
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

  // 🗑️ リクエストを削除（論理削除）
  const deleteRequestHandler = async (trackId: string, requestId: string, trackTitle: string) => {
    if (!confirm("このリクエストを削除しますか？")) {
      return;
    }

    try {
      const { serverTimestamp } = await import("firebase/firestore");
      const requestRef = doc(db, "tracks", trackId, "requests", requestId);

      // 物理削除の代わりに論理削除
      await updateDoc(requestRef, {
        deletedAt: serverTimestamp(),
        deletedBy: "admin",
      });

      // GA: リクエスト削除
      trackDeleteRequest(trackTitle);

      const trackRef = doc(db, "tracks", trackId);
      const trackSnap = await getDoc(trackRef);

      if (trackSnap.exists()) {
        // requestsサブコレクションから削除されていないものをカウント
        const requestsRef = collection(db, "tracks", trackId, "requests");
        const allRequestsSnap = await getDocs(requestsRef);
        let activeCount = 0;
        allRequestsSnap.forEach((doc) => {
          const data = doc.data();
          if (!data.deletedAt) {
            activeCount++;
          }
        });

        // アクティブなリクエストが0件の場合は曲自体を論理削除
        if (activeCount === 0) {
          await updateDoc(trackRef, {
            deletedAt: serverTimestamp(),
            deletedBy: "admin",
          });
        } else {
          // totalRequestsを更新
          await updateDoc(trackRef, {
            totalRequests: activeCount,
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
            Dashboard
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
      <div className="text-center pt-8 pb-8">
        <div className="flex justify-end mb-4">
          <button
            onClick={handleLogout}
            className="glass px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-light tracking-wider hover:glass-hover hover:text-white
                     transition-all duration-200 touch-manipulation text-slate-400"
          >
            Logout
          </button>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extralight tracking-widest text-white mb-2">
          Music Request
        </h1>
        <div className="text-slate-500 text-sm mb-4 tracking-widest uppercase">
          Dashboard
        </div>
        <div className="text-slate-600 text-xs mb-6 tracking-wide">
          リクエスト管理
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

      {/* タブ切り替え */}
      <div className="flex gap-2 sm:gap-3 mb-8 overflow-x-auto pb-2 justify-center">
        <button
          onClick={() => {
            setActiveTab("pending");
            trackTabChange("pending");
          }}
          className={`flex-1 sm:flex-none px-3 sm:px-6 py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm font-light tracking-wider transition-all duration-200 touch-manipulation whitespace-nowrap ${
            activeTab === "pending"
              ? "gradient-primary text-white"
              : "glass hover:glass-hover text-slate-400 hover:text-white"
          }`}
        >
          <span className="hidden sm:inline">Pending ({pendingTracks.length})</span>
          <span className="sm:hidden">Pending</span>
          <span className="sm:hidden block text-xs mt-0.5">{pendingTracks.length}</span>
        </button>
        <button
          onClick={() => {
            setActiveTab("played");
            trackTabChange("played");
          }}
          className={`flex-1 sm:flex-none px-3 sm:px-6 py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm font-light tracking-wider transition-all duration-200 touch-manipulation whitespace-nowrap ${
            activeTab === "played"
              ? "gradient-primary text-white"
              : "glass hover:glass-hover text-slate-400 hover:text-white"
          }`}
        >
          <span className="hidden sm:inline">Played ({playedTracks.length})</span>
          <span className="sm:hidden">Played</span>
          <span className="sm:hidden block text-xs mt-0.5">{playedTracks.length}</span>
        </button>
      </div>

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
          <div className="p-4 sm:p-6 flex items-center gap-3 sm:gap-5">
            {/* アートワーク */}
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
              <div className="font-light text-base sm:text-lg truncate text-white tracking-wide">{track.title}</div>
              <div className="text-slate-500 text-xs sm:text-sm truncate tracking-wide">
                {track.artist}
              </div>
              <button
                onClick={() => toggleRequests(track.id)}
                className="inline-flex items-center gap-2 mt-2 sm:mt-3 text-xs text-purple-400 hover:text-purple-300
                         transition-colors tracking-wider"
              >
                <span className="hidden sm:inline">{track.totalRequests} {track.totalRequests === 1 ? 'request' : 'requests'}</span>
                <span className="sm:hidden">{track.totalRequests}</span>
                <span>{collapsedTrackIds.has(track.id) ? "▶" : "▼"}</span>
              </button>
              {/* 最新リクエスト時刻 */}
              {track.requests && track.requests.length > 0 && track.requests[0].requestedAt?.toDate?.() && (
                <div className="text-slate-600 text-xs mt-1 sm:mt-2 tracking-wide">
                  最新: {new Date(track.requests[0].requestedAt.toDate()).toLocaleString("ja-JP", {
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
                className="gradient-primary px-3 sm:px-5 py-2 sm:py-3 rounded-lg text-white text-xs sm:text-sm font-light tracking-wider
                         hover:opacity-90 active:scale-95
                         transition-all duration-200 flex-shrink-0 touch-manipulation whitespace-nowrap"
              >
                <span className="hidden sm:inline">Mark Played</span>
                <span className="sm:hidden">✓</span>
              </button>
            )}
          </div>

          {/* リクエスト詳細 */}
          {!collapsedTrackIds.has(track.id) && (
            <div className="border-t border-slate-800 bg-black/50 p-4 sm:p-6">
              {track.requests && track.requests.length > 0 ? (
                <div className="space-y-2 sm:space-y-3">
                  <div className="text-xs font-light text-slate-500 uppercase tracking-widest mb-3 sm:mb-4">
                    Requests ({track.requests.length})
                  </div>
                  {track.requests.map((request, index) => (
                    <div
                      key={index}
                      className="glass rounded-lg p-3 sm:p-4 hover:glass-hover transition-all duration-200"
                    >
                      <div className="flex items-start justify-between gap-2 sm:gap-3">
                        <div className="flex-grow min-w-0">
                          {/* ニックネーム */}
                          <div className="flex items-center gap-2 sm:gap-3 mb-2">
                            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-purple-500 flex items-center justify-center text-white font-light text-xs sm:text-sm flex-shrink-0">
                              {request.nickname.charAt(0).toUpperCase()}
                            </div>
                            <div className="font-light text-white tracking-wide text-sm sm:text-base truncate">
                              {request.nickname}
                            </div>
                          </div>

                          {/* メッセージ */}
                          {request.message && (
                            <div className="text-xs sm:text-sm text-slate-400 mt-2 pl-8 sm:pl-11 break-words glass rounded-lg p-2 sm:p-3 tracking-wide">
                              {request.message}
                            </div>
                          )}

                          {/* 時刻 */}
                          <div className="text-xs text-slate-600 mt-2 pl-8 sm:pl-11 tracking-wide">
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
                          className="px-2 sm:px-3 py-1.5 glass hover:glass-hover text-slate-500 hover:text-purple-400
                                   text-xs rounded-lg transition-all flex-shrink-0 touch-manipulation tracking-wide whitespace-nowrap"
                          title="Delete"
                        >
                          <span className="hidden sm:inline">Delete</span>
                          <span className="sm:hidden">✕</span>
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

