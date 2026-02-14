/** core/html ブロック変換 */

import type Token from 'markdown-it/lib/token.mjs';
import type { Block } from '@wordpress/blocks';
import type { TransformDeps } from '../types.js';

/** html_block トークンを core/html ブロックに変換 */
export function transformHtml(
    htmlToken: Token,
    { createBlock }: Pick<TransformDeps, 'createBlock'>,
): Block {
    return createBlock('core/html', {
        content: String(htmlToken.content || ''),
    });
}
