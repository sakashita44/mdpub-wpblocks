/** core/columns + core/column ブロック変換 */

import type Token from 'markdown-it/lib/token.mjs';
import type { TransformDeps, TransformResult } from '../types.js';

import { isImageOnly, transformImageToken } from './image.js';

/**
 * container_columns_open ... container_columns_close を
 * core/columns + core/column に変換
 *
 * 仕様: 内部の各画像を個別の core/column に配置する
 */
export function transformColumns(
    tokens: Token[],
    startIndex: number,
    deps: Pick<TransformDeps, 'createBlock'>,
): TransformResult {
    const { createBlock } = deps;
    const innerBlocks = [];
    let i = startIndex + 1;

    while (i < tokens.length && tokens[i].type !== 'container_columns_close') {
        const t = tokens[i];

        if (t.type === 'paragraph_open') {
            const inlineToken = tokens[i + 1];
            if (
                inlineToken?.type === 'inline' &&
                isImageOnly(inlineToken.children)
            ) {
                const imageTokens = (inlineToken.children ?? []).filter(
                    (child: Token) => child.type === 'image',
                );

                for (const imageToken of imageTokens) {
                    const imageBlock = transformImageToken(imageToken, deps);
                    innerBlocks.push(
                        createBlock('core/column', {}, [imageBlock]),
                    );
                }
            } else {
                console.warn('[warn] columns 内の非画像段落をスキップしました');
            }

            // paragraph_open + inline + paragraph_close の 3 トークンを消費
            i += 3;
            continue;
        }

        console.warn(`[warn] columns 内の未対応トークンをスキップ: ${t.type}`);

        i += 1;
    }

    if (i < tokens.length && tokens[i].type === 'container_columns_close') {
        i += 1;
    }

    const block = createBlock('core/columns', {}, innerBlocks);
    return { block, consumed: i - startIndex };
}
