# 技術仕様書

実装仕様。各 Issue の実装時に参照する。

## 前提条件

| 項目           | 内容                                          |
| -------------- | --------------------------------------------- |
| テーマ         | FSE ブロックテーマ                            |
| REST API       | Application Password 認証                     |
| 必須プラグイン | KaTeX（数式レンダリング、ショートコード対応） |
| 任意プラグイン | Syntax Highlighting Code Block（Prism.js）    |

## 記事ディレクトリ規約

```
posts/
├─ <article-slug>/
│   ├─ index.md             ← frontmatter + 本文
│   └─ images/
│       └─ *.jpg / *.png
├─ shared/                  ← 記事横断の共通リソース
│   └─ logo.png
└─ .registry.yaml           ← slug→post_id, メディア ID 管理
```

- 各記事は `posts/<slug>/` ディレクトリに `index.md` として配置
- 画像は同ディレクトリ内の `images/` に格納
- 共通リソース（汎用フリー画像等）は `posts/shared/` に配置し、各記事から `../shared/logo.png` のように相対パスで参照

## Frontmatter 仕様

```yaml
---
title: "記事タイトル"
slug: "article-slug"
categories:
  - diary
tags:
  - tag1
featured_image: "images/cover.jpg"   # 任意
excerpt: "抜粋テキスト..."            # 任意
date: "2026-02-10"                   # 任意（未指定なら投稿時の日時）
---
```

| フィールド       | 型       | 必須 | 説明                                       |
| ---------------- | -------- | ---- | ------------------------------------------ |
| `title`          | string   | ○    | 記事タイトル                               |
| `slug`           | string   | ○    | URL スラッグ（ディレクトリ名と一致させる） |
| `categories`     | string[] | ○    | カテゴリ slug の配列                       |
| `tags`           | string[] |      | タグ slug の配列                           |
| `featured_image` | string   |      | アイキャッチ画像の相対パス                 |
| `excerpt`        | string   |      | 抜粋テキスト                               |
| `date`           | string   |      | 投稿日（ISO 8601、未指定なら投稿時の日時） |


## Markdown 対応記法と変換ルール

### 基本ブロック（Issue #3）

| Markdown                      | Gutenberg ブロック | 変換仕様                                          |
| ----------------------------- | ------------------ | ------------------------------------------------- |
| 段落テキスト                  | `core/paragraph`   | `{ content: "<inline HTML>" }`                    |
| `# 見出し` 〜 `###### 見出し` | `core/heading`     | `{ content: "<inline HTML>", level: 1-6 }`        |
| ` ```lang ... ``` `           | `core/code`        | `{ content: "<escaped code>", language: "lang" }` |

#### インライン要素

paragraph / heading の `content` 内で以下のインライン要素を HTML に変換する。

| Markdown      | HTML                     |
| ------------- | ------------------------ |
| `**bold**`    | `<strong>bold</strong>`  |
| `*italic*`    | `<em>italic</em>`        |
| `` `code` ``  | `<code>code</code>`      |
| `[text](url)` | `<a href="url">text</a>` |
| `~~strike~~`  | `<s>strike</s>`          |

### テーブル・リスト・画像（Issue #4）

#### テーブル

GFM テーブル → `core/table`

```markdown
| Header 1 | Header 2 |
| -------- | -------- |
| Cell 1   | Cell 2   |
```

#### リスト

`- item` / `1. item` → `core/list` + `core/list-item`（ネスト対応）

#### 画像

`![alt](path "caption")` → `core/image`

- `path`: ローカル相対パス（`images/photo.jpg` や `../shared/logo.png`）
- `"caption"`: Markdown の title 位置をキャプションとして使用
- デフォルト属性:

| 属性       | 値                     |
| ---------- | ---------------------- |
| `sizeSlug` | `medium`               |
| `align`    | `center`               |
| `lightbox` | `true`（全画像で有効） |

画像パスは変換時点ではローカルパスのまま。メディア URL への置換は投稿時（Issue #7）に実施。

### 数式・Embed・HTML・カラム（Issue #5）

#### 数式（KaTeX）

| 記法                  | 変換先                                        | 配置                                |
| --------------------- | --------------------------------------------- | ----------------------------------- |
| `$E=mc^2$`            | `[katex]E=mc^2[/katex]`                       | `core/paragraph` 内にインライン配置 |
| `$$\int_0^1 f(x)dx$$` | `[katex display=true]\int_0^1 f(x)dx[/katex]` | `core/shortcode` ブロック           |

#### Embed（oEmbed）

単独行の URL → `core/embed`

```markdown
https://www.youtube.com/watch?v=xxxxx
```

- URL 属性のみの最小構成
- プロバイダ判定は WP 側に委譲（ドメイン→providerNameSlug 変換は自前実装しない）

#### HTML パススルー

`<iframe>` 等の HTML タグ → `core/html`

```markdown
<iframe src="https://example.com/embed" width="640" height="480"></iframe>
```

- タグをそのまま `core/html` ブロックの content に格納

#### カラム（columns）

`:::columns` directive → `core/columns` + `core/column`

```markdown
:::columns
![alt1](images/a.jpg "キャプション1")
![alt2](images/b.jpg "キャプション2")
:::
```

- `markdown-it-container` プラグインで `:::columns` をパース
- 内部の各画像を個別の `core/column` に配置

## メディアアップロード仕様（Issue #6）

### API

| 操作         | エンドポイント                       | 用途                       |
| ------------ | ------------------------------------ | -------------------------- |
| 同名検索     | `GET /wp/v2/media?search=<filename>` | 既存メディアの重複チェック |
| アップロード | `POST /wp/v2/media`                  | 画像を 1 枚ずつ送信        |

### フロー

1. MD 本文中の画像参照（`images/` 内および `../shared/` 内）を走査し、ローカル相対パスを解決
2. ファイル名で WP メディアライブラリを検索
3. 同名ファイルが既存なら既存メディア ID を再利用（スキップ）、未登録ならアップロード
4. スキップ・アップロードの結果をログ出力
5. 取得したメディア ID・URL を `.registry.yaml` に記録

### 同名画像の衝突ポリシー

- デフォルト: 同名ファイルが既存の場合スキップ（既存メディア ID を再利用）
- `--force-upload` オプションで強制再アップロード
- ハッシュ比較は行わない（ファイル名一致 = 同一画像とみなす）

## 記事投稿仕様（Issue #7）

### API

| 操作     | エンドポイント          |
| -------- | ----------------------- |
| 新規投稿 | `POST /wp/v2/posts`     |
| 更新     | `PUT /wp/v2/posts/<id>` |

### Frontmatter → API フィールドマッピング

| frontmatter      | API フィールド   | 変換                                                  |
| ---------------- | ---------------- | ----------------------------------------------------- |
| `title`          | `title`          | そのまま                                              |
| `slug`           | `slug`           | そのまま                                              |
| `categories`     | `categories`     | slug → ID 解決（`GET /wp/v2/categories?slug=<slug>`） |
| `tags`           | `tags`           | slug → ID 解決（`GET /wp/v2/tags?slug=<slug>`）       |
| `featured_image` | `featured_media` | メディア ID に解決                                    |
| `excerpt`        | `excerpt`        | そのまま                                              |
| `date`           | `date`           | ISO 8601 形式                                         |
| （本文）         | `content`        | serialize() の出力（ブロック HTML）                   |

### 投稿ステータス

- 常に `status: "draft"` で投稿
- 公開は WP 管理画面から手動で行う

### 新規/更新判定

- `.registry.yaml` の slug→post_id マッピングで判定
- post_id が存在すれば `PUT`（更新）、なければ `POST`（新規）

### 画像 URL 置換

投稿時に、ブロック HTML 内のローカル画像パスを `.registry.yaml` から取得したメディア URL に置換する。

## .registry.yaml 仕様

`posts/.registry.yaml` に配置。メディア ID と記事 ID を管理する。

```yaml
posts:
  article-slug:
    post_id: 123
    media:
      images/photo.jpg:
        id: 456
        url: "https://example.com/wp-content/uploads/2026/02/photo.jpg"
      ../shared/logo.png:
        id: 789
        url: "https://example.com/wp-content/uploads/2026/02/logo.png"

shared:
  logo.png:
    id: 789
    url: "https://example.com/wp-content/uploads/2026/02/logo.png"
```

- `posts.<slug>.post_id`: 記事の WordPress 投稿 ID
- `posts.<slug>.media.<path>`: 記事固有画像のメディア情報
- `shared.<filename>`: 共通リソースのメディア情報

## 認証

`.env` ファイルで管理（`.env.example` 参照）。

REST API リクエストは Basic 認証（`Authorization: Basic base64(user:app_password)`）を使用する。
