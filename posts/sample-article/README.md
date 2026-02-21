# sample-article 解説

`posts/sample-article/index.md` は `npm run pipeline -- sample-article` の動作確認用サンプル記事です。

## このサンプルで確認できること

- frontmatter からの投稿メタデータ解決（`title` / `slug` / `categories` / `tags` / `excerpt` / `featured_image`）
- 対応する全ブロック種別の変換
- 画像アップロードを含む統合フローの疎通

## frontmatter の意味

| キー             | 用途                                         |
| ---------------- | -------------------------------------------- |
| `title`          | 投稿タイトル                                 |
| `slug`           | 投稿 slug（更新判定キー）                    |
| `categories`     | カテゴリ slug 配列（投稿時に ID 解決）       |
| `tags`           | タグ slug 配列（投稿時に ID 解決、空配列可） |
| `excerpt`        | 投稿抜粋                                     |
| `featured_image` | アイキャッチ画像の相対パス                   |

## 対応記法の例

`index.md` の本文には以下の記法が含まれています。

| Markdown 記法                | 対応ブロック                    | 備考                                       |
| ---------------------------- | ------------------------------- | ------------------------------------------ |
| 段落テキスト                 | `core/paragraph`                | 太字・斜体・取り消し線・コード・リンク混在 |
| `## 見出し` 〜 `#### 見出し` | `core/heading`                  | 複数レベル                                 |
| `- item`（ネスト）           | `core/list`                     | 箇条書き                                   |
| `1. item`（ネスト）          | `core/list`                     | 番号付き                                   |
| GFM テーブル                 | `core/table`                    |                                            |
| ` ```lang ``` `              | `core/code`                     |                                            |
| `![alt](path "caption")`     | `core/image`                    |                                            |
| `$E=mc^2$`                   | インライン KaTeX ショートコード | KaTeX プラグイン導入時のみ変換             |
| `$$...$$`                    | `core/shortcode`                | KaTeX プラグイン導入時のみ変換             |
| 単独行 URL                   | `core/embed`                    |                                            |
| `<div>` 等                   | `core/html`                     |                                            |
| `:::columns`                 | `core/columns` + `core/column`  | 画像 ×2 のカラムレイアウト                 |

## 使い方

```bash
npm run pipeline -- sample-article
```

`uncategorized` は WP デフォルトカテゴリとして存在するため、WordPress 側の事前設定は不要です。
