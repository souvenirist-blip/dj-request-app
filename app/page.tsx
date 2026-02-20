"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
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
// import ShareButtons from "../src/components/ShareButtons";
import {
  trackSearch,
  trackTrackSelect,
  trackRequestSubmit,
} from "../src/lib/analytics";
import { trackPageView, trackRequestSubmission } from "../src/lib/analytics-firebase";

export default function Home() {
  const [nickname, setNickname] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SpotifyTrack[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<SpotifyTrack | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isManualMode, setIsManualMode] = useState(false);
  const [manualTrackName, setManualTrackName] = useState("");
  const [manualArtistName, setManualArtistName] = useState("");
  const [showShareModal, setShowShareModal] = useState(false);
  const [sharedTrack, setSharedTrack] = useState<{ title: string; artist: string } | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  useEffect(() => {
    document.title = "Music Request";
    trackPageView("home");
  }, []);

  // クールダウンチェック
  useEffect(() => {
    const checkCooldown = () => {
      const lastSubmitTime = localStorage.getItem("last_request_time");
      if (lastSubmitTime) {
        const timePassed = Date.now() - parseInt(lastSubmitTime);
        const cooldownTime = 60000; // 1分 = 60000ms
        const remaining = cooldownTime - timePassed;

        if (remaining > 0) {
          setCooldownRemaining(Math.ceil(remaining / 1000));
        } else {
          setCooldownRemaining(0);
        }
      }
    };

    checkCooldown();
    const interval = setInterval(checkCooldown, 1000);

    return () => clearInterval(interval);
  }, []);

  // トースト通知を追加
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
    if (!nickname || !nickname.trim() || !selectedTrack) {
      addToast("ニックネームと曲選択は必須です", "error");
      return;
    }

    // クールダウンチェック
    if (cooldownRemaining > 0) {
      addToast(`${cooldownRemaining}秒後に送信可能です`, "error");
      return;
    }

    setLoading(true);

    try {
      const trackId = selectedTrack.id;
      const trackRef = doc(db, "tracks", trackId);

      // 🔍 重複チェック: 同じニックネームで既にリクエスト済みか確認
      const requestsRef = collection(trackRef, "requests");
      const { query: firestoreQuery, where, getDocs: getDocsFirestore } = await import("firebase/firestore");
      const duplicateQuery = firestoreQuery(requestsRef, where("nickname", "==", nickname.trim()));
      const duplicateSnap = await getDocsFirestore(duplicateQuery);

      if (!duplicateSnap.empty) {
        addToast("この曲は既にリクエスト済みです", "error");
        setLoading(false);
        return;
      }

      const trackSnap = await getDoc(trackRef);

      if (!trackSnap.exists()) {
        const trackData: any = {
          title: selectedTrack.name,
          artist: selectedTrack.artists[0].name,
          totalRequests: 1,
          status: "pending",
          createdAt: serverTimestamp(),
        };

        // imageがある場合のみ追加
        const imageUrl = selectedTrack.album.images[0]?.url;
        if (imageUrl) {
          trackData.image = imageUrl;
        }

        await setDoc(trackRef, trackData);
      } else {
        const currentData = trackSnap.data();
        const updates: any = {
          totalRequests: increment(1),
        };

        // statusがplayedだったらpendingに戻す
        if (currentData.status === "played") {
          updates.status = "pending";
        }

        await updateDoc(trackRef, updates);
      }

      const requestData: any = {
        nickname: nickname.trim(),
        requestedAt: serverTimestamp(),
      };

      // messageがある場合のみ追加
      if (message && message.trim()) {
        requestData.message = message.trim();
      }

      await addDoc(collection(trackRef, "requests"), requestData);

      // GA: リクエスト送信イベント
      trackRequestSubmit(selectedTrack.name, selectedTrack.artists[0].name);

      // Firebase Analytics: リクエスト送信
      trackRequestSubmission();

      addToast("リクエストを送信しました！", "success");

      // クールダウン開始
      localStorage.setItem("last_request_time", Date.now().toString());
      setCooldownRemaining(60);

      // シェアモーダルを表示
      // setSharedTrack({
      //   title: selectedTrack.name,
      //   artist: selectedTrack.artists[0].name,
      // });
      // setShowShareModal(true);

      setNickname("");
      setSearchQuery("");
      setSelectedTrack(null);
      setMessage("");
      setResults([]);
      setIsManualMode(false);
      setManualTrackName("");
      setManualArtistName("");
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
        <div className="text-center pt-8 pb-6">
          <h1 className="text-4xl sm:text-5xl font-extralight tracking-widest text-white mb-6">
            Music Request
          </h1>
        </div>

        {/* ニックネーム入力 */}
        <div className="space-y-3">
          <label htmlFor="nickname" className="block text-xs font-normal text-slate-500 tracking-wider uppercase">
            ニックネーム
          </label>
          <input
            id="nickname"
            type="text"
            placeholder="ニックネームを入力"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="w-full glass p-5 rounded-lg placeholder:text-slate-600
                       focus:outline-none focus:border-purple-500 focus:glass-hover
                       transition-all duration-200 text-white tracking-wide"
          />
        </div>

        {/* 検索欄 */}
        <div className="space-y-3">
          <label htmlFor="search" className="block text-xs font-normal text-slate-500 tracking-wider uppercase">
            曲を検索
          </label>
          <div className="relative">
            <input
              id="search"
              type="text"
              placeholder="曲名またはアーティスト名"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedTrack(null);
              }}
              className="w-full glass p-5 rounded-lg placeholder:text-slate-600
                         focus:outline-none focus:border-purple-500 focus:glass-hover
                         transition-all duration-200 text-white tracking-wide"
              disabled={isManualMode}
            />
            {searching && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setIsManualMode(!isManualMode);
              setSearchQuery("");
              setResults([]);
              setSelectedTrack(null);
              setManualTrackName("");
              setManualArtistName("");
            }}
            className="text-xs text-slate-500 hover:text-purple-400 transition-colors tracking-wide border-b border-dashed border-slate-600 hover:border-purple-400"
          >
            {isManualMode ? "← 検索に戻る" : "見つからない場合はこちらから手動で入力"}
          </button>
        </div>

        {/* 手動入力フォーム */}
        {isManualMode && !selectedTrack && (
          <div className="space-y-4 glass p-6 rounded-lg">
            <div className="space-y-3">
              <label htmlFor="manualTrackName" className="block text-xs font-normal text-slate-500 tracking-wider uppercase">
                曲名
              </label>
              <input
                id="manualTrackName"
                type="text"
                placeholder="曲名を入力"
                value={manualTrackName}
                onChange={(e) => setManualTrackName(e.target.value)}
                className="w-full glass p-4 rounded-lg placeholder:text-slate-600
                         focus:outline-none focus:border-purple-500 focus:glass-hover
                         transition-all duration-200 text-white tracking-wide"
              />
            </div>
            <div className="space-y-3">
              <label htmlFor="manualArtistName" className="block text-xs font-normal text-slate-500 tracking-wider uppercase">
                アーティスト名
              </label>
              <input
                id="manualArtistName"
                type="text"
                placeholder="アーティスト名を入力"
                value={manualArtistName}
                onChange={(e) => setManualArtistName(e.target.value)}
                className="w-full glass p-4 rounded-lg placeholder:text-slate-600
                         focus:outline-none focus:border-purple-500 focus:glass-hover
                         transition-all duration-200 text-white tracking-wide"
              />
            </div>
            <button
              onClick={() => {
                if (!manualTrackName || !manualArtistName) {
                  addToast("曲名とアーティスト名を入力してください", "error");
                  return;
                }
                const manualTrack: SpotifyTrack = {
                  id: `manual_${manualTrackName.replace(/\s/g, "_")}_${manualArtistName.replace(/\s/g, "_")}`,
                  name: manualTrackName,
                  artists: [{
                    id: "manual",
                    name: manualArtistName,
                    type: "artist",
                    uri: "",
                    external_urls: { spotify: "" },
                    href: ""
                  }],
                  album: {
                    id: "manual",
                    name: manualTrackName,
                    album_type: "album",
                    release_date: "",
                    images: [],
                    artists: [],
                    external_urls: { spotify: "" }
                  },
                  duration_ms: 0,
                  explicit: false,
                  external_urls: { spotify: "" },
                  uri: "",
                  href: ""
                };
                setSelectedTrack(manualTrack);
                trackTrackSelect(manualTrackName, manualArtistName);
              }}
              className="w-full gradient-primary py-4 rounded-lg text-white font-light tracking-wider
                       hover:opacity-90 active:scale-95 transition-all duration-200"
            >
              選択
            </button>
          </div>
        )}

        {/* 検索結果一覧 */}
        {!selectedTrack && results.length > 0 && (
          <div className="flex flex-col gap-2 max-h-96 overflow-y-auto pr-2">
            {results.map((track) => (
              <div
                key={track.id}
                onClick={() => {
                  setSelectedTrack(track);
                  trackTrackSelect(track.name, track.artists[0].name);
                }}
                className="flex items-center gap-4 p-5 rounded-lg glass cursor-pointer
                         hover:glass-hover hover:border-purple-500
                         transition-all duration-200 touch-manipulation"
              >
                <Image
                  src={track.album.images[0]?.url || "/placeholder.png"}
                  alt={track.name}
                  width={64}
                  height={64}
                  className="w-16 h-16 rounded object-cover"
                  unoptimized={!track.album.images[0]?.url}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-light text-white truncate tracking-wide">{track.name}</div>
                  <div className="text-sm text-slate-500 truncate tracking-wide">
                    {track.artists[0].name}
                  </div>
                </div>
            </div>
          ))}
        </div>
      )}

        {/* 選択済み表示 */}
        {selectedTrack && (
          <div className="glass p-1 rounded-lg border-2 border-purple-500 animate-pulse-glow">
            <div className="flex items-center gap-4 p-5 rounded-lg bg-black">
              <Image
                src={selectedTrack.album.images[0]?.url || "/placeholder.png"}
                alt={selectedTrack.name}
                width={64}
                height={64}
                className="w-16 h-16 rounded object-cover"
                unoptimized={!selectedTrack.album.images[0]?.url}
              />
              <div className="flex-1 min-w-0">
                <div className="font-light text-white truncate text-lg tracking-wide">{selectedTrack.name}</div>
                <div className="text-sm text-slate-500 truncate tracking-wide">
                  {selectedTrack.artists[0].name}
                </div>
              </div>
              <div className="text-purple-500 text-sm tracking-wider">選択中</div>
            </div>
          </div>
        )}

        {/* メッセージ入力 */}
        <div className="space-y-3">
          <label htmlFor="message" className="block text-xs font-normal text-slate-500 tracking-wider uppercase">
            メッセージ <span className="text-slate-700 font-normal lowercase">(任意)</span>
          </label>
          <textarea
            id="message"
            placeholder="メッセージを入力"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="w-full glass p-5 rounded-lg placeholder:text-slate-600
                       focus:outline-none focus:border-purple-500 focus:glass-hover
                       transition-all duration-200 text-white resize-none tracking-wide"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || cooldownRemaining > 0}
          className="gradient-primary w-full py-5 rounded-lg text-white text-lg font-extralight tracking-widest
                     hover:opacity-90 active:scale-95
                     transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                     touch-manipulation min-h-[60px]"
        >
          {loading
            ? "送信中..."
            : cooldownRemaining > 0
            ? `待機中 ${cooldownRemaining}秒`
            : "リクエストを送信"}
        </button>

        {cooldownRemaining > 0 && !loading && (
          <div className="text-center text-slate-500 text-xs tracking-wide mt-2">
            {cooldownRemaining}秒後に再度リクエストできます
          </div>
        )}

        {/* シェアモーダル */}
        {/* {showShareModal && sharedTrack && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="glass rounded-lg p-6 max-w-md w-full animate-slide-in">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-extralight text-white mb-4 tracking-widest">
                  REQUEST SENT
                </h2>
                <div className="text-slate-400 text-sm mb-2 tracking-wide">
                  {sharedTrack.title}
                </div>
                <div className="text-slate-600 text-xs mb-6 tracking-wide">
                  {sharedTrack.artist}
                </div>

                <ShareButtons
                  trackTitle={sharedTrack.title}
                  artistName={sharedTrack.artist}
                />
              </div>

              <button
                onClick={() => {
                  setShowShareModal(false);
                  setSharedTrack(null);
                }}
                className="w-full glass px-4 py-2.5 rounded-lg text-slate-500 font-light tracking-wider text-sm
                         hover:glass-hover hover:text-white active:scale-95 transition-all duration-200"
              >
                Close
              </button>
            </div>
          </div>
        )} */}
      </div>
    </>
  );
}
