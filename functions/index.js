const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

// 毎日JST 6:00（UTC 21:00前日）に実行
// Cron形式: "0 21 * * *" = 毎日21:00 UTC (翌日6:00 JST)
exports.cleanupOldAnalytics = functions.pubsub
  .schedule("0 21 * * *")
  .timeZone("Asia/Tokyo")
  .onRun(async (context) => {
    const db = admin.firestore();

    try {
      // 今日の日付を取得（JST 6:00基準）
      const now = new Date();
      const today = now.toISOString().split('T')[0];

      console.log(`Cleanup job started at ${now.toISOString()}`);
      console.log(`Today's date (to keep): ${today}`);

      // analytics/daily/dates コレクション内の古いドキュメントを削除
      const datesCollectionRef = db.collection("analytics").doc("daily").collection("dates");
      const snapshot = await datesCollectionRef.get();

      let deletedCount = 0;
      const batch = db.batch();

      snapshot.forEach((doc) => {
        // 今日以外のドキュメントを削除
        if (doc.id !== today) {
          batch.delete(doc.ref);
          deletedCount++;
          console.log(`Marking for deletion: ${doc.id}`);
        }
      });

      if (deletedCount > 0) {
        await batch.commit();
        console.log(`Successfully deleted ${deletedCount} old analytics documents`);
      } else {
        console.log("No old documents to delete");
      }

      return null;
    } catch (error) {
      console.error("Error during cleanup:", error);
      return null;
    }
  });
