import { describe, it, expect } from 'vitest';
import type Token from 'markdown-it/lib/token.mjs';
import { createBlock } from '../../lib/wp-env.js';
import { renderInline } from '../../lib/inline-format.js';
import { parseMd } from '../../lib/md-parser.js';
import { transformTokens } from '../../lib/block-transforms/index.js';
import { transformList } from '../../lib/block-transforms/list.js';
import {
    mockToken,
    mockTextToken,
    mockInlineToken,
} from '../helpers/mock-token.js';

const noPlugins = new Set<string>();
const deps = {
    createBlock,
    renderInline: (children: Token[] | null) =>
        renderInline(children, noPlugins),
};

/** inline トークンを生成 */
function fakeInline(text: string) {
    return mockInlineToken([mockTextToken(text)]);
}

/**
 * フラットなリストトークン列を生成（ネストなし）
 * @param {'bullet'|'ordered'} type
 * @param {string[]} items
 * @param {number} [start] - ordered list の開始番号
 */
function fakeListTokens(
    type: string,
    items: string[],
    start?: number,
): Token[] {
    const openType = `${type}_list_open`;
    const closeType = `${type}_list_close`;
    const tokens: Token[] = [];

    const openAttrs: [string, string][] | null =
        type === 'ordered' && start != null ? [['start', String(start)]] : null;
    tokens.push(mockToken({ type: openType, attrs: openAttrs }));

    for (const item of items) {
        tokens.push(mockToken({ type: 'list_item_open' }));
        tokens.push(mockToken({ type: 'paragraph_open', hidden: true }));
        tokens.push(fakeInline(item));
        tokens.push(mockToken({ type: 'paragraph_close', hidden: true }));
        tokens.push(mockToken({ type: 'list_item_close' }));
    }

    tokens.push(mockToken({ type: closeType }));
    return tokens;
}

describe('transformList', () => {
    it('箇条書きリストを変換', () => {
        const tokens = fakeListTokens('bullet', ['item1', 'item2']);
        const { block, consumed } = transformList(tokens, 0, deps);

        expect(block.name).toBe('core/list');
        expect(block.attributes.ordered).toBe(false);
        expect(block.innerBlocks).toHaveLength(2);
        expect(block.innerBlocks[0].name).toBe('core/list-item');
        expect(String(block.innerBlocks[0].attributes.content)).toBe('item1');
        expect(String(block.innerBlocks[1].attributes.content)).toBe('item2');
        expect(consumed).toBe(tokens.length);
    });

    it('順序付きリストを変換', () => {
        const tokens = fakeListTokens('ordered', ['first', 'second']);
        const { block } = transformList(tokens, 0, deps);

        expect(block.name).toBe('core/list');
        expect(block.attributes.ordered).toBe(true);
    });

    it('開始番号が 1 以外の順序付きリスト', () => {
        const tokens = fakeListTokens('ordered', ['third', 'fourth'], 3);
        const { block } = transformList(tokens, 0, deps);

        expect(block.attributes.ordered).toBe(true);
        expect(block.attributes.start).toBe(3);
    });

    it('開始番号が 1 の場合は start を設定しない', () => {
        const tokens = fakeListTokens('ordered', ['first'], 1);
        const { block } = transformList(tokens, 0, deps);

        expect(block.attributes.start).toBeUndefined();
    });

    it('ネストされたリストを変換', () => {
        // - item1
        //   - nested1
        //   - nested2
        // - item2
        const tokens: Token[] = [
            mockToken({ type: 'bullet_list_open' }),
            mockToken({ type: 'list_item_open' }),
            mockToken({ type: 'paragraph_open', hidden: true }),
            fakeInline('item1'),
            mockToken({ type: 'paragraph_close', hidden: true }),
            // ネストされたリスト
            mockToken({ type: 'bullet_list_open' }),
            mockToken({ type: 'list_item_open' }),
            mockToken({ type: 'paragraph_open', hidden: true }),
            fakeInline('nested1'),
            mockToken({ type: 'paragraph_close', hidden: true }),
            mockToken({ type: 'list_item_close' }),
            mockToken({ type: 'list_item_open' }),
            mockToken({ type: 'paragraph_open', hidden: true }),
            fakeInline('nested2'),
            mockToken({ type: 'paragraph_close', hidden: true }),
            mockToken({ type: 'list_item_close' }),
            mockToken({ type: 'bullet_list_close' }),
            mockToken({ type: 'list_item_close' }),
            mockToken({ type: 'list_item_open' }),
            mockToken({ type: 'paragraph_open', hidden: true }),
            fakeInline('item2'),
            mockToken({ type: 'paragraph_close', hidden: true }),
            mockToken({ type: 'list_item_close' }),
            mockToken({ type: 'bullet_list_close' }),
        ];

        const { block, consumed } = transformList(tokens, 0, deps);

        expect(block.name).toBe('core/list');
        expect(block.innerBlocks).toHaveLength(2);

        // item1 にはネストされたリストが innerBlocks にある
        const item1 = block.innerBlocks[0];
        expect(String(item1.attributes.content)).toBe('item1');
        expect(item1.innerBlocks).toHaveLength(1);
        expect(item1.innerBlocks[0].name).toBe('core/list');
        expect(item1.innerBlocks[0].innerBlocks).toHaveLength(2);
        expect(
            String(item1.innerBlocks[0].innerBlocks[0].attributes.content),
        ).toBe('nested1');

        // item2 にはネストなし
        const item2 = block.innerBlocks[1];
        expect(String(item2.attributes.content)).toBe('item2');
        expect(item2.innerBlocks).toHaveLength(0);

        expect(consumed).toBe(tokens.length);
    });

    it('インライン要素を含むリストアイテムを変換', () => {
        const tokens: Token[] = [
            mockToken({ type: 'bullet_list_open' }),
            mockToken({ type: 'list_item_open' }),
            mockToken({ type: 'paragraph_open', hidden: true }),
            mockInlineToken([
                mockTextToken('Click '),
                mockToken({
                    type: 'link_open',
                    attrs: [['href', 'https://example.com']],
                }),
                mockTextToken('here'),
                mockToken({ type: 'link_close' }),
            ]),
            mockToken({ type: 'paragraph_close', hidden: true }),
            mockToken({ type: 'list_item_close' }),
            mockToken({ type: 'bullet_list_close' }),
        ];

        const { block } = transformList(tokens, 0, deps);
        expect(String(block.innerBlocks[0].attributes.content)).toBe(
            'Click <a href="https://example.com">here</a>',
        );
    });

    it('loose list の複数段落を保持する', () => {
        const { tokens } = parseMd('- para1\n\n  para2');
        const blocks = transformTokens(tokens, new Set());

        expect(blocks).toHaveLength(1);
        expect(blocks[0].name).toBe('core/list');
        expect(String(blocks[0].innerBlocks[0].attributes.content)).toBe(
            'para1<br><br>para2',
        );
    });
});
