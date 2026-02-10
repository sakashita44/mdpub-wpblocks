# mdpub-wpblocks

Markdown を Gutenberg ブロックに変換し WordPress REST API 経由で投稿する CLI ツール。

## アーキテクチャ

- `lib/wp-env.mjs` — DOM ポリフィル + `@wordpress/blocks` 初期化
- `lib/md-parser.mjs` — markdown-it による AST 生成
- `lib/block-transforms/` — AST ノード → `createBlock()` 変換
- `lib/inline-format.mjs` — インライン要素（bold, italic, link）の HTML 変換
- `lib/wp-client.mjs` — WordPress REST API クライアント
- `lib/registry.mjs` — `.registry.yaml` によるメディア/記事 ID 管理
- `scripts/convert.mjs` — CLI: MD → ブロック HTML
- `scripts/upload-media.mjs` — CLI: 画像アップロード
- `scripts/publish.mjs` — CLI: 記事投稿

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
