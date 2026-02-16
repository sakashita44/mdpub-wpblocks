/**
 * core/list + core/list-item ブロック変換
 *
 * markdown-it のリストトークン列を再帰的にパースし、
 * ネストされた core/list + core/list-item ブロックに変換する。
 *
 * トークン構造（tight list）:
 *   bullet_list_open → list_item_open → paragraph_open(hidden) → inline
 *   → paragraph_close(hidden) → [子リスト...] → list_item_close → ... → bullet_list_close
 */

import type Token from 'markdown-it/lib/token.mjs';
import type { Block } from '@wordpress/blocks';
import type { TransformDeps, TransformResult } from '../types.js';

/**
 * list_item_open から list_item_close までのトークンをパースし
 * core/list-item ブロックを生成する
 */
function parseListItem(
    tokens: Token[],
    start: number,
    deps: Pick<TransformDeps, 'createBlock' | 'renderInline'>,
): { block: Block; end: number } {
    const { createBlock, renderInline } = deps;
    let i = start;
    const contentParts: string[] = [];
    const innerBlocks: Block[] = [];

    while (i < tokens.length && tokens[i].type !== 'list_item_close') {
        const t = tokens[i];

        if (t.type === 'paragraph_open') {
            // paragraph_open → inline → paragraph_close
            i += 1; // paragraph_open をスキップ
            if (i < tokens.length && tokens[i].type === 'inline') {
                contentParts.push(renderInline(tokens[i].children));
                i += 1;
            }
            if (i < tokens.length && tokens[i].type === 'paragraph_close') {
                i += 1;
            }
        } else if (
            t.type === 'bullet_list_open' ||
            t.type === 'ordered_list_open'
        ) {
            // ネストされたリスト → 再帰的に transformList を呼ぶ
            const result = transformList(tokens, i, deps);
            innerBlocks.push(result.block);
            i += result.consumed;
        } else {
            i += 1;
        }
    }

    // list_item_close をスキップ
    if (i < tokens.length && tokens[i].type === 'list_item_close') {
        i += 1;
    }

    const content = contentParts.join('\n\n');
    const block = createBlock('core/list-item', { content }, innerBlocks);
    return { block, end: i };
}

/**
 * bullet_list_open / ordered_list_open から始まるトークン列を
 * core/list ブロックに変換
 */
export function transformList(
    tokens: Token[],
    startIndex: number,
    deps: Pick<TransformDeps, 'createBlock' | 'renderInline'>,
): TransformResult {
    const { createBlock } = deps;
    const openToken = tokens[startIndex];
    const ordered = openToken.type === 'ordered_list_open';
    const closeType = ordered ? 'ordered_list_close' : 'bullet_list_close';

    const attrs: Record<string, unknown> = { ordered };

    // 順序付きリストの開始番号
    const start = openToken.attrGet?.('start');
    if (start != null && Number(start) !== 1) {
        attrs.start = Number(start);
    }

    let i = startIndex + 1; // list_open をスキップ
    const innerBlocks: Block[] = [];

    while (i < tokens.length && tokens[i].type !== closeType) {
        if (tokens[i].type === 'list_item_open') {
            i += 1; // list_item_open をスキップ
            const result = parseListItem(tokens, i, deps);
            innerBlocks.push(result.block);
            i = result.end;
        } else {
            i += 1;
        }
    }

    // list_close をスキップ
    if (i < tokens.length && tokens[i].type === closeType) {
        i += 1;
    }

    const block = createBlock('core/list', attrs, innerBlocks);
    return { block, consumed: i - startIndex };
}
