# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

Markdown を Gutenberg ブロックに変換し WordPress REST API 経由で投稿する CLI ツール。

## コマンド

スクリプトは `dist/` 配下の JS を実行するため、**変更後は必ず `npm run build` を実行すること**。

```bash
npm run build                          # TypeScript → dist/ トランスパイル

npm run sync                           # WP プラグイン情報を取得 → .mdpub-cache.json に保存
npm run convert -- posts/my-article/index.md   # MD → ブロック HTML（stdout）
npm run upload-media -- posts/my-article/      # 画像アップロード
npm run publish -- posts/my-article/index.md   # 記事投稿（新規作成 or 更新）
npm run pipeline -- posts/my-article/          # sync → convert → upload-media → publish を一括実行
```

```bash
npm run fix       # format → lint を一括実行（推奨）
npm run lint      # ESLint + markdownlint チェックのみ
npm run format    # Prettier + ESLint 自動修正のみ
npm test          # 全テスト実行
npm test -- <pattern>   # パターンに一致するテストのみ実行（例: "paragraph", "test/block-transforms/table.test.ts"）
```

Prettier + ESLint + markdownlint を pre-commit フック（husky + lint-staged）で自動実行。

## アーキテクチャ

### パイプライン

```text
Markdown → (md-parser) → AST → (block-transforms) → createBlock() → serialize() → HTML
                                                                          ↓
                                               WordPress REST API ← (wp-client) ← publish
```

### モジュール構成

- `lib/wp-env.ts` — DOM ポリフィル + `@wordpress/blocks` 初期化。**他の全モジュールより先に import する必要がある**
- `lib/md-parser.ts` — markdown-it による AST 生成 + gray-matter でフロントマター抽出
- `lib/block-transforms/index.ts` — トークン配列を走査してブロック変換を振り分けるディスパッチャ
- `lib/block-transforms/*.ts` — 各ブロック種別の変換ロジック（paragraph, heading, code, table, list, image, embed, html, columns）
- `lib/inline-format.ts` — インライン要素（bold, italic, link）の HTML 変換
- `lib/plugins/` — KaTeX 等プラグイン固有の変換ロジック。`config.ts` が `.mdpub-cache.json` からアクティブプラグイン一覧を読み込む
- `lib/wp-client.ts` — WordPress REST API クライアント（Basic 認証）
- `lib/media-slug.ts` — ローカルパス → WP メディア slug 算出（純粋関数）
- `lib/publish-utils.ts` — フロントマター検証、画像 URL 置換、投稿ペイロード構築
- `lib/cli-config.ts` — CLI 引数パース + コンテンツルートパス解決
- `lib/env.ts` — `.env` ファイル読み込み（`initEnv()` を他に先駆けて呼ぶ）
- `lib/types.ts` — 共通型定義（`TransformDeps`, `WpClient`, `Frontmatter` 等）

### ビルド

`tsc -p tsconfig.build.json` で `dist/` にトランスパイル。スクリプト・CLI は `dist/` 配下の `.js` を実行する。

### WP パッケージの読み込み制約

`@wordpress/blocks` の ESM 版は Node.js v22+ で `ERR_IMPORT_ATTRIBUTE_MISSING` が発生するため、`createRequire` で CJS 版を使用する。この制約は `lib/wp-env.ts` に局所化されている。

### ステートレス設計

ローカルに状態ファイル（registry 等）を持たない。メディアの存在確認・記事の新規/更新判定は毎回 `GET /wp/v2/media?slug=` / `GET /wp/v2/posts?slug=` でサーバに問い合わせる。命名規則（`<article-slug>-<filename>` / `shared-<filename>`）により、ローカルパスから WP メディア slug を決定論的に算出する。詳細は `docs/SPEC.md` の「ステートレス設計」セクションを参照。

### トークンディスパッチャとブロック追加手順

`lib/block-transforms/index.ts` はトークン配列を線形走査し、opening トークンにマッチしたら対応 transformer を呼ぶ。各 transformer は `(token, deps: TransformDeps)` を受け取り、消費したトークン数を返す（`i += consumed`）。新しいブロック種別を追加する場合：

1. `lib/block-transforms/<name>.ts` を作成し `transformX(token, deps)` をエクスポート
1. `lib/block-transforms/index.ts` の switch 文に case を追加
1. `test/block-transforms/<name>.test.ts` でテストを追加

### プラグインシステム

`npm run sync` が WordPress から取得したプラグイン情報を `.mdpub-cache.json` に保存する。変換実行時に `loadPlugins()` でファイルを読み込み、`plugins.has('katex')` のように条件分岐する。sync 未実行時はプラグイン機能が無効になる（エラーにはならない）。

## テスト

`test/setup.ts` が vitest グローバルセットアップとして `lib/wp-env.ts` をインポートするため、テスト内で wp-env を明示 import する必要はない。`test/helpers/mock-token.ts` がモックトークン生成ヘルパーを提供する。

## 技術スタック

- TypeScript（`tsc` → `dist/` トランスパイル、`strict: true`）
- Node.js (ESM, `"type": "module"`)
- `@wordpress/blocks` + `@wordpress/block-library` — Gutenberg ブロック生成・シリアライズ
- `happy-dom` — DOM ポリフィル（Node.js 環境で WP Blocks を動作させるため）
- `markdown-it` — Markdown パース
- `gray-matter` — Frontmatter パース
- `vitest` — テストフレームワーク

## 注意事項

- ルートの `CHANGELOG.md` を Glob で検索する際は `node_modules/` の大量ファイルで結果が打ち切られるため、`Bash: ls CHANGELOG.md` か Grep で存在確認すること。

## 規約

- コメント・ドキュメントは日本語
- Conventional Commits（日本語メッセージ可）
- ブランチ: `feature/YYYYMM/sakashita44/<issue_num>-<内容>`
