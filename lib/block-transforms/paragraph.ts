/** core/paragraph ブロック変換 */

import type Token from 'markdown-it/lib/token.mjs';
import type { Block } from '@wordpress/blocks';
import type { TransformDeps } from '../types.js';

/** inline トークンを core/paragraph ブロックに変換 */
export function transformParagraph(
    inlineToken: Token,
    {
        createBlock,
        renderInline,
    }: Pick<TransformDeps, 'createBlock' | 'renderInline'>,
): Block {
    const content = renderInline(inlineToken.children);
    return createBlock('core/paragraph', { content });
}
