# mdpub-wpblocks

ローカルの Markdown ファイルを Gutenberg ブロックに変換し、WordPress REST API 経由で投稿する CLI ツール。

## 特徴

- `@wordpress/blocks` を使用した正確な Gutenberg ブロック生成
- Frontmatter によるメタデータ管理（タイトル、カテゴリ、タグ等）
- メディアの自動アップロードと URL 置換
- `.registry.yaml` による投稿・メディアの状態管理（新規/更新の自動判定）

## 対応ブロック

| Markdown 記法 | Gutenberg ブロック |
|--------------|-------------------|
| 段落テキスト | `core/paragraph` |
| `# 見出し` | `core/heading` |
| ` ```code``` ` | `core/code` |
| GFM テーブル | `core/table` |
| `- リスト` | `core/list` + `core/list-item` |
| `![alt](path)` | `core/image` |
| `$数式$` / `$$数式$$` | KaTeX ショートコード |
| 単独行 URL | `core/embed` |
| `<iframe>` 等 | `core/html` |
| `:::columns` | `core/columns` + `core/column` |

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

```
WP_URL=https://your-site.com
WP_USER=your-username
WP_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx-xxxx-xxxx
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

## Markdown ファイル形式

```markdown
---
title: 記事タイトル
categories:
  - カテゴリ名
tags:
  - タグ名
status: draft
---

本文をここに記述する。
```

## ディレクトリ構成

```
mdpub-wpblocks/
├─ lib/
│   ├─ wp-env.mjs              ← DOM ポリフィル + WP Blocks 初期化
│   ├─ md-parser.mjs           ← markdown-it 設定 + AST 生成
│   ├─ block-transforms/       ← AST → createBlock() 変換
│   ├─ inline-format.mjs       ← インライン要素 HTML 変換
│   ├─ wp-client.mjs           ← REST API クライアント
│   └─ registry.mjs            ← .registry.yaml 読み書き
├─ scripts/
│   ├─ convert.mjs             ← CLI: MD → ブロック HTML
│   ├─ upload-media.mjs        ← CLI: 画像アップロード
│   └─ publish.mjs             ← CLI: 記事投稿
├─ posts/                      ← 記事ファイル (.gitignore)
└─ docs/
    └─ PROGRESS.md             ← 開発進捗
```

## ライセンス

MIT
