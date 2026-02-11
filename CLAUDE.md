# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

Markdown を Gutenberg ブロックに変換し WordPress REST API 経由で投稿する CLI ツール。

## コマンド

```bash
npm run convert -- posts/my-article/index.md   # MD → ブロック HTML
npm run upload-media -- posts/my-article/       # 画像アップロード
npm run publish -- posts/my-article/index.md    # 記事投稿
```

テストフレームワーク・リンター未導入。

## アーキテクチャ

### パイプライン

```
Markdown → (md-parser) → AST → (block-transforms) → createBlock() → serialize() → HTML
                                                                          ↓
                                               WordPress REST API ← (wp-client) ← publish
```

### モジュール構成

- `lib/wp-env.mjs` — DOM ポリフィル + `@wordpress/blocks` 初期化。**他の全モジュールより先に import する必要がある**
- `lib/md-parser.mjs` — markdown-it による AST 生成
- `lib/block-transforms/` — AST ノード → `createBlock()` 変換
- `lib/inline-format.mjs` — インライン要素（bold, italic, link）の HTML 変換
- `lib/wp-client.mjs` — WordPress REST API クライアント
- `lib/media-slug.mjs` — ローカルパス → WP メディア slug 算出（純粋関数）

### WP パッケージの読み込み制約

`@wordpress/blocks` の ESM 版は Node.js v22+ で `ERR_IMPORT_ATTRIBUTE_MISSING` が発生するため、`createRequire` で CJS 版を使用する。この制約は `lib/wp-env.mjs` に局所化されている。

### ステートレス設計

ローカルに状態ファイル（registry 等）を持たない。メディアの存在確認・記事の新規/更新判定は毎回 `GET /wp/v2/media?slug=` / `GET /wp/v2/posts?slug=` でサーバに問い合わせる。命名規則（`<article-slug>-<filename>` / `shared-<filename>`）により、ローカルパスから WP メディア slug を決定論的に算出する。詳細は `docs/SPEC.md` の「ステートレス設計」セクションを参照。

## 技術スタック

- Node.js (ESM, `"type": "module"`)
- `@wordpress/blocks` + `@wordpress/block-library` — Gutenberg ブロック生成・シリアライズ
- `happy-dom` — DOM ポリフィル（Node.js 環境で WP Blocks を動作させるため）
- `markdown-it` — Markdown パース
- `gray-matter` — Frontmatter パース

## 規約

- コメント・ドキュメントは日本語
- Conventional Commits（日本語メッセージ可）
- ブランチ: `feature/YYYYMM/sakashita44/<issue_num>-<内容>`
