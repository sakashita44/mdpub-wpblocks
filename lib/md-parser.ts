/**
 * Markdown パーサ
 *
 * gray-matter で frontmatter を抽出し、markdown-it で本文をトークン配列に変換する。
 */

import matter from 'gray-matter';
import MarkdownIt from 'markdown-it';
import type { Options } from 'markdown-it';
import type Token from 'markdown-it/lib/token.mjs';
import markdownItContainer from 'markdown-it-container';
import type { Frontmatter } from './types.js';

const md = new MarkdownIt({
    // Issue #5 で html_block / html_inline トークンを処理するための先行設定
    html: true,
} as Options);

// GFM strikethrough（~~text~~）を有効化
md.enable('strikethrough');

md.use(markdownItContainer, 'columns');

/** Markdown 文字列をパースし frontmatter とトークン配列を返す */
export function parseMd(markdownString: string): {
    frontmatter: Frontmatter;
    tokens: Token[];
} {
    const { data: frontmatter, content: body } = matter(markdownString);
    const tokens = md.parse(body, {});
    return { frontmatter: frontmatter as Frontmatter, tokens };
}
