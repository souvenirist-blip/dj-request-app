import { db } from "./firebase";
import { doc, setDoc, increment, getDoc } from "firebase/firestore";

// 日本時間で今日の日付を取得（JST 6:00基準）
const getTodayDateJST = (): string => {
  const now = new Date();
  // JSTに変換（UTC+9）
  const jstOffset = 9 * 60 * 60 * 1000;
  const jstTime = new Date(now.getTime() + jstOffset);

  // 6時前の場合は前日とみなす
  const jstHour = jstTime.getUTCHours();
  if (jstHour < 6) {
    jstTime.setUTCDate(jstTime.getUTCDate() - 1);
  }

  // YYYY-MM-DD形式で返す
  return jstTime.toISOString().split('T')[0];
};

// ページビューを記録（日次集計）
export const trackPageView = async (pageName: string) => {
  if (typeof window === "undefined") return;

  try {
    const today = getTodayDateJST();
    const dailyAnalyticsRef = doc(db, "analytics", "daily", "dates", today);

    await setDoc(
      dailyAnalyticsRef,
      {
        date: today,
        pageViews: {
          total: increment(1),
          [pageName]: increment(1),
        },
        lastUpdated: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error("Analytics tracking error:", error);
  }
};

// リクエスト送信を記録（日次集計）
export const trackRequestSubmission = async () => {
  if (typeof window === "undefined") return;

  try {
    const today = getTodayDateJST();
    const dailyAnalyticsRef = doc(db, "analytics", "daily", "dates", today);

    await setDoc(
      dailyAnalyticsRef,
      {
        date: today,
        requestSubmissions: increment(1),
        lastUpdated: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error("Analytics tracking error:", error);
  }
};

// 今日の統計を取得
export const getTodayStats = async () => {
  try {
    const today = getTodayDateJST();
    const dailyAnalyticsRef = doc(db, "analytics", "daily", "dates", today);
    const docSnap = await getDoc(dailyAnalyticsRef);

    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (error) {
    console.error("Failed to fetch today's stats:", error);
    return null;
  }
};
