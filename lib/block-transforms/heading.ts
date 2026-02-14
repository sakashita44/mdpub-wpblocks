/** core/heading ブロック変換 */

import type Token from 'markdown-it/lib/token.mjs';
import type { Block } from '@wordpress/blocks';
import type { TransformDeps } from '../types.js';

/** heading_open + inline トークンを core/heading ブロックに変換 */
export function transformHeading(
    openToken: Token,
    inlineToken: Token,
    {
        createBlock,
        renderInline,
    }: Pick<TransformDeps, 'createBlock' | 'renderInline'>,
): Block {
    const content = renderInline(inlineToken.children);
    // openToken.tag は 'h1' 〜 'h6'
    const level = parseInt(openToken.tag.slice(1), 10);
    return createBlock('core/heading', { content, level });
}
