---
title: 'mdpub-wpblocks サンプル記事'
slug: 'sample-article'
categories:
    - uncategorized
tags: []
featured_image: images/dummy.png
excerpt: 'mdpub-wpblocks の対応ブロックを網羅的にデモするサンプル記事'
---

## はじめに

この記事は mdpub-wpblocks の対応ブロックを網羅的にデモするサンプルです。**太字**・_斜体_・~~取り消し線~~・`インラインコード`・[リンク](https://example.com) といったインライン要素を含む段落です。

## 見出しレベル

### 第 3 レベル見出し

#### 第 4 レベル見出し

段落テキストが続きます。

## 箇条書きリスト

- 項目 A
    - ネストされた項目 A-1
    - ネストされた項目 A-2
- 項目 B
- 項目 C

## 番号付きリスト

1. 手順 1
    1. サブ手順 1-1
    1. サブ手順 1-2
1. 手順 2
1. 手順 3

## テーブル

| 言語       | 拡張子 | 用途             |
| ---------- | ------ | ---------------- |
| TypeScript | `.ts`  | アプリケーション |
| Python     | `.py`  | スクリプト       |
| Rust       | `.rs`  | システム         |

## コードブロック

```typescript
function greet(name: string): string {
    return `Hello, ${name}!`;
}
```

## 画像

![サンプル画像](images/dummy.png 'ダミー画像のキャプション')

## 数式

インライン数式: $E = mc^2$ はアインシュタインの質量エネルギー等価式です。

ディスプレイ数式:

$$
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
$$

**注記**: 数式は WordPress に KaTeX プラグインが導入されている環境でのみ `[katex]` ショートコードに変換されます。`npm run sync` 未実行時やプラグイン未導入時は数式記法がそのまま残ります。

## Embed

https://www.youtube.com/watch?v=jNQXAC9IVRw

## HTML ブロック

<div style="padding: 1em; background: #f0f0f0; border-left: 4px solid #333;">
  <p>HTML ブロックとして直接埋め込まれるコンテンツです。</p>
</div>

## カラムレイアウト

:::columns
![カラム画像 1](images/dummy.png '左カラム')

![カラム画像 2](images/dummy.png '右カラム')
:::
