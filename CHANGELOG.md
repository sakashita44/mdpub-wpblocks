# Changelog

このプロジェクトの主な変更履歴を記録します。

フォーマットは [Keep a Changelog](https://keepachangelog.com/ja/1.1.0/) を参考にし、
バージョニングは [Semantic Versioning](https://semver.org/lang/ja/) に従います。

## [Unreleased]

### Added

- （未記載）

## [1.0.0] - 2026-02-14

### Added

- Markdown から Gutenberg ブロックへの変換 CLI（`convert`）
- メディア同期 CLI（`upload-media`、`--force-upload` 対応）
- WordPress 下書き投稿 CLI（`publish`）
- E2E 実行 CLI（`pipeline`）
- サーバ状態からレジストリ再生成 CLI（`sync`）
- `--content-root` / `MDPUB_CONTENT_ROOT` / `.mdpub-wpblocks.json` による content root 解決
- 対応ブロック: paragraph / heading / code / table / list / image / embed / html / columns / KaTeX shortcode

### Documentation

- Quick Start / ワークフロー / トラブルシューティングを `README.md` に整備
- 設定ファイルスキーマ、環境変数優先順位、処理フロー図を `docs/SPEC.md` に追記
- `posts/sample-article/` を Git 管理し、サンプル解説を追加
