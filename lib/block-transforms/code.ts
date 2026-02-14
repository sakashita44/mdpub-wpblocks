/** core/code ブロック変換 */

import type Token from 'markdown-it/lib/token.mjs';
import type { Block } from '@wordpress/blocks';
import type { TransformDeps } from '../types.js';

import { escapeHtml } from '../html-utils.js';

/** fence トークンを core/code ブロックに変換 */
export function transformCode(
    fenceToken: Token,
    { createBlock }: Pick<TransformDeps, 'createBlock'>,
): Block {
    // fence の content は末尾に改行が付くため除去
    const content = escapeHtml(fenceToken.content.replace(/\n$/, ''));
    const language = fenceToken.info.trim();

    const attrs: Record<string, string> = { content };

    // 言語指定があれば className に設定（Syntax Highlighting Code Block プラグイン対応）
    if (language) {
        attrs.className = `language-${language}`;
    }

    return createBlock('core/code', attrs);
}
