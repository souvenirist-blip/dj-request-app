# Firebase Analytics自動クリーンアップ設定

このドキュメントでは、毎日JST 6:00にFirebase Analyticsのデータを自動削除するCloud Functionsの設定方法を説明します。

## 概要

- **目的**: Firestoreのストレージ容量とコストを削減
- **動作**: 毎日JST 6:00に、前日以前の`analytics/daily/dates`コレクションのデータを削除
- **実装方法**: Firebase Cloud Functions (scheduled function)

## 新しいAnalytics構造

### データ保存形式
```
analytics/
  └─ daily/
      └─ dates/
          └─ 2026-02-17/  (今日の日付)
              ├─ date: "2026-02-17"
              ├─ pageViews:
              │   ├─ total: 150
              │   ├─ home: 80
              │   ├─ stats: 30
              │   └─ ...
              ├─ requestSubmissions: 25
              └─ lastUpdated: "2026-02-17T10:30:00Z"
```

### 特徴
- **日次集計**: イベントごとにドキュメントを追加するのではなく、1日1ドキュメントでカウンターを増分
- **自動リセット**: 毎日JST 6:00に前日以前のデータを削除
- **低コスト**: ドキュメント数が大幅に削減され、書き込み・読み取りコストが低下

## セットアップ手順

### 1. Firebase Functionsの依存関係をインストール

```bash
cd functions
npm install
```

### 2. Firebase CLIでログイン（未ログインの場合）

```bash
firebase login
```

### 3. Firebase Functionsをデプロイ

```bash
firebase deploy --only functions
```

### 4. デプロイ確認

デプロイが成功すると、以下のような出力が表示されます：

```
✔  functions[cleanupOldAnalytics] Successful create operation.
Function URL: https://us-central1-[YOUR-PROJECT-ID].cloudfunctions.net/cleanupOldAnalytics
```

### 5. Cloud Schedulerの有効化

初回デプロイ時に、Google Cloud Platformで「Cloud Scheduler API」の有効化が必要になる場合があります。
その場合は、表示されるリンクから有効化してください。

## 動作確認

### Firebase Consoleで確認

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. プロジェクトを選択
3. 「Functions」タブをクリック
4. `cleanupOldAnalytics` 関数が表示されていることを確認
5. スケジュール: `0 21 * * *` (毎日21:00 UTC = 翌日6:00 JST)

### ログで確認

デプロイ後、翌日のJST 6:00以降にログを確認：

```bash
firebase functions:log --only cleanupOldAnalytics
```

または、Firebase Consoleの「Functions」→「ログ」で確認できます。

## 料金について

### Cloud Functionsの料金
- **無料枠**:
  - 200万回の呼び出し/月
  - 400,000 GB秒のメモリ/月
  - 200,000 GHz秒のCPU/月

この関数は1日1回（月30回）のみ実行されるため、無料枠内で十分動作します。

### Firestoreの料金削減効果

#### 変更前（イベントごとに保存）
- ページビュー100回/日 → 100ドキュメント/日 → 3,000ドキュメント/月
- リクエスト20回/日 → 20ドキュメント/日 → 600ドキュメント/月
- **合計**: 3,600ドキュメント/月

#### 変更後（日次集計）
- 毎日1ドキュメントのみ保持
- **合計**: 1ドキュメント（常時）

**削減率**: 約99.97%のストレージとクエリコスト削減

## トラブルシューティング

### デプロイエラー: "Cloud Scheduler API has not been enabled"

**解決方法**:
1. エラーメッセージ内のリンクをクリック
2. Google Cloud Platformで「Cloud Scheduler API」を有効化
3. 再度`firebase deploy --only functions`を実行

### 関数が実行されない

**確認項目**:
1. Firebase Consoleで関数がデプロイされているか確認
2. スケジュールが正しく設定されているか確認（タイムゾーン: Asia/Tokyo）
3. ログを確認して、エラーが発生していないか確認

```bash
firebase functions:log --only cleanupOldAnalytics
```

### 手動でクリーンアップを実行

テスト目的で、すぐに関数を実行したい場合：

```bash
# Firebase Consoleから手動実行
# Functions → cleanupOldAnalytics → テスト
```

## メンテナンス

### データ保持期間の変更

もし2日間データを保持したい場合は、`functions/index.js`を編集：

```javascript
// 今日と昨日のデータを保持
const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

snapshot.forEach((doc) => {
  // 今日と昨日以外のドキュメントを削除
  if (doc.id !== today && doc.id !== yesterday) {
    batch.delete(doc.ref);
    deletedCount++;
  }
});
```

変更後、再デプロイ：
```bash
firebase deploy --only functions
```

## 参考リンク

- [Firebase Cloud Functions ドキュメント](https://firebase.google.com/docs/functions)
- [Cloud Scheduler ドキュメント](https://cloud.google.com/scheduler/docs)
- [Firebase 料金プラン](https://firebase.google.com/pricing)
