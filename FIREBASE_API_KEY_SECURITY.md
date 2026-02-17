# Firebase APIキーのセキュリティについて

## GitHub Secret Scanning Alertについて

Firebase Web APIキーがGitHubに検出されましたが、**これは正常な動作**です。

## Firebase Web APIキーは公開されても安全

### なぜ公開されても大丈夫か

1. **設計上の仕様**
   - Firebase Web APIキーは、クライアント側（ブラウザ）で使用されるため、必然的に公開されます
   - すべてのWebアプリケーションで、ブラウザの開発者ツールから確認できます

2. **APIキーの役割**
   - APIキーは**プロジェクトの識別子**であり、秘密情報ではありません
   - 実際のデータへのアクセスは、**Firestore Security Rules**で制御されます

3. **既存の保護措置**
   - ✅ Firestore Security Rulesによるデータアクセス制限
   - ✅ 認証機能による管理画面の保護
   - ✅ レート制限によるスパム防止

## 追加の保護措置（推奨）

さらなるセキュリティ強化のため、以下の設定を推奨します。

### 1. APIキーの使用制限を設定

Firebase Consoleで、APIキーを特定のドメインのみに制限できます。

#### 手順

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. プロジェクト `dj-request-54818` を選択
3. 左メニューから「APIとサービス」→「認証情報」をクリック
4. 「APIキー」セクションで、`Browser key (auto created by Firebase)` を探す
5. APIキー名をクリックして編集画面を開く

#### 推奨設定

**アプリケーションの制限**:
- 「HTTPリファラー（ウェブサイト）」を選択
- 許可するリファラーを追加:
  ```
  https://your-domain.vercel.app/*
  https://your-custom-domain.com/*
  http://localhost:3000/*  (開発環境用)
  ```

**API の制限**:
- 「キーを制限」を選択
- 以下のAPIのみを有効化:
  - Identity Toolkit API
  - Cloud Firestore API
  - Firebase Installations API
  - Token Service API

6. 「保存」をクリック

### 2. Firebase App Checkを有効化（高度な保護）

さらに強力な保護が必要な場合、Firebase App Checkを使用できます。

- 正規のアプリからのリクエストのみを許可
- ボットやスクレイパーからの不正なアクセスを防止

詳細: https://firebase.google.com/docs/app-check

## GitHubアラートへの対応

### オプション1: アラートを無視（推奨）

Firebase Web APIキーは公開されても問題ないため、アラートを無視しても安全です。

GitHubのアラートページで「Dismiss alert」→「Used in tests」または「Will not fix」を選択できます。

### オプション2: 環境変数に移動

APIキーを環境変数に移動しても、ビルド後のJavaScriptには含まれるため、根本的な解決にはなりません。
ただし、リポジトリ上で直接見えなくなるため、アラートは消えます。

#### 手順

1. `.env.local` にAPIキーを追加（既に存在）:
```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyCch3SuQC8x9NjPwJpMUwJ_Ot4YwYalaQo
```

2. `src/lib/firebase.js` を更新:
```javascript
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: "dj-request-54818.firebaseapp.com",
  // ...
};
```

3. `.env.local` を `.gitignore` に追加（既に追加済み）

**注意**: この方法でも、ビルド後のJavaScriptにはAPIキーが埋め込まれます。

### オプション3: 新しいAPIキーを発行して制限を追加

古いAPIキーを削除し、使用制限付きの新しいキーを発行します。

#### 手順

1. Firebase Consoleで上記の「APIキーの使用制限」を設定
2. 既存のAPIキーに制限を追加するだけでOK（新規発行は不要）
3. GitHubアラートは「Will not fix」で閉じる

## まとめ

| 方法 | セキュリティ | 手間 | 推奨度 |
|------|------------|------|--------|
| APIキー使用制限を追加 | ⭐⭐⭐⭐⭐ | 低 | ✅ 強く推奨 |
| アラートを無視 | ⭐⭐⭐ | なし | ✅ OK |
| 環境変数に移動 | ⭐⭐⭐ | 中 | △ あまり意味なし |
| App Checkを有効化 | ⭐⭐⭐⭐⭐ | 高 | ○ 高度な保護 |

## 参考リンク

- [Firebase公式: Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase公式: APIキーの制限](https://firebase.google.com/docs/projects/api-keys)
- [Firebase公式: Is it safe to expose Firebase apiKey?](https://firebase.google.com/docs/projects/api-keys#api-keys-for-firebase-are-different)
