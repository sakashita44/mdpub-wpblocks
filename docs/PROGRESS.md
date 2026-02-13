# 進捗管理

## Issue 一覧と依存関係

```text
#1 DOM環境 + WP Blocks 初期化 ✅
├── #3 MD パーサ + 基本ブロック (paragraph, heading, code)
│   ├── #4 テーブル、リスト、画像ブロック
│   ├── #5 数式、Embed、HTML、カラム ✅
│   └── #7 記事投稿 ──┐
└── #6 メディアアップロード ─┘──→ #8 E2E 統合 ✅

#17 docs: ドキュメント整備 🚧
└──→ v1.0.0 リリース準備
```

| Issue | タイトル                            | 状態     | blocked by     | ブランチ                                             |
| ----- | ----------------------------------- | -------- | -------------- | ---------------------------------------------------- |
| #1    | DOM 環境 + @wordpress/blocks 初期化 | ✅ done  | -              | - (merged)                                           |
| #3    | MD パーサ + 基本ブロック変換        | ✅ done  | #1 ✅          | - (merged)                                           |
| #4    | テーブル・リスト・画像ブロック変換  | ✅ done  | #3             | feature/202602/sakashita44/4-table-list-image-blocks |
| #5    | 数式・Embed・HTML・カラム変換       | ✅ done  | #3             | feature/202602/sakashita44/5-math-embed-html-columns |
| #6    | メディアアップロード                | ✅ done  | #1 ✅          | feature/202602/sakashita44/6-media-upload            |
| #7    | 記事投稿 (publish)                  | ✅ done  | #3, #6         | feature/202602/sakashita44/7-article-publish         |
| #8    | E2E 統合・CLI 仕上げ                | ✅ done  | #4, #5, #6, #7 | feature/202602/sakashita44/8-e2e-cli-finish          |
| #17   | docs: ドキュメント整備              | 🚧 doing | #8             | - (current)                                          |

## 着手可能な Issue

- #17 docs: ドキュメント整備（実施中）

## リリースロードマップ

### v1.0.0 まで（安定版リリース）

- [ ] #17 ドキュメント整備完了
    - [ ] `README.md` の Quick Start / ワークフロー例 / トラブルシューティング拡充
    - [ ] `docs/SPEC.md` と実装の差分解消
    - [ ] `.mdpub-wpblocks.json` と環境変数優先順位の明文化
    - [ ] `posts/sample-article/` の解説追記
    - [ ] アーキテクチャ図（Mermaid）追加
- [ ] `npm run lint` / `npm test` を main でグリーン維持
- [ ] `v1.0.0` タグ付け・リリースノート整備
- [ ] #19 feat: CLI bin化と init 導入（小さめ機能追加）

### v1.0.1 以降

- [ ] #14 refactor: プラグイン依存処理の分離（内部整理）
- [ ] #10 test: md-parser / block-transforms 統合テスト追加（品質強化）

### 将来の方向性

- 変換対応や公開ワークフロー改善は、必要が明確になった時点で Issue 化してから着手
- 候補リスト（未Issue・参考メモ）
    - 変換対応の拡張（例: 脚注・定義リスト、カスタムブロックマッピング）
    - 公開ワークフロー改善（例: dry-run / 差分プレビュー、再公開時の更新戦略）
    - 品質・運用強化（例: CI 自動化、E2E シナリオ拡充）
    - 開発者体験向上（例: 設定バリデーション、CLI ヘルプ/エラー案内改善）

## 技術判断メモ

- **DOM ポリフィル**: happy-dom を採用。`@wordpress/blocks` は CJS 版を `createRequire` で読み込み（ESM 版は Node.js v22+ で JSON import attribute エラー）
- **ESM**: プロジェクト全体は `"type": "module"`。WP パッケージのみ CJS
- **core/list**: 要件定義の「使用 Gutenberg ブロック」リストに未記載だが「対応記法」にリスト記載あり。必要なため実装に含める
- **markdown-it 数式**: `markdown-it-texmath` またはカスタムルールで `$`/`$$` パース
