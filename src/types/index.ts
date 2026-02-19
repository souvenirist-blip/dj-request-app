// Spotify API Types
export interface SpotifyImage {
  url: string;
  height: number;
  width: number;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  type: string;
  uri: string;
  external_urls: {
    spotify: string;
  };
  href: string;
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  album_type: string;
  images: SpotifyImage[];
  release_date: string;
  artists: SpotifyArtist[];
  external_urls: {
    spotify: string;
  };
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: SpotifyArtist[];
  album: SpotifyAlbum;
  duration_ms: number;
  explicit: boolean;
  external_urls: {
    spotify: string;
  };
  uri: string;
  href: string;
}

export interface SpotifySearchResponse {
  tracks?: {
    items: SpotifyTrack[];
    total: number;
    limit: number;
    offset: number;
  };
  error?: {
    status: number;
    message: string;
  };
}

// Firebase Types
export interface TrackRequest {
  id?: string; // ドキュメントID
  nickname: string;
  message: string;
  requestedAt: any; // Firestore Timestamp
  deletedAt?: any; // Firestore Timestamp (論理削除の場合のみ)
  deletedBy?: string; // 削除者 (論理削除の場合のみ)
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  image: string;
  totalRequests: number;
  status: "pending" | "played";
  createdAt: any; // Firestore Timestamp
  playedAt?: any; // Firestore Timestamp (再生済みの場合のみ)
  deletedAt?: any; // Firestore Timestamp (論理削除の場合のみ)
  deletedBy?: string; // 削除者 (論理削除の場合のみ)
}

// Toast Notification Types
export type ToastType = "success" | "error" | "info";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}
