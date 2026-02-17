# Music Request

DJイベントで使用する楽曲リクエストアプリケーション。参加者がSpotifyから曲を検索してリクエストでき、管理者が専用ダッシュボードでリクエストを確認・管理できます。

## 特徴

- **ミニマリストデザイン**: 黒+紫のモノトーンUI
- **リアルタイム更新**: Firebaseによるリアルタイムデータ同期
- **認証保護**: 管理機能は認証必須
- **アナリティクス**: Firebase Analytics統合
- **レート制限**: 悪意のある連続リクエストを防止
- **完全レスポンシブ**: モバイル・タブレット・デスクトップ対応

## 機能

### ユーザー側（/）
- **楽曲検索**: Spotify APIによるリアルタイム検索
- **手動入力**: Spotifyで見つからない曲を手動入力可能
- **リクエスト送信**: ニックネーム + メッセージ付きリクエスト
- **重複防止**: 同じユーザーが同じ曲を複数回リクエストできない
- **クールダウン**: 1分間に1回のみリクエスト可能（60秒カウントダウン表示）

### 管理画面（/admin）
- **パスワード認証**: sessionStorageによる認証状態管理
- **3つのタブ**:
  - **Pending**: リクエスト中の曲（リクエスト数順）
  - **Played**: 再生済みの曲（再生日時順）
  - **Analytics**: アクセス解析ダッシュボード
- **リクエスト詳細**: 各曲の全リクエスト表示（ニックネーム・メッセージ・日時）
- **再生管理**: ワンクリックで再生済みに移動
- **削除機能**: 個別リクエストの削除
- **専用ページへのアクセス**: Requests、History、Statsページへのナビゲーション

### 認証保護ページ（管理者のみ）
- **/requests**: 現在のリクエスト一覧
- **/history**: 再生済み楽曲の履歴
- **/stats**: 統計ダッシュボード
  - 総リクエスト数
  - リクエスト中/再生済みの曲数
  - ユニークユーザー数
  - 人気の曲トップ5
  - 人気のアーティストトップ5

### Firebase Analytics（日次集計）
- **今日のアクティビティ**: ページビュー数・リクエスト送信数を日次集計
- **自動リセット**: 毎日JST 6:00に前日のデータを自動削除
- **低コスト設計**: イベントごとの保存ではなく、カウンター方式で集計
- **Google Analytics統合**: GA4による詳細な分析も利用可能
- **統計ダッシュボード**: リアルタイムで今日の統計を表示

## 技術スタック

- **フレームワーク**: Next.js 16.1.6 (App Router + Turbopack)
- **言語**: TypeScript
- **データベース**: Firebase Firestore（リアルタイム同期）
- **認証**: sessionStorage（簡易認証）
- **API**: Spotify Web API
- **スタイリング**: Tailwind CSS
- **デプロイ**: Vercel
- **アナリティクス**: Firebase Analytics

## セットアップ

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd dj-request
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. 環境変数の設定

`.env.local` ファイルを作成：

```env
# Spotify API
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret

# 管理画面パスワード
NEXT_PUBLIC_ADMIN_PASSWORD=your_admin_password
```

#### Spotify API の取得方法
1. [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) にアクセス
2. アプリケーションを作成
3. Client IDとClient Secretを取得

### 4. Firebase の設定

1. [Firebase Console](https://console.firebase.google.com/) でプロジェクトを作成
2. Firestoreを有効化
3. Webアプリを追加して設定情報を取得
4. `src/lib/firebase.js` に設定を記述（既に設定済みの場合はスキップ）

### 5. Firebase セキュリティルールとインデックスのデプロイ

```bash
# Firebase CLIをインストール（未インストールの場合）
npm install -g firebase-tools

# ログイン
firebase login

# プロジェクトを初期化（既に初期化済みの場合はスキップ）
firebase init

# Firestoreルールとインデックスをデプロイ
firebase deploy --only firestore
```

### 6. Firebase Analytics自動クリーンアップ（オプション）

毎日JST 6:00に前日のAnalyticsデータを自動削除する設定：

詳細は [ANALYTICS_CLEANUP_SETUP.md](./ANALYTICS_CLEANUP_SETUP.md) を参照してください。

```bash
# functionsディレクトリで依存関係をインストール
cd functions
npm install

# Cloud Functionsをデプロイ
cd ..
firebase deploy --only functions
```

### 7. 開発サーバーの起動

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) でアクセス

## 使い方

### 参加者（一般ユーザー）

1. トップページ（`/`）にアクセス
2. ニックネームを入力
3. 「Search Song」で曲名またはアーティスト名を検索
   - Spotifyで見つからない場合は「Manual input」から手動入力
4. 曲を選択
5. メッセージを入力（任意）
6. 「SUBMIT REQUEST」をクリック
7. 60秒間のクールダウン後、再度リクエスト可能

### 管理者（DJ）

#### ログイン
1. `/admin` にアクセス
2. パスワードを入力（デフォルト: `dj2024`）
3. 「LOGIN」をクリック

#### リクエスト管理
- **Pendingタブ**: リクエスト中の曲を確認
  - 各曲の「▼」をクリックして詳細を表示
  - 「Mark Played」（モバイルでは「✓」）で再生済みに移動
  - 個別リクエストの「Delete」（モバイルでは「✕」）で削除

- **Playedタブ**: 再生済みの曲を確認（新しい順）

- **Analyticsタブ**: アクセス解析を確認
  - Page Views、Sessions、Requests、Conversion率
  - ページ別アクセス数

#### 専用ページ
- ヘッダーの「Requests」「History」「Stats」リンクから各ページにアクセス
- これらのページは認証済みユーザーのみアクセス可能

## プロジェクト構造

```
dj-request/
├── app/
│   ├── page.tsx              # トップページ（リクエスト送信）
│   ├── admin/
│   │   └── page.tsx          # 管理画面（認証・タブ管理）
│   ├── requests/
│   │   └── page.tsx          # リクエスト一覧（認証必須）
│   ├── history/
│   │   └── page.tsx          # 再生履歴（認証必須）
│   ├── stats/
│   │   └── page.tsx          # 統計ダッシュボード（認証必須）
│   ├── api/
│   │   └── spotify/
│   │       └── search/
│   │           └── route.ts  # Spotify検索API
│   ├── layout.tsx            # グローバルレイアウト
│   └── globals.css           # グローバルスタイル
├── src/
│   ├── components/
│   │   ├── ToastContainer.tsx      # トースト通知
│   │   └── ShareButtons.tsx        # シェアボタン（未使用）
│   ├── lib/
│   │   ├── firebase.js             # Firebase設定
│   │   ├── analytics.ts            # Google Analytics
│   │   └── analytics-firebase.ts   # Firebase Analytics
│   └── types/
│       └── index.ts                # TypeScript型定義
├── firestore.rules               # Firestoreセキュリティルール
├── firestore.indexes.json        # Firestoreインデックス
├── .env.local                    # 環境変数（gitignore対象）
└── README.md                     # このファイル
```

## Firestore データ構造

### tracks コレクション
```typescript
{
  id: string,              // Spotify ID または manual_*
  title: string,           // 曲名
  artist: string,          // アーティスト名
  image: string,           // アルバムアート URL
  totalRequests: number,   // 総リクエスト数
  status: "pending" | "played",  // ステータス
  createdAt: Timestamp,    // 作成日時
  playedAt?: Timestamp     // 再生日時（再生済みの場合）
}
```

### tracks/{trackId}/requests サブコレクション
```typescript
{
  id: string,              // 自動生成ID
  nickname: string,        // ニックネーム
  message?: string,        // メッセージ（任意）
  requestedAt: Timestamp   // リクエスト日時
}
```

### analytics コレクション
```typescript
{
  type: "page_view" | "request_submission",
  page?: string,           // ページ名（page_viewの場合）
  sessionId: string,       // セッションID
  timestamp: Timestamp,    // 記録日時
  userAgent?: string,      // User Agent
  referrer?: string        // リファラー
}
```

## デプロイ

### Vercel（推奨）

1. GitHubにプッシュ
2. [Vercel](https://vercel.com) でインポート
3. 環境変数を設定:
   - `SPOTIFY_CLIENT_ID`
   - `SPOTIFY_CLIENT_SECRET`
   - `NEXT_PUBLIC_ADMIN_PASSWORD`
4. デプロイ

#### CLI経由
```bash
npm install -g vercel
vercel
```

### Firebase Hosting（オプション）

```bash
npm run build
firebase deploy
```

## セキュリティ

### 現在の実装
- 管理画面: sessionStorageによる簡易認証
- Firestoreルール: データバリデーションと制限
- クールダウン: LocalStorageによるレート制限（1分間に1回）
- 重複防止: 同一ユーザー・同一曲のリクエスト制限

### セキュリティルール（firestore.rules）

- **analyticsコレクション**: 作成のみ許可、読み取りは全ユーザー可能
- **tracksコレクション**:
  - 読み取り: 全ユーザー
  - 作成: バリデーション付きで許可
  - 更新: 特定フィールドのみ許可
  - 削除: 許可（TODO: 管理者認証）
- **requestsサブコレクション**:
  - 読み取り: 全ユーザー
  - 作成: バリデーション付きで許可（ニックネーム必須、文字数制限）
  - 削除: 許可（TODO: 管理者認証）
  - 更新: 禁止

### 本番環境での推奨強化策

1. **Firebase Authentication**: sessionStorageの代わりに使用
2. **Admin SDK**: 管理操作をサーバーサイド（API Route）で実行
3. **カスタムクレーム**: 管理者権限の適切な管理
4. **API Route経由の操作**: クライアント側からの直接操作を制限
5. **reCAPTCHA**: Bot対策の強化
6. **レート制限**: Upstash Redisなどによる強固なレート制限

## カスタマイズ

### パスワード変更
`.env.local` の `NEXT_PUBLIC_ADMIN_PASSWORD` を変更してください。
Vercelの環境変数も忘れずに更新してください。

### クールダウン時間変更
`app/page.tsx` の60000（ミリ秒）を変更：
```typescript
const cooldownTime = 60000; // 1分 = 60000ms
```

### デザインカラー変更
`app/globals.css` のCSS変数を変更：
```css
:root {
  --primary: #8b5cf6;        /* メインカラー（紫） */
  --primary-light: #a78bfa;  /* 明るい紫 */
}
```

### 認証方法の変更
より強固な認証が必要な場合は、Firebase Authenticationの導入を推奨します。

## トラブルシューティング

### Spotify検索が動作しない
- 環境変数が正しく設定されているか確認
- Spotify Developer DashboardでAPIキーが有効か確認

### Firestoreへの書き込みが失敗する
- Firestoreルールがデプロイされているか確認
- Firebaseコンソールでインデックスが作成されているか確認

### 管理画面にログインできない
- `.env.local` の `NEXT_PUBLIC_ADMIN_PASSWORD` を確認
- Vercelの環境変数が設定されているか確認
- ブラウザのsessionStorageをクリア

### Analytics が表示されない
- Firestoreルールで `analytics` コレクションへのアクセスが許可されているか確認
- `firebase deploy --only firestore:rules` を実行

## ライセンス

MIT

## 開発者

Developed with Claude Code

## サポート

Issue報告や機能リクエストは、GitHubのIssuesセクションからお願いします。
