# mdpub-wpblocks

ローカルの Markdown ファイルを Gutenberg ブロックに変換し、WordPress REST API 経由で投稿する CLI ツール。

## 特徴

- `@wordpress/blocks` を使用した正確な Gutenberg ブロック生成
- Frontmatter によるメタデータ管理（タイトル、カテゴリ、タグ等）
- メディアの自動アップロードと URL 置換
- ステートレス設計（ローカルに状態ファイルを持たず、命名規則とサーバ問い合わせで動作）

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

## セットアップ

### 前提条件

- Node.js v20 以上
- WordPress サイト（REST API 有効、アプリケーションパスワード設定済み）

### インストール

```bash
git clone https://github.com/sakashita44/mdpub-wpblocks.git
cd mdpub-wpblocks
npm install
```

### 環境設定

`.env.example` をコピーして `.env` を作成し、WordPress の接続情報を設定する。

```bash
cp .env.example .env
```

```text
WP_URL=https://your-site.com
WP_USER=your-username
WP_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx-xxxx-xxxx
```

### 開発ツール

`npm install` で pre-commit フック（husky）が自動セットアップされる。コミット時に lint-staged が Prettier / ESLint / markdownlint を実行する。

```bash
npm run lint      # ESLint + markdownlint チェック
npm run format    # Prettier + ESLint 自動修正
```

## 使い方

### Markdown → ブロック HTML 変換

```bash
npm run convert -- posts/my-article.md
```

### メディアアップロード

```bash
npm run upload-media -- posts/my-article/
```

### 記事投稿

```bash
npm run publish -- posts/my-article.md
```

### E2E 統合実行

```bash
npm run pipeline -- sample-article
```

### レジストリ再生成

```bash
npm run sync
```

## コンテンツルート設定

`posts/` の配置場所（content root）は以下の優先順位で解決する。

1. CLI 引数 `--content-root`
1. 環境変数 `MDPUB_CONTENT_ROOT`
1. 設定ファイル `.mdpub-wpblocks.json` の `contentRoot`
1. デフォルト `posts`

```json
{
    "contentRoot": "posts"
}
```

## Markdown ファイル形式

記事は `posts/<slug>/index.md` に配置する。

```markdown
---
title: '記事タイトル'
slug: 'article-slug'
categories:
    - diary
tags:
    - tag1
featured_image: 'images/cover.jpg' # 任意
excerpt: '抜粋テキスト...' # 任意
date: '2026-02-10' # 任意
---

本文をここに記述する。
```

詳細な仕様は [docs/SPEC.md](docs/SPEC.md) を参照。

## ディレクトリ構成

```text
mdpub-wpblocks/
├─ lib/
│   ├─ wp-env.mjs              ← DOM ポリフィル + WP Blocks 初期化
│   ├─ md-parser.mjs           ← markdown-it 設定 + AST 生成
│   ├─ block-transforms/       ← AST → createBlock() 変換
│   ├─ inline-format.mjs       ← インライン要素 HTML 変換
│   ├─ wp-client.mjs           ← REST API クライアント
│   └─ media-slug.mjs          ← ローカルパス → WP メディア slug 算出
├─ scripts/
│   ├─ convert.mjs             ← CLI: MD → ブロック HTML
│   ├─ upload-media.mjs        ← CLI: 画像アップロード
│   ├─ publish.mjs             ← CLI: 記事投稿
│   ├─ pipeline.mjs            ← CLI: 統合実行（変換→アップロード→投稿）
│   └─ sync.mjs                ← CLI: .registry.yaml 再生成
├─ posts/                      ← 記事ファイル (.gitignore)
└─ docs/
    ├─ SPEC.md                 ← 技術仕様書
    └─ PROGRESS.md             ← 開発進捗
```

## ライセンス

MIT
