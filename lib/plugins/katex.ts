/**
 * KaTeX プラグイン
 *
 * インライン数式（$...$）→ [katex]...[/katex] ショートコード
 * ディスプレイ数式（$$...$$）→ core/shortcode ブロック
 */

import type Token from 'markdown-it/lib/token.mjs';
import type { Block } from '@wordpress/blocks';
import type { TransformDeps } from '../types.js';
import { escapeHtml } from '../html-utils.js';

export const INLINE_MATH_PATTERN = /(?<!\\)(?<!\$)\$(?!\$)([^\n$]+?)\$(?!\$)/g;

export const DISPLAY_MATH_PATTERN = /^\$\$([\s\S]*?)\$\$$/;

/** テキスト内のインライン数式を KaTeX ショートコードへ変換 */
export function renderTextWithInlineMath(text: string): string {
    let lastIndex = 0;
    const parts: string[] = [];

    for (const match of text.matchAll(INLINE_MATH_PATTERN)) {
        const before = text
            .slice(lastIndex, match.index)
            .replaceAll('\\$', '$');
        if (before) {
            parts.push(escapeHtml(before));
        }

        const expr = match[1].trim();
        if (expr) {
            parts.push(`[katex]${expr}[/katex]`);
        }

        lastIndex = (match.index ?? 0) + match[0].length;
    }

    const tail = text.slice(lastIndex).replaceAll('\\$', '$');
    if (tail) {
        parts.push(escapeHtml(tail));
    }

    return parts.join('');
}

/** inline トークンがディスプレイ数式段落かどうか判定し、数式本体を返す */
export function extractDisplayMath(inlineToken: Token): string | null {
    if (!inlineToken) return null;

    const raw = String(inlineToken.content || '').trim();
    const match = raw.match(DISPLAY_MATH_PATTERN);
    if (!match) return null;

    const expr = match[1].trim();
    return expr || null;
}

/** ディスプレイ数式を core/shortcode に変換 */
export function transformDisplayMath(
    expr: string,
    { createBlock }: Pick<TransformDeps, 'createBlock'>,
): Block {
    return createBlock('core/shortcode', {
        text: `[katex display=true]${expr}[/katex]`,
    });
}
