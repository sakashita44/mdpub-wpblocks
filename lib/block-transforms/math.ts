/** 数式変換 */

import type Token from 'markdown-it/lib/token.mjs';
import type { Block } from '@wordpress/blocks';
import type { TransformDeps } from '../types.js';

const DISPLAY_MATH_PATTERN = /^\$\$([\s\S]*?)\$\$$/;

/** inline トークンが display math 段落かどうか判定し、数式本体を返す */
export function extractDisplayMath(inlineToken: Token): string | null {
    if (!inlineToken) return null;

    const raw = String(inlineToken.content || '').trim();
    const match = raw.match(DISPLAY_MATH_PATTERN);
    if (!match) return null;

    const expr = match[1].trim();
    return expr || null;
}

/** display math を core/shortcode に変換 */
export function transformDisplayMath(
    expr: string,
    { createBlock }: Pick<TransformDeps, 'createBlock'>,
): Block {
    return createBlock('core/shortcode', {
        text: `[katex display=true]${expr}[/katex]`,
    });
}
