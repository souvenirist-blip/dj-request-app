# 🎧 DJ リクエストアプリ

DJイベントで使用する楽曲リクエストアプリケーション。参加者がSpotifyから曲を検索してリクエストでき、DJが管理画面でリクエストを確認・管理できます。

## 機能

### ユーザー側
- 🔍 Spotify APIによる楽曲検索
- 📝 ニックネーム＋メッセージ付きリクエスト
- ✅ 重複リクエストの防止
- 📱 モバイル対応

### 管理画面（/admin）
- 🔐 パスワード認証
- 📊 リクエスト一覧（リクエスト数順）
- 👥 個別リクエストの表示（誰が・いつ・メッセージ）
- ✅ 再生済み管理・履歴表示
- 🗑️ リクエストの個別削除

## 技術スタック

- **フレームワーク**: Next.js 15 (App Router)
- **言語**: TypeScript
- **データベース**: Firebase Firestore
- **API**: Spotify Web API
- **スタイリング**: Tailwind CSS
- **デプロイ**: Vercel / Firebase Hosting

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.local` ファイルを作成：

```env
# Spotify API
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret

# 管理画面パスワード
NEXT_PUBLIC_ADMIN_PASSWORD=your_admin_password
```

### 3. Firebase の設定

`src/lib/firebase.js` にFirebaseの設定を記述（既に設定済み）

### 4. Firebase セキュリティルールとインデックスの設定

**重要**: デプロイ前に必ず設定してください。

詳細は [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) を参照してください。

#### クイックセットアップ（Firebase CLI）

```bash
# Firebase CLIをインストール
npm install -g firebase-tools

# ログイン
firebase login

# 初期化
firebase init

# デプロイ
firebase deploy --only firestore
```

### 5. 開発サーバーの起動

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) でアクセス

## 使い方

### ユーザー側
1. ニックネームを入力
2. 曲名を検索
3. リクエストしたい曲を選択
4. メッセージを入力（任意）
5. 「リクエスト送信」をクリック

### 管理画面（/admin）
1. `/admin` にアクセス
2. パスワードを入力（デフォルト: `dj2024`）
3. 「リクエスト中」タブでリクエストを確認
4. 「再生済み」ボタンで再生済みに移動
5. 個別リクエストの削除も可能

## プロジェクト構造

```
dj-request/
├── app/
│   ├── page.tsx           # メインページ（ユーザー側）
│   ├── admin/
│   │   └── page.tsx       # 管理画面
│   ├── api/
│   │   └── spotify/
│   │       └── search/
│   │           └── route.ts  # Spotify検索API
│   └── layout.tsx         # レイアウト
├── src/
│   ├── components/        # コンポーネント
│   │   ├── Toast.tsx
│   │   └── ToastContainer.tsx
│   ├── lib/
│   │   └── firebase.js    # Firebase設定
│   └── types/
│       └── index.ts       # TypeScript型定義
├── firestore.rules        # Firestoreセキュリティルール
├── firestore.indexes.json # Firestoreインデックス
└── FIREBASE_SETUP.md      # Firebase設定手順
```

## デプロイ

### Vercel（推奨）

```bash
npm install -g vercel
vercel
```

環境変数を忘れずに設定してください。

### Firebase Hosting

```bash
npm run build
firebase deploy
```

## セキュリティ

- 管理画面はパスワード保護されています
- Firestoreセキュリティルールで不正なデータ操作を防止
- 環境変数は `.gitignore` に含まれています

**本番環境での推奨事項：**
- 管理画面の操作をAPI Route経由で実行
- Firebase Admin SDKの使用
- カスタムクレームによる管理者認証

詳細は [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) を参照してください。

## ライセンス

MIT

## 開発者

Claude Code で開発されました
