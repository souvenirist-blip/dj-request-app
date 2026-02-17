"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { db } from "../../src/lib/firebase";
// import ShareButtons from "../../src/components/ShareButtons";
import {
  collection,
  query,
  onSnapshot,
  getDocs,
  orderBy as firestoreOrderBy,
} from "firebase/firestore";
import { Track, TrackRequest } from "../../src/types";
import { trackPageView } from "../../src/lib/analytics-firebase";

interface TrackWithRequests extends Track {
  requests?: TrackRequest[];
}

interface ArtistStats {
  name: string;
  requestCount: number;
  trackCount: number;
}

interface Stats {
  totalRequests: number;
  pendingTracks: number;
  playedTracks: number;
  uniqueUsers: Set<string>;
  topTrack: TrackWithRequests | null;
  topArtists: ArtistStats[];
}

export default function StatsPage() {
  const [stats, setStats] = useState<Stats>({
    totalRequests: 0,
    pendingTracks: 0,
    playedTracks: 0,
    uniqueUsers: new Set(),
    topTrack: null,
    topArtists: [],
  });
  const [allTracks, setAllTracks] = useState<TrackWithRequests[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    document.title = "Statistics | Music Request";
    trackPageView("stats");
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
      const tracks: TrackWithRequests[] = [];
      const artistMap = new Map<string, ArtistStats>();
      const usersSet = new Set<string>();
      let totalReqs = 0;
      let pendingCount = 0;
      let playedCount = 0;
      let topTrack: TrackWithRequests | null = null;

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
          const req = { id: reqDoc.id, ...reqDoc.data() } as TrackRequest;
          requests.push(req);
          usersSet.add(req.nickname);
        });

        trackData.requests = requests;
        tracks.push(trackData);

        // 統計計算
        totalReqs += trackData.totalRequests;

        if (trackData.status === "pending") {
          pendingCount++;
        } else if (trackData.status === "played") {
          playedCount++;
        }

        // トップトラックの更新
        if (!topTrack || trackData.totalRequests > topTrack.totalRequests) {
          topTrack = trackData;
        }

        // アーティスト統計
        const artistName = trackData.artist;
        if (artistMap.has(artistName)) {
          const artist = artistMap.get(artistName)!;
          artist.requestCount += trackData.totalRequests;
          artist.trackCount += 1;
        } else {
          artistMap.set(artistName, {
            name: artistName,
            requestCount: trackData.totalRequests,
            trackCount: 1,
          });
        }
      }

      // トップアーティストをソート
      const topArtists = Array.from(artistMap.values())
        .sort((a, b) => b.requestCount - a.requestCount)
        .slice(0, 5);

      setStats({
        totalRequests: totalReqs,
        pendingTracks: pendingCount,
        playedTracks: playedCount,
        uniqueUsers: usersSet,
        topTrack,
        topArtists,
      });

      setAllTracks(tracks);
    });

    return () => unsubscribe();
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
          Statistics
        </div>
        <div className="text-slate-600 text-xs mb-6 tracking-wide">
          Real-time dashboard
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
            href="/history"
            className="text-slate-400 hover:text-purple-400 transition-colors tracking-wide"
          >
            History
          </Link>
        </div>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {/* 総リクエスト数 */}
        <div className="glass rounded-lg p-6 text-center animate-fade-in">
          <div className="text-3xl font-extralight text-white mb-2">
            {stats.totalRequests}
          </div>
          <div className="text-xs text-slate-500 tracking-widest uppercase">Total Requests</div>
        </div>

        {/* リクエスト中 */}
        <div className="glass rounded-lg p-6 text-center animate-fade-in" style={{ animationDelay: "50ms" }}>
          <div className="text-3xl font-extralight text-purple-400 mb-2">
            {stats.pendingTracks}
          </div>
          <div className="text-xs text-slate-500 tracking-widest uppercase">Pending</div>
        </div>

        {/* 再生済み */}
        <div className="glass rounded-lg p-6 text-center animate-fade-in" style={{ animationDelay: "100ms" }}>
          <div className="text-3xl font-extralight text-purple-400 mb-2">
            {stats.playedTracks}
          </div>
          <div className="text-xs text-slate-500 tracking-widest uppercase">Played</div>
        </div>

        {/* ユーザー数 */}
        <div className="glass rounded-lg p-6 text-center animate-fade-in" style={{ animationDelay: "150ms" }}>
          <div className="text-3xl font-extralight text-purple-400 mb-2">
            {stats.uniqueUsers.size}
          </div>
          <div className="text-xs text-slate-500 tracking-widest uppercase">Users</div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-8">
        {/* 最も人気の曲 */}
        <div className="glass rounded-lg p-6 animate-fade-in" style={{ animationDelay: "200ms" }}>
          <h2 className="text-sm font-light text-slate-500 mb-6 tracking-widest uppercase">
            Top Track
          </h2>
          {stats.topTrack ? (
            <div className="flex items-center gap-5">
              <Image
                src={stats.topTrack.image || "/placeholder.png"}
                alt={stats.topTrack.title}
                width={80}
                height={80}
                className="w-20 h-20 rounded object-cover"
                unoptimized={!stats.topTrack.image}
              />
              <div className="flex-1 min-w-0">
                <div className="font-light text-white truncate text-lg tracking-wide">
                  {stats.topTrack.title}
                </div>
                <div className="text-slate-500 text-sm truncate mb-3 tracking-wide">
                  {stats.topTrack.artist}
                </div>
                <div className="text-xs text-purple-400 tracking-wider">
                  {stats.topTrack.totalRequests} {stats.topTrack.totalRequests === 1 ? 'request' : 'requests'}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-slate-600 py-8">
              <div className="text-sm tracking-wide">No data yet</div>
            </div>
          )}
        </div>

        {/* トップアーティスト */}
        <div className="glass rounded-lg p-6 animate-fade-in" style={{ animationDelay: "250ms" }}>
          <h2 className="text-sm font-light text-slate-500 mb-6 tracking-widest uppercase">
            Top Artists
          </h2>
          {stats.topArtists.length > 0 ? (
            <div className="space-y-3">
              {stats.topArtists.map((artist, index) => (
                <div
                  key={artist.name}
                  className="flex items-center justify-between p-3 rounded-lg glass"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white font-light text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-light text-white text-sm tracking-wide">
                        {artist.name}
                      </div>
                      <div className="text-xs text-slate-600 tracking-wide">
                        {artist.trackCount} {artist.trackCount === 1 ? 'track' : 'tracks'}
                      </div>
                    </div>
                  </div>
                  <div className="text-purple-400 font-light text-sm tracking-wide">
                    {artist.requestCount}
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

      {/* リクエスト数トップ5 */}
      <div className="glass rounded-lg p-6 mb-8 animate-fade-in" style={{ animationDelay: "300ms" }}>
        <h2 className="text-sm font-light text-slate-500 mb-6 tracking-widest uppercase">
          Top 5 Requests
        </h2>
        {allTracks.length > 0 ? (
          <div className="space-y-3">
            {allTracks
              .sort((a, b) => b.totalRequests - a.totalRequests)
              .slice(0, 5)
              .map((track, index) => (
                <div
                  key={track.id}
                  className="flex items-center gap-4 p-4 rounded-lg glass"
                >
                  <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white font-light flex-shrink-0">
                    {index + 1}
                  </div>
                  <Image
                    src={track.image || "/placeholder.png"}
                    alt={track.title}
                    width={48}
                    height={48}
                    className="w-12 h-12 rounded object-cover flex-shrink-0"
                    unoptimized={!track.image}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-light text-white truncate tracking-wide">
                      {track.title}
                    </div>
                    <div className="text-sm text-slate-500 truncate tracking-wide">
                      {track.artist}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {track.status === "played" && (
                      <span className="text-purple-400 text-xs tracking-wider">PLAYED</span>
                    )}
                    <div className="text-purple-400 font-light tracking-wide">
                      {track.totalRequests}
                    </div>
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

      {/* シェアセクション */}
      {/* <div className="glass rounded-lg p-5 mb-8 animate-fade-in" style={{ animationDelay: "350ms" }}>
        <ShareButtons />
      </div> */}

      {/* ナビゲーション */}
      <div className="flex gap-3 justify-center pb-8 flex-wrap">
        <Link
          href="/admin"
          className="gradient-primary px-8 py-3 rounded-lg text-white font-light tracking-wider
                   hover:opacity-90 active:scale-95 transition-all duration-200"
        >
          Admin
        </Link>
        <Link
          href="/requests"
          className="glass px-8 py-3 rounded-lg text-slate-400 font-light tracking-wider
                   hover:glass-hover hover:text-white active:scale-95
                   transition-all duration-200"
        >
          Requests
        </Link>
        <Link
          href="/history"
          className="glass px-8 py-3 rounded-lg text-slate-400 font-light tracking-wider
                   hover:glass-hover hover:text-white active:scale-95
                   transition-all duration-200"
        >
          History
        </Link>
      </div>
    </div>
  );
}
