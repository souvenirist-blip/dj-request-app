// Google Analytics helper functions

// GAイベントを送信
export const trackEvent = (
  eventName: string,
  eventParams?: Record<string, any>
) => {
  if (typeof window !== "undefined" && (window as any).gtag) {
    (window as any).gtag("event", eventName, eventParams);
  }
};

// ページビューを送信
export const trackPageView = (url: string) => {
  if (typeof window !== "undefined" && (window as any).gtag) {
    (window as any).gtag("config", process.env.NEXT_PUBLIC_GA_ID, {
      page_path: url,
    });
  }
};

// リクエスト送信イベント
export const trackRequestSubmit = (trackName: string, artist: string) => {
  trackEvent("request_submit", {
    track_name: trackName,
    artist_name: artist,
  });
};

// 検索イベント
export const trackSearch = (query: string, resultsCount: number) => {
  trackEvent("search", {
    search_term: query,
    results_count: resultsCount,
  });
};

// 曲選択イベント
export const trackTrackSelect = (trackName: string, artist: string) => {
  trackEvent("track_select", {
    track_name: trackName,
    artist_name: artist,
  });
};

// 管理画面：再生済みマーク
export const trackMarkAsPlayed = (trackName: string) => {
  trackEvent("mark_as_played", {
    track_name: trackName,
  });
};

// 管理画面：リクエスト削除
export const trackDeleteRequest = (trackName: string) => {
  trackEvent("delete_request", {
    track_name: trackName,
  });
};

// 管理画面：ログイン
export const trackAdminLogin = () => {
  trackEvent("admin_login");
};

// タブ切り替え
export const trackTabChange = (tabName: string) => {
  trackEvent("tab_change", {
    tab_name: tabName,
  });
};
