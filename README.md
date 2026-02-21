# mdpub-wpblocks

ローカルの Markdown を Gutenberg ブロックに変換し、WordPress REST API 経由で下書き投稿する CLI ツール。

## 特徴

- `@wordpress/blocks` によるブロック生成（`serialize()` で投稿可能な HTML 出力）
- Frontmatter で投稿メタ（タイトル・slug・カテゴリ・タグ等）を管理
- 画像アップロード時に決定論的 slug を使って既存判定（ステートレス）
- 投稿時にローカル画像パスを WordPress メディア URL へ置換
- コンテンツバリデーション（frontmatter 検証、画像パス・featured_image 実在チェック、未対応トークン検出）
- `@wordpress/blocks` のネイティブブロック生成により、投稿後もブロックエディタで自然に編集でき、テーマのブロックスタイルがそのまま適用される

## Quick Start（初回セットアップ〜初投稿）

### 1) 前提

- Node.js v20+
- WordPress 6.x+（REST API が有効であること）

#### WordPress 側の設定

| 項目                 | 設定内容                                                                                                                                           |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| パーマリンク         | 「投稿名」等のカスタム構造（`/%postname%/`）。「基本」のままだと REST API の `/wp-json/` パスが使えない（`?rest_route=` フォールバックは自動対応） |
| Application Password | 管理画面 → ユーザー → プロフィール → Application Password で発行。REST API 認証に使用                                                              |
| テーマ               | FSE ブロックテーマ推奨                                                                                                                             |

#### 推奨プラグイン

| プラグイン                                                                                      | 用途                                                                                          | 必須度               |
| ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | -------------------- |
| [KaTeX](https://wordpress.org/plugins/katex/)                                                   | `$数式$` / `$$数式$$` の表示。未インストールだと `[katex]` ショートコードがそのまま表示される | 数式を使う場合は必須 |
| [Syntax Highlighting Code Block](https://wordpress.org/plugins/syntax-highlighting-code-block/) | コードブロックのシンタックスハイライト                                                        | 任意                 |

#### 非対応

- メディアファイル名を自動変更するプラグイン（slug の決定論的算出が壊れるため）

### 2) セットアップ

```bash
git clone https://github.com/sakashita44/mdpub-wpblocks.git
cd mdpub-wpblocks
npm install
cp .env.example .env   # mdpub init でも生成可能
```

`.env` を編集:

```text
WP_URL=https://your-site.example
WP_USER=your-user
WP_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx-xxxx-xxxx
```

### 3) 記事を作成

`posts/my-first-post/index.md` を作成:

```markdown
---
title: '最初の記事'
slug: 'my-first-post'
categories:
    - diary
tags:
    - first
featured_image: 'images/cover.jpg'
excerpt: 'はじめての投稿'
---

# こんにちは

本文です。
```

### 4) 変換確認 → 画像同期 → 投稿

```bash
npm run convert -- my-first-post
npm run upload-media -- my-first-post
npm run publish -- my-first-post
```

まとめて実行する場合:

```bash
npm run pipeline -- my-first-post
```

## ローカル一時 WordPress 環境（リリース前テスト向け）

本番サイトを汚さずに E2E 検証したい場合は、`@wordpress/env` で一時環境を起動できる。

### 1) Docker を起動

Docker Desktop（または互換環境）を起動しておく。

### 2) 一時 WordPress を起動

```bash
npm run wp:start
```

- サイト: `http://localhost:8888`
- 管理画面: `http://localhost:8888/wp-admin`
- 既定の認証情報: `admin` / `password`

### 3) `.env` を一時環境向けに設定

```text
WP_URL=http://localhost:8888
WP_USER=admin
WP_APP_PASSWORD=<Application Password>
```

Application Password は管理画面のユーザープロフィールで発行する。

### 4) 停止 / 破棄

```bash
npm run wp:stop
npm run wp:destroy
```

- `wp:stop`: コンテナ停止（データ保持）
- `wp:destroy`: 環境削除（データ破棄）

## ローカル CLI 利用（mdpub）

`mdpub` コマンドとして使う場合:

```bash
npm run build
npm link
mdpub --help
```

初期設定（`.env.example` の生成と `.env` の作成）:

```bash
mdpub init          # .env.example を生成（cp .env.example .env でも可）
# .env.example を参考に .env を作成し、WordPress 接続情報を設定
```

`.env` を設定してから実行:

```bash
mdpub convert my-first-post
mdpub upload-media my-first-post
mdpub publish my-first-post
mdpub pipeline my-first-post
mdpub sync
```

## ワークフロー例（新規記事作成→画像配置→公開）

1. `posts/<slug>/index.md` と `posts/<slug>/images/` を作成
1. 本文に `![alt](images/photo.jpg "caption")` を記述
1. `npm run validate-content -- posts/<slug>/index.md` で構文・frontmatter をチェック
1. `npm run upload-media -- <slug>` で画像を同期
1. `npm run publish -- <slug>` で `draft` 投稿
1. WordPress 管理画面で内容確認後に手動公開

## CLI コマンド

```bash
npm run convert -- [--content-root <path>] <article-slug|path-to-md>
npm run upload-media -- [--content-root <path>] <article-slug|path-to-article-dir> [--force-upload]
npm run publish -- [--content-root <path>] <article-slug|path-to-index-md>
npm run pipeline -- [--content-root <path>] [--force-upload] <article-slug|path>
npm run sync
npm run validate-content -- [--content-root <path>] [--strict] <glob>
```

`mdpub` でも同等に実行可能:

```bash
mdpub convert [--content-root <path>] <article-slug|path-to-md>
mdpub upload-media [--content-root <path>] <article-slug|path-to-article-dir> [--force-upload]
mdpub publish [--content-root <path>] <article-slug|path-to-index-md>
mdpub pipeline [--content-root <path>] [--force-upload] <article-slug|path>
mdpub sync
mdpub validate-content [--content-root <path>] [--strict] <glob>
```

## validate-content オプション

`--strict` を付けると、未対応トークン（Markdown 記法の変換非対応要素）もエラー扱いになり、終了コード `1` を返す。省略時は警告のみで正常終了する。

| 終了コード | 意味                                                               |
| ---------- | ------------------------------------------------------------------ |
| `0`        | バリデーション成功                                                 |
| `1`        | frontmatter / 画像パスエラー、または `--strict` 時の未対応トークン |
| `2`        | 引数エラー（glob 未指定など）                                      |

## 設定ファイル

### `.env`（ユーザ設定）

WordPress 接続情報を管理する。`mdpub init` で `.env.example` を生成。

### `.mdpub-cache.json`（自動生成キャッシュ）

`sync` コマンドが WordPress のプラグイン情報を取得して自動生成するキャッシュファイル。手動編集は不要。`pipeline` 実行時に自動で先頭ステップとして実行される。

### `contentRoot` 解決優先順位

1. CLI 引数 `--content-root`
1. 環境変数 `MDPUB_CONTENT_ROOT`
1. デフォルト `posts`

### WordPress 接続環境変数

- `WP_URL`
- `WP_USER`
- `WP_APP_PASSWORD`

優先順位は「既存のプロセス環境変数 > `.env`」。`.env` 読み込みは未定義キーのみ補完し、既存値は上書きしない。

## トラブルシューティング

### slug 衝突でアップロード失敗

症状: `slug 不一致` エラー（期待 slug とレスポンス slug が異なる）。

対処:

1. WordPress 側で衝突しているメディア / 投稿を解消
1. 必要なら `npm run upload-media -- --force-upload <slug>` で再アップロード
1. 再度 `publish` を実行

### 認証エラー（401/403）

確認ポイント:

- `.env` の `WP_URL`, `WP_USER`, `WP_APP_PASSWORD`
- Application Password の有効性
- Basic 認証を遮断するプラグイン/サーバ設定

### カテゴリ・タグ解決失敗

症状: `カテゴリが見つかりません` / `タグが見つかりません`。

対処: WordPress 側に同 slug を事前作成するか、frontmatter を既存 slug に合わせる。

## サンプル記事

- `posts/sample-article/index.md` は E2E 動作確認用
- frontmatter（`title`, `slug`, `categories`, `tags`, `excerpt`）の最小構成を含む
- 本文は見出し・箇条書き・GFM テーブルの変換確認に使える
- 詳細解説: [posts/sample-article/README.md](posts/sample-article/README.md)

## 対応ブロック

| Markdown 記法         | Gutenberg ブロック             |
| --------------------- | ------------------------------ |
| 段落テキスト          | `core/paragraph`               |
| `# 見出し`            | `core/heading`                 |
| ` ```code``` `        | `core/code`                    |
| GFM テーブル          | `core/table`                   |
| `- リスト`            | `core/list` + `core/list-item` |
| `![alt](path)`        | `core/image`                   |
| `$数式$` / `$$数式$$` | KaTeX ショートコード           |
| 単独行 URL            | `core/embed`                   |
| `<iframe>` 等         | `core/html`                    |
| `:::columns`          | `core/columns` + `core/column` |

詳細仕様は [docs/SPEC.md](docs/SPEC.md) を参照。

## 開発

```bash
npm run fix       # format → lint を一括実行
npm run lint      # チェックのみ
npm run format    # 自動整形のみ
npm test
```

## このプロジェクトについて

本リポジトリのコードおよびドキュメントの大部分は、AI コーディングサービス（[Claude Code](https://claude.ai/code) / Anthropic）を用いて生成されています。作者が内容をレビューしていますが、完全な正確性・安全性を保証するものではありません。本ツールの使用によって生じた損害・損失について、作者はいかなる責任も負いません。

## ライセンス

MIT
