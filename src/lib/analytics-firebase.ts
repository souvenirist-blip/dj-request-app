import { db } from "./firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

// セッションIDを生成または取得
const getSessionId = (): string => {
  if (typeof window === "undefined") return "";

  let sessionId = sessionStorage.getItem("analytics_session_id");
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    sessionStorage.setItem("analytics_session_id", sessionId);
  }
  return sessionId;
};

// ページビューを記録
export const trackPageView = async (pageName: string) => {
  if (typeof window === "undefined") return;

  try {
    const sessionId = getSessionId();
    const analyticsRef = collection(db, "analytics");

    await addDoc(analyticsRef, {
      type: "page_view",
      page: pageName,
      sessionId,
      timestamp: serverTimestamp(),
      userAgent: navigator.userAgent,
      referrer: document.referrer || null,
    });
  } catch (error) {
    console.error("Analytics tracking error:", error);
  }
};

// リクエスト送信を記録
export const trackRequestSubmission = async () => {
  if (typeof window === "undefined") return;

  try {
    const sessionId = getSessionId();
    const analyticsRef = collection(db, "analytics");

    await addDoc(analyticsRef, {
      type: "request_submission",
      sessionId,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error("Analytics tracking error:", error);
  }
};
