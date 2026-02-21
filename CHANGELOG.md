# Changelog

このプロジェクトの主な変更履歴を記録します。

フォーマットは [Keep a Changelog](https://keepachangelog.com/ja/1.1.0/) を参考にし、
バージョニングは [Semantic Versioning](https://semver.org/lang/ja/) に従います。

## [Unreleased]

### Added

- `validate-content` コマンド: frontmatter バリデーション CLI (#43)

## [2.0.1] - 2026-02-20

### Fixed

- apiFetch のエラー情報（primary / fallback 両方）を `cause` チェーンで保持するよう修正 (#34)
- `cleanupWpEnv` を `beforeExit` イベントで自動実行し、呼び忘れによるプロセスハングを防止 (#35)

### Documentation

- README に AI 生成プロジェクトである旨と免責事項を追記 (#33)
- v2.0.0 向けドキュメント整備 (#33)

## [2.0.0] - 2026-02-18

### Breaking Changes

- 全ソースを TypeScript（`.ts`）に移行（#22, #31）
- 設定ファイルを `.mdpub-wpblocks.json` / `.registry.yaml` から `.env` / `.mdpub-cache.json` の 2 ファイル構成に変更（#14）
- `WpClient` インターフェースから `listPostsPage` / `listMediaPage` を削除し、`listPlugins` を追加（#14）

### Added

- `sync` コマンド: `GET /wp/v2/plugins` からアクティブプラグイン情報を取得し `.mdpub-cache.json` にキャッシュ（#14）
- プラグイン自動検出: WP plugin slug → mdpub プラグイン名マッピング（`lib/plugins/wp-plugin-map.ts`）
- KaTeX プラグインを WP プラグイン状態で自動検出（手動設定不要）
- `pipeline` の先頭に `sync` ステップを追加

### Changed

- TypeScript 移行に伴い `tsconfig.json` / `tsconfig.build.json` を整備、ESLint を `typescript-eslint` に移行（#22）
- `resolveProjectRoot` を package.json 上方探索方式に変更（`dist/` 配下でも動作）（#22）
- `cleanupWpEnv()` 追加により `npm run` 経由でも正常終了するよう修正（#31）
- `contentRoot` を環境変数 / デフォルト値で解決（設定ファイル不要）（#14）
- `yaml` 依存を削除（#14）

## [1.0.0] - 2026-02-14

### Added

- DOM ポリフィル（happy-dom）+ `@wordpress/blocks` 初期化 (#1, #2)
- Markdown パーサ（markdown-it）+ 基本ブロック変換: paragraph, heading, code (#3, #9)
- テーブル・リスト・画像ブロック変換 (#4, #11)
- 数式（KaTeX ショートコード）・Embed・HTML・カラム変換 (#5, #13)
- メディアアップロード: ステートレス slug 算出、既存判定、`--force-upload` 対応 (#6, #15)
- 記事投稿（publish）: 新規作成・更新判定、カテゴリ/タグ解決、アイキャッチ画像 (#7, #16)
- E2E 統合パイプライン: convert → upload-media → publish を一括実行 (#8, #18)
- サーバ状態からレジストリ再生成 CLI（`sync`）
- `--content-root` / `MDPUB_CONTENT_ROOT` / `.mdpub-wpblocks.json` による content root 解決 (#12)
- `mdpub` CLI エントリポイント（`bin/mdpub.mjs`）と `mdpub init` による雛形生成 (#19, #21)
- 必須環境変数（`WP_URL`, `WP_USER`, `WP_APP_PASSWORD`）未設定時のエラーメッセージ改善
- `@wordpress/env` を使ったローカル一時 WordPress テスト環境 (#23, #25)
- 対応ブロック: paragraph / heading / code / table / list / image / embed / html / columns / KaTeX shortcode

### Documentation

- Quick Start / ワークフロー / トラブルシューティングを `README.md` に整備 (#17, #20)
- 設定ファイルスキーマ、環境変数優先順位、処理フロー図を `docs/SPEC.md` に追記
- `posts/sample-article/` を Git 管理し、サンプル解説を追加

### Fixed

- E2E テストで発見した REST API フォールバック・メディア slug 修正 (#26, #28)
- `extractImagePaths` の二重マッチと全角ファイル名の slug 退化を修正 (#28)
