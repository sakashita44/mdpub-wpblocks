# 進捗管理

## Issue 一覧と依存関係

```text
#1 DOM環境 + WP Blocks 初期化 ✅
├── #3 MD パーサ + 基本ブロック (paragraph, heading, code)
│   ├── #4 テーブル、リスト、画像ブロック
│   ├── #5 数式、Embed、HTML、カラム
│   └── #7 記事投稿 ──┐
└── #6 メディアアップロード ─┘──→ #8 E2E 統合
```

| Issue | タイトル                            | 状態    | blocked by     | ブランチ                                             |
| ----- | ----------------------------------- | ------- | -------------- | ---------------------------------------------------- |
| #1    | DOM 環境 + @wordpress/blocks 初期化 | ✅ done | -              | - (merged)                                           |
| #3    | MD パーサ + 基本ブロック変換        | ✅ done | #1 ✅          | - (merged)                                           |
| #4    | テーブル・リスト・画像ブロック変換  | ✅ done | #3             | feature/202602/sakashita44/4-table-list-image-blocks |
| #5    | 数式・Embed・HTML・カラム変換       | 🔲 open | #3             | -                                                    |
| #6    | メディアアップロード                | 🔲 open | #1 ✅          | -                                                    |
| #7    | 記事投稿 (publish)                  | 🔲 open | #3, #6         | -                                                    |
| #8    | E2E 統合・CLI 仕上げ                | 🔲 open | #4, #5, #6, #7 | -                                                    |

## 着手可能な Issue

- **#5** 数式・Embed・HTML・カラム変換（#3 依存解消済み）
- **#6** メディアアップロード（依存解消済み、#5 と並行可能）

## 技術判断メモ

- **DOM ポリフィル**: happy-dom を採用。`@wordpress/blocks` は CJS 版を `createRequire` で読み込み（ESM 版は Node.js v22+ で JSON import attribute エラー）
- **ESM**: プロジェクト全体は `"type": "module"`。WP パッケージのみ CJS
- **core/list**: 要件定義の「使用 Gutenberg ブロック」リストに未記載だが「対応記法」にリスト記載あり。必要なため実装に含める
- **markdown-it 数式**: `markdown-it-texmath` またはカスタムルールで `$`/`$$` パース
