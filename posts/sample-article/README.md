# sample-article 解説

`posts/sample-article/index.md` は `npm run pipeline -- sample-article` の動作確認用サンプル記事です。

## このサンプルで確認できること

- frontmatter からの投稿メタデータ解決（`title` / `slug` / `categories` / `tags` / `excerpt`）
- 見出し・箇条書き・GFM テーブルのブロック変換
- `upload-media` と `publish` を含む統合フローの疎通

## frontmatter の意味

| キー         | 用途                                   |
| ------------ | -------------------------------------- |
| `title`      | 投稿タイトル                           |
| `slug`       | 投稿 slug（更新判定キー）              |
| `categories` | カテゴリ slug 配列（投稿時に ID 解決） |
| `tags`       | タグ slug 配列（投稿時に ID 解決）     |
| `excerpt`    | 投稿抜粋                               |

## 対応記法の例

`index.md` の本文には以下の記法が含まれています。

| 記法         | 対応ブロック     |
| ------------ | ---------------- |
| `## 見出し`  | `core/heading`   |
| `- 箇条書き` | `core/list`      |
| GFM テーブル | `core/table`     |
| 段落テキスト | `core/paragraph` |

画像を試す場合は `images/` ディレクトリを作成し、本文に `![alt](images/xxx.jpg "caption")` を追加してください。

## 使い方

```bash
npm run pipeline -- sample-article
```

初回は WordPress 側に `diary` カテゴリと `sample` タグが存在することを確認してください。
