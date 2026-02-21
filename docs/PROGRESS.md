# 進捗管理

## Issue 一覧と依存関係

```text
#1 DOM環境 + WP Blocks 初期化 ✅
├── #3 MD パーサ + 基本ブロック (paragraph, heading, code)
│   ├── #4 テーブル、リスト、画像ブロック
│   ├── #5 数式、Embed、HTML、カラム ✅
│   └── #7 記事投稿 ──┐
└── #6 メディアアップロード ─┘──→ #8 E2E 統合 ✅

#17 docs: ドキュメント整備 ✅
└──→ #19 CLI bin化と init 導入 ✅
  └──→ v1.0.0

#14 プラグイン自動検出・TypeScript 化 ✅
#36 dotenv 導入 ✅
  └──→ v2.0.0

#27 content lint
└── #43 frontmatter バリデーション CLI ✅
```

| Issue | タイトル                            | 状態    | blocked by     | ブランチ                                             |
| ----- | ----------------------------------- | ------- | -------------- | ---------------------------------------------------- |
| #1    | DOM 環境 + @wordpress/blocks 初期化 | ✅ done | -              | - (merged)                                           |
| #3    | MD パーサ + 基本ブロック変換        | ✅ done | #1 ✅          | - (merged)                                           |
| #4    | テーブル・リスト・画像ブロック変換  | ✅ done | #3             | feature/202602/sakashita44/4-table-list-image-blocks |
| #5    | 数式・Embed・HTML・カラム変換       | ✅ done | #3             | feature/202602/sakashita44/5-math-embed-html-columns |
| #6    | メディアアップロード                | ✅ done | #1 ✅          | feature/202602/sakashita44/6-media-upload            |
| #7    | 記事投稿 (publish)                  | ✅ done | #3, #6         | feature/202602/sakashita44/7-article-publish         |
| #8    | E2E 統合・CLI 仕上げ                | ✅ done | #4, #5, #6, #7 | feature/202602/sakashita44/8-e2e-cli-finish          |
| #17   | docs: ドキュメント整備              | ✅ done | #8             | issue17-docs                                         |
| #19   | feat: CLI bin化と init 導入         | ✅ done | #17            | feature/202602/sakashita44/19-cli-bin-init           |
| #14   | プラグイン自動検出・TypeScript 化   | ✅ done | #19            | feature/202602/sakashita44/14-plugin-detect-ts       |
| #36   | dotenv 導入                         | ✅ done | #14            | feature/202602/sakashita44/36-dotenv-replace         |
| #43   | frontmatter バリデーション CLI      | ✅ done | -              | feat/202602/sakashita44/43-validate-frontmatter      |

## 着手可能な Issue

- （なし）

## リリースロードマップ

### v1.0.0（安定版リリース）

- [x] #17 ドキュメント整備完了
- [x] #19 CLI bin化と init 導入
- [x] `npm run fix` / `npm test` を main でグリーン維持
- [x] `v1.0.0` タグ付け・リリースノート整備

### v2.0.0（プラグイン自動検出・TypeScript 化）

- [x] #14 refactor: プラグイン自動検出・TypeScript 化
- [x] #36 refactor: dotenv 導入

### v2.0.1（バグ修正・ドキュメント）

- [x] #34 fix: apiFetch のエラー情報を cause チェーンで保持
- [x] #35 fix: cleanupWpEnv を beforeExit で自動実行
- [x] #33 docs: v2.0.0 ドキュメント整備・免責事項追記

### 将来

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
