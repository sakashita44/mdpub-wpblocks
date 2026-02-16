/**
 * インラインフォーマッタ
 *
 * markdown-it のインライントークン（inline トークンの .children）を
 * Gutenberg ブロックの content 用 HTML 文字列に変換する。
 */

import type Token from 'markdown-it/lib/token.mjs';
import { escapeHtml } from './html-utils.js';

const INLINE_MATH_PATTERN = /(?<!\\)(?<!\$)\$(?!\$)([^\n$]+?)\$(?!\$)/g;

/** テキスト内の inline math を KaTeX shortcode へ変換 */
function renderTextWithInlineMath(text: string): string {
    let lastIndex = 0;
    const parts: string[] = [];

    // matchAll を使用し、グローバル正規表現の lastIndex ステート共有リスクを回避
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

/** インライントークン配列を HTML 文字列に変換 */
export function renderInline(children: Token[] | null): string {
    if (!children || children.length === 0) return '';

    const parts: string[] = [];

    for (const token of children) {
        switch (token.type) {
            case 'text':
                parts.push(renderTextWithInlineMath(token.content));
                break;
            // html_inline はパススルーする。
            // Markdown の作成者＝ツール利用者自身であり XSS の実害は低い。
            // Gutenberg 側の保存時サニタイズにも委ねる設計判断。
            case 'html_inline':
                parts.push(token.content);
                break;
            case 'strong_open':
                parts.push('<strong>');
                break;
            case 'strong_close':
                parts.push('</strong>');
                break;
            case 'em_open':
                parts.push('<em>');
                break;
            case 'em_close':
                parts.push('</em>');
                break;
            case 'code_inline':
                parts.push(`<code>${escapeHtml(token.content)}</code>`);
                break;
            case 'link_open': {
                const href = token.attrGet('href') || '';
                // 安全なスキームのみ許可（javascript: 等を排除）
                const safeHref = /^(?:https?:|mailto:|tel:|#|\/)/i.test(href)
                    ? href
                    : '';
                parts.push(`<a href="${escapeHtml(safeHref)}">`);
                break;
            }
            case 'link_close':
                parts.push('</a>');
                break;
            case 's_open':
                parts.push('<s>');
                break;
            case 's_close':
                parts.push('</s>');
                break;
            case 'softbreak':
                parts.push('\n');
                break;
            case 'hardbreak':
                parts.push('<br>');
                break;
            default:
                console.warn(
                    `[warn] 未対応インライントークン: ${token.type}（スキップ）`,
                );
                break;
        }
    }

    return parts.join('');
}
