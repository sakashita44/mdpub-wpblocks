/**
 * Markdown パーサ
 *
 * gray-matter で frontmatter を抽出し、markdown-it で本文をトークン配列に変換する。
 */

import matter from 'gray-matter';
import MarkdownIt from 'markdown-it';

const md = new MarkdownIt({
    // Issue #5 で html_block / html_inline トークンを処理するための先行設定
    html: true,
    // GFM strikethrough（~~text~~）を有効化
    strikethrough: true,
});

/**
 * Markdown 文字列をパースし frontmatter とトークン配列を返す
 * @param {string} markdownString - frontmatter 付き Markdown 文字列
 * @returns {{ frontmatter: object, tokens: import('markdown-it').Token[] }}
 */
export function parseMd(markdownString) {
    const { data: frontmatter, content: body } = matter(markdownString);
    const tokens = md.parse(body, {});
    return { frontmatter, tokens };
}
