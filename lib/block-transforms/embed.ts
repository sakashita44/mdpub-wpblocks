/** core/embed ブロック変換 */

import type Token from 'markdown-it/lib/token.mjs';
import type { Block } from '@wordpress/blocks';
import type { TransformDeps } from '../types.js';

const STANDALONE_URL_PATTERN = /^https?:\/\/[^\s<]+$/i;

/** inline トークンが単独 URL 段落か判定し URL を返す */
export function extractStandaloneUrl(inlineToken: Token): string | null {
    if (!inlineToken) return null;

    const raw = String(inlineToken.content || '').trim();
    if (!STANDALONE_URL_PATTERN.test(raw)) return null;
    return raw;
}

/** URL を core/embed ブロックに変換 */
export function transformEmbed(
    url: string,
    { createBlock }: Pick<TransformDeps, 'createBlock'>,
): Block {
    return createBlock('core/embed', { url });
}
