# Google Analytics セットアップガイド

## Google Analytics（GA4）の設定

### 1. Google Analyticsアカウントの作成

1. [Google Analytics](https://analytics.google.com/)にアクセス
2. Googleアカウントでログイン
3. 「測定を開始」をクリック
4. アカウント名を入力（例: DJリクエストアプリ）
5. プロパティ名を入力（例: DJ Request App）
6. タイムゾーンと通貨を選択（日本 / 日本円）
7. 「ウェブ」を選択
8. ウェブサイトのURLとストリーム名を入力
9. 測定IDをコピー（`G-XXXXXXXXXX`形式）

### 2. 環境変数の設定

`.env.local` ファイルに測定IDを追加：

```env
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

### 3. デプロイ

環境変数を設定した後、アプリケーションをデプロイします。

**Vercelの場合：**
1. Vercel ダッシュボード → プロジェクト → Settings → Environment Variables
2. `NEXT_PUBLIC_GA_ID` を追加
3. 値に測定IDを入力
4. 再デプロイ

---

## トラッキングされるイベント

### ユーザー側（メインページ）

| イベント名 | 説明 | パラメータ |
|-----------|------|------------|
| `search` | 曲検索時 | `search_term`, `results_count` |
| `track_select` | 曲選択時 | `track_name`, `artist_name` |
| `request_submit` | リクエスト送信時 | `track_name`, `artist_name` |

### 管理画面

| イベント名 | 説明 | パラメータ |
|-----------|------|------------|
| `admin_login` | 管理画面ログイン時 | なし |
| `tab_change` | タブ切り替え時 | `tab_name` |
| `mark_as_played` | 再生済みマーク時 | `track_name` |
| `delete_request` | リクエスト削除時 | `track_name` |

---

## Google Analyticsでの確認方法

### リアルタイムレポート

1. Google Analytics → レポート → リアルタイム
2. 現在アクセス中のユーザー数とイベントを確認

### イベントレポート

1. Google Analytics → レポート → エンゲージメント → イベント
2. カスタムイベントの発生回数を確認
3. 各イベントのパラメータを分析

### カスタムレポートの作成

1. Google Analytics → 探索
2. 新しい探索を作成
3. ディメンション: イベント名、ページパス
4. 指標: イベント数、ユーザー数
5. レポートを保存

---

## 分析できるデータ

### ユーザー行動
- 最も検索された曲
- 最もリクエストされた曲
- 検索→選択→送信のコンバージョン率
- 平均検索結果数

### 管理画面の使用状況
- ログイン頻度
- タブ切り替え頻度
- 再生済みマーク数
- リクエスト削除数

### パフォーマンス指標
- ページビュー数
- セッション時間
- 直帰率
- ユーザー数（新規/リピーター）

---

## プライバシーとGDPR対応

### データ収集の透明性

アプリにプライバシーポリシーを追加することをお勧めします：

```typescript
// 例: プライバシー通知コンポーネント
const PrivacyBanner = () => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-900 p-4 text-sm">
      このサイトはGoogle Analyticsを使用しています。
      <button>OK</button>
    </div>
  );
};
```

### オプトアウト

ユーザーがトラッキングを拒否できるオプションを提供：

```typescript
// analytics.ts に追加
export const disableTracking = () => {
  window[`ga-disable-${process.env.NEXT_PUBLIC_GA_ID}`] = true;
};
```

---

## トラブルシューティング

### イベントが記録されない場合

1. **測定IDの確認**
   - `.env.local` の `NEXT_PUBLIC_GA_ID` が正しいか確認
   - `G-` で始まる形式か確認

2. **ブラウザの開発者ツールで確認**
   - F12 → Network タブ
   - `google-analytics.com` へのリクエストがあるか確認

3. **広告ブロッカーの確認**
   - 広告ブロッカーがGAをブロックしている可能性
   - シークレットモードで確認

4. **デプロイ環境の環境変数**
   - Vercel/Firebase Hostingで環境変数が設定されているか確認
   - 再デプロイが必要な場合があります

---

## 参考リンク

- [Google Analytics公式ドキュメント](https://support.google.com/analytics)
- [GA4 イベントリファレンス](https://developers.google.com/analytics/devguides/collection/ga4/events)
- [Next.js Analytics統合](https://nextjs.org/docs/app/building-your-application/optimizing/analytics)
