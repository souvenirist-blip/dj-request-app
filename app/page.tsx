"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { db } from "../src/lib/firebase";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import { SpotifyTrack, SpotifySearchResponse, Toast } from "../src/types";
import ToastContainer from "../src/components/ToastContainer";
import {
  trackSearch,
  trackTrackSelect,
  trackRequestSubmit,
} from "../src/lib/analytics";

export default function Home() {
  const [nickname, setNickname] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SpotifyTrack[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<SpotifyTrack | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // 🎨 トースト通知を追加
  const addToast = (message: string, type: Toast["type"]) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  // 🗑️ トースト通知を削除
  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  // 🔍 リアルタイム検索（デバウンス付き）
  useEffect(() => {
  if (!searchQuery) {
    setResults([]);
    return;
  }

  const isJapanese = /[\u3040-\u30ff\u4e00-\u9faf]/.test(searchQuery);

  if (!isJapanese && searchQuery.length < 2) {
    setResults([]);
    return;
  }

  const timer = setTimeout(async () => {
    setSearching(true);
    try {
      const res = await fetch(
        `/api/spotify/search?q=${encodeURIComponent(searchQuery)}`
      );

      const data: SpotifySearchResponse = await res.json();

      if (!res.ok) {
        addToast(
          data.error?.message || "検索中にエラーが発生しました",
          "error"
        );
        setResults([]);
        return;
      }

      if (data.tracks?.items) {
        setResults(data.tracks.items);
        // GA: 検索イベント
        trackSearch(searchQuery, data.tracks.items.length);
        if (data.tracks.items.length === 0) {
          addToast("曲が見つかりませんでした", "info");
        }
      } else {
        setResults([]);
      }
    } catch (err) {
      console.error(err);
      addToast("ネットワークエラーが発生しました", "error");
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, 400);

  return () => clearTimeout(timer);
}, [searchQuery]);

  // 📤 送信処理
  const handleSubmit = async () => {
    if (!nickname || !selectedTrack) {
      addToast("ニックネームと曲選択は必須です", "error");
      return;
    }

    setLoading(true);

    try {
      const trackId = selectedTrack.id;
      const trackRef = doc(db, "tracks", trackId);

      // 🔍 重複チェック: 同じニックネームで既にリクエスト済みか確認
      const requestsRef = collection(trackRef, "requests");
      const { query: firestoreQuery, where, getDocs: getDocsFirestore } = await import("firebase/firestore");
      const duplicateQuery = firestoreQuery(requestsRef, where("nickname", "==", nickname));
      const duplicateSnap = await getDocsFirestore(duplicateQuery);

      if (!duplicateSnap.empty) {
        addToast("この曲は既にリクエスト済みです", "error");
        setLoading(false);
        return;
      }

      const trackSnap = await getDoc(trackRef);

      if (!trackSnap.exists()) {
        await setDoc(trackRef, {
          title: selectedTrack.name,
          artist: selectedTrack.artists[0].name,
          image: selectedTrack.album.images[0]?.url || "",
          totalRequests: 1,
          status: "pending",
          createdAt: serverTimestamp(),
        });
      } else {
        await updateDoc(trackRef, {
          totalRequests: increment(1),
        });
      }

      await addDoc(collection(trackRef, "requests"), {
        nickname,
        message,
        requestedAt: serverTimestamp(),
      });

      // GA: リクエスト送信イベント
      trackRequestSubmit(selectedTrack.name, selectedTrack.artists[0].name);

      addToast("リクエストを送信しました！", "success");

      setNickname("");
      setSearchQuery("");
      setSelectedTrack(null);
      setMessage("");
      setResults([]);
    } catch (error) {
      console.error(error);
      addToast("エラーが発生しました。もう一度お試しください", "error");
    }

    setLoading(false);
  };

  return (
    <>
      <ToastContainer toasts={toasts} onClose={removeToast} />
      <div className="flex flex-col p-4 sm:p-6 gap-5 sm:gap-6 max-w-md mx-auto min-h-screen animate-fade-in">
        {/* ヘッダー */}
        <div className="text-center pt-4 pb-2">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-purple-400 via-purple-300 to-cyan-400 bg-clip-text text-transparent mb-2">
            🎧 DJ リクエスト
          </h1>
          <p className="text-slate-400 text-sm">好きな曲をリクエストしよう</p>
        </div>

        {/* ニックネーム入力 */}
        <div className="space-y-2">
          <label htmlFor="nickname" className="block text-sm font-semibold text-slate-300 pl-1">
            Nickname
          </label>
          <input
            id="nickname"
            type="text"
            placeholder="Enter your nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="w-full glass p-4 rounded-xl placeholder:text-slate-400
                       focus:outline-none focus:ring-2 focus:ring-purple-500 focus:glass-hover
                       transition-all duration-200 text-white"
          />
        </div>

        {/* 🔍 検索欄 */}
        <div className="space-y-2">
          <label htmlFor="search" className="block text-sm font-semibold text-slate-300 pl-1">
            Search Song
          </label>
          <div className="relative">
            <input
              id="search"
              type="text"
              placeholder="🔍 Search for a song"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedTrack(null);
              }}
              className="w-full glass p-4 rounded-xl placeholder:text-slate-400
                         focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:glass-hover
                         transition-all duration-200 text-white"
            />
            {searching && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
        </div>

        {/* 🎵 検索結果一覧 */}
        {!selectedTrack && results.length > 0 && (
          <div className="flex flex-col gap-3 max-h-96 overflow-y-auto pr-2">
            {results.map((track) => (
              <div
                key={track.id}
                onClick={() => {
                  setSelectedTrack(track);
                  // GA: 曲選択イベント
                  trackTrackSelect(track.name, track.artists[0].name);
                }}
                className="flex items-center gap-4 p-4 rounded-xl glass cursor-pointer
                         hover:glass-hover hover:scale-[1.02] active:scale-98
                         transition-all duration-200 touch-manipulation group"
              >
                <Image
                  src={track.album.images[0]?.url || "/placeholder.png"}
                  alt={track.name}
                  width={64}
                  height={64}
                  className="w-16 h-16 rounded-lg object-cover shadow-lg group-hover:shadow-purple-500/50 transition-shadow"
                  unoptimized={!track.album.images[0]?.url}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white truncate">{track.name}</div>
                  <div className="text-sm text-slate-400 truncate">
                    {track.artists[0].name}
                  </div>
                </div>
            </div>
          ))}
        </div>
      )}

        {/* ✅ 選択済み表示 */}
        {selectedTrack && (
          <div className="gradient-primary rounded-xl p-1 animate-pulse-glow">
            <div className="flex items-center gap-4 p-4 rounded-lg bg-slate-900">
              <Image
                src={selectedTrack.album.images[0]?.url || "/placeholder.png"}
                alt={selectedTrack.name}
                width={64}
                height={64}
                className="w-16 h-16 rounded-lg object-cover shadow-xl"
                unoptimized={!selectedTrack.album.images[0]?.url}
              />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-white truncate text-lg">{selectedTrack.name}</div>
                <div className="text-sm text-purple-300 truncate">
                  {selectedTrack.artists[0].name}
                </div>
              </div>
              <div className="text-2xl">✓</div>
            </div>
          </div>
        )}

        {/* メッセージ入力 */}
        <div className="space-y-2">
          <label htmlFor="message" className="block text-sm font-semibold text-slate-300 pl-1">
            Message <span className="text-slate-500 font-normal">(Optional)</span>
          </label>
          <textarea
            id="message"
            placeholder="💬 Leave a message for the DJ"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="w-full glass p-4 rounded-xl placeholder:text-slate-400
                       focus:outline-none focus:ring-2 focus:ring-purple-500 focus:glass-hover
                       transition-all duration-200 text-white resize-none"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="gradient-primary py-4 rounded-xl text-white text-lg font-bold
                     hover:shadow-lg hover:shadow-purple-500/50 active:scale-95
                     transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                     touch-manipulation min-h-[56px] relative overflow-hidden group"
        >
          <span className="relative z-10">
            {loading ? "送信中..." : "🎵 リクエスト送信"}
          </span>
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-purple-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
        </button>
      </div>
    </>
  );
}
