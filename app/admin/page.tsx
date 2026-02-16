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

  // 🔐 認証状態をチェック
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

  // 🔐 未認証の場合はログインフォームを表示
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="glass rounded-2xl p-8 w-full max-w-md shadow-2xl">
          <h1 className="text-3xl font-bold mb-2 text-center bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
            🔐 管理画面
          </h1>
          <p className="text-slate-400 text-sm text-center mb-6">パスワードを入力してログイン</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-300">
                パスワード
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full glass p-4 rounded-xl placeholder:text-slate-400
                         focus:outline-none focus:ring-2 focus:ring-purple-500 focus:glass-hover
                         transition-all duration-200 text-white"
                placeholder="パスワードを入力"
                autoFocus
              />
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-4 rounded-xl text-sm backdrop-blur">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full gradient-primary py-4 rounded-xl text-white font-bold
                       hover:shadow-lg hover:shadow-purple-500/50 active:scale-95
                       transition-all duration-200"
            >
              ログイン
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ✅ 認証済みの場合は管理画面を表示
  const tracks = activeTab === "pending" ? pendingTracks : playedTracks;

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto min-h-screen">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 pt-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
            🎧 DJ管理画面
          </h1>
          <p className="text-slate-400 text-sm mt-1">リクエスト管理システム</p>
        </div>
        <button
          onClick={handleLogout}
          className="glass px-5 py-2.5 rounded-lg text-sm font-medium hover:glass-hover
                   transition-all duration-200 touch-manipulation"
        >
          ログアウト
        </button>
      </div>

      {/* タブ切り替え */}
      <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
        <button
          onClick={() => {
            setActiveTab("pending");
            trackTabChange("pending");
          }}
          className={`flex-1 sm:flex-none px-6 py-3 rounded-xl font-semibold transition-all duration-200 touch-manipulation whitespace-nowrap ${
            activeTab === "pending"
              ? "gradient-accent text-white shadow-lg shadow-cyan-500/50"
              : "glass hover:glass-hover text-slate-300"
          }`}
        >
          リクエスト中 ({pendingTracks.length})
        </button>
        <button
          onClick={() => {
            setActiveTab("played");
            trackTabChange("played");
          }}
          className={`flex-1 sm:flex-none px-6 py-3 rounded-xl font-semibold transition-all duration-200 touch-manipulation whitespace-nowrap ${
            activeTab === "played"
              ? "gradient-success text-white shadow-lg shadow-green-500/50"
              : "glass hover:glass-hover text-slate-300"
          }`}
        >
          再生済み ({playedTracks.length})
        </button>
      </div>

      {tracks.length === 0 && (
        <div className="glass rounded-xl p-12 text-center">
          <div className="text-4xl mb-3">🎵</div>
          <div className="text-slate-400">
            {activeTab === "pending"
              ? "リクエストはまだありません"
              : "再生済みの曲はまだありません"}
          </div>
        </div>
      )}

      {tracks.map((track) => (
        <div
          key={track.id}
          className="glass rounded-xl mb-4 overflow-hidden hover:glass-hover transition-all duration-200"
        >
          {/* メイン情報 */}
          <div className="p-5 flex items-center gap-5">
            {/* アートワーク */}
            <Image
              src={track.image || "/placeholder.png"}
              alt={track.title}
              width={80}
              height={80}
              className="w-20 h-20 rounded-lg object-cover flex-shrink-0 shadow-lg"
              unoptimized={!track.image}
            />

            {/* 曲情報 */}
            <div className="flex-grow min-w-0">
              <div className="font-bold text-lg truncate text-white">{track.title}</div>
              <div className="text-slate-400 text-sm truncate">
                {track.artist}
              </div>
              <button
                onClick={() => toggleRequests(track.id)}
                className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 rounded-lg
                         bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold
                         hover:shadow-lg hover:shadow-amber-500/50 transition-all duration-200"
              >
                <span className="hidden sm:inline">🔥 {track.totalRequests}件のリクエスト</span>
                <span className="sm:hidden">🔥 {track.totalRequests}件</span>
                <span className="text-xs">{collapsedTrackIds.has(track.id) ? "▶" : "▼"}</span>
              </button>
              {/* 再生日時 */}
              {activeTab === "played" && track.playedAt?.toDate?.() && (
                <div className="text-green-400 text-sm mt-1">
                  ✓ 再生済み:{" "}
                  {new Date(track.playedAt.toDate()).toLocaleString("ja-JP", {
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
                className="gradient-success px-4 sm:px-5 py-2.5 rounded-xl text-white text-sm sm:text-base font-bold
                         hover:shadow-lg hover:shadow-green-500/50 active:scale-95
                         transition-all duration-200 flex-shrink-0 touch-manipulation"
              >
                ✓ Played
              </button>
            )}
          </div>

          {/* リクエスト詳細 */}
          {!collapsedTrackIds.has(track.id) && (
            <div className="border-t border-slate-700/50 bg-slate-900/50 p-5">
              {track.requests && track.requests.length > 0 ? (
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
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
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm">
                              {request.nickname.charAt(0).toUpperCase()}
                            </div>
                            <div className="font-semibold text-white">
                              {request.nickname}
                            </div>
                          </div>

                          {/* メッセージ */}
                          {request.message && (
                            <div className="text-sm text-slate-300 mt-2 pl-10 break-words bg-slate-800/50 rounded-lg p-3">
                              💬 {request.message}
                            </div>
                          )}

                          {/* 時刻 */}
                          <div className="text-xs text-slate-500 mt-2 pl-10">
                            🕒 {request.requestedAt?.toDate?.()
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
                          className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300
                                   text-xs rounded-lg transition-all flex-shrink-0 touch-manipulation
                                   border border-red-500/30 hover:border-red-500/50"
                          title="削除"
                        >
                          ✕ Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-slate-400 py-8">
                  <div className="text-3xl mb-2">📭</div>
                  <div className="text-sm">リクエストがありません</div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

