# Firebase セキュリティルールとインデックスの設定

## 方法1: Firebase CLI を使用（推奨）

### 1. Firebase CLI をインストール

```bash
npm install -g firebase-tools
```

### 2. Firebase にログイン

```bash
firebase login
```

### 3. Firebase プロジェクトを初期化

```bash
firebase init
```

以下を選択：
- Firestore: Configure security rules and indexes files
- プロジェクト: dj-request-54818 を選択
- ルールファイル: `firestore.rules` (既に作成済み)
- インデックスファイル: `firestore.indexes.json` (既に作成済み)

### 4. デプロイ

```bash
firebase deploy --only firestore
```

---

## 方法2: Firebase Console から手動設定

### セキュリティルールの設定

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. プロジェクト「dj-request-54818」を選択
3. 左メニューから「Firestore Database」→「ルール」を選択
4. 以下のルールをコピー＆ペースト：

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /tracks/{trackId} {
      allow read: if true;
      allow create: if request.resource.data.title is string &&
                      request.resource.data.artist is string &&
                      request.resource.data.status in ['pending', 'played'] &&
                      request.resource.data.totalRequests is number;
      allow update: if request.resource.data.diff(resource.data).affectedKeys()
                      .hasOnly(['totalRequests', 'status', 'playedAt']);
      allow delete: if true;

      match /requests/{requestId} {
        allow read: if true;
        allow create: if request.resource.data.nickname is string &&
                        request.resource.data.nickname.size() > 0 &&
                        request.resource.data.nickname.size() <= 50 &&
                        request.resource.data.keys().hasAll(['nickname', 'requestedAt']) &&
                        request.resource.data.keys().hasOnly(['nickname', 'message', 'requestedAt']);
        allow delete: if true;
        allow update: if false;
      }
    }
  }
}
```

5. 「公開」ボタンをクリック

### インデックスの設定

1. Firebase Console の「Firestore Database」→「インデックス」を選択
2. 以下のインデックスを作成：

#### インデックス1: リクエスト中の曲（リクエスト数順）
- コレクション ID: `tracks`
- フィールド:
  - `status` (昇順)
  - `totalRequests` (降順)
- クエリスコープ: コレクション
- ステータス: 有効

#### インデックス2: 再生済みの曲（作成日順）
- コレクション ID: `tracks`
- フィールド:
  - `status` (昇順)
  - `createdAt` (降順)
- クエリスコープ: コレクション
- ステータス: 有効

#### インデックス3: リクエスト（時刻順）
- コレクション グループ ID: `requests`
- フィールド:
  - `requestedAt` (降順)
- クエリスコープ: コレクション グループ
- ステータス: 有効

---

## セキュリティルールの説明

### 現在の設定

- ✅ **読み取り**: 誰でも可能（公開イベント用）
- ✅ **リクエスト作成**: 制限付きで許可
  - ニックネームは必須（1〜50文字）
  - 必要なフィールドのみ作成可能
- ⚠️ **削除・更新**: 一時的に許可

### ⚠️ セキュリティ上の注意

現在の実装では、管理画面の操作（削除・更新）をクライアント側で行っているため、
セキュリティルールで完全には保護できていません。

**本番環境で推奨される改善：**
1. 管理画面の操作をAPI Route経由で実行
2. Firebase Admin SDKを使用
3. カスタムクレームで管理者を識別

**現状での運用方法：**
- 管理画面のパスワードは厳重に管理
- 定期的にFirestoreのログを確認
- 不正なアクセスがないかモニタリング

---

## トラブルシューティング

### インデックスエラーが出た場合

ブラウザのコンソールに以下のようなエラーが表示される場合：

```
The query requires an index. You can create it here: https://console.firebase.google.com/...
```

→ リンクをクリックして自動的にインデックスを作成できます（数分かかります）

### セキュリティルールのテスト

Firebase Console の「ルール」タブで「ルールプレイグラウンド」を使用してテストできます。
