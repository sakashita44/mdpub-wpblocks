import { describe, it, expect } from 'vitest';
import { createBlock } from '../../lib/wp-env.mjs';
import { renderInline } from '../../lib/inline-format.mjs';
import { transformList } from '../../lib/block-transforms/list.mjs';

const deps = { createBlock, renderInline };

/** inline トークンを生成 */
function fakeInline(text) {
    return { type: 'inline', children: [{ type: 'text', content: text }] };
}

/**
 * フラットなリストトークン列を生成（ネストなし）
 * @param {'bullet'|'ordered'} type
 * @param {string[]} items
 * @param {number} [start] - ordered list の開始番号
 */
function fakeListTokens(type, items, start) {
    const openType = `${type}_list_open`;
    const closeType = `${type}_list_close`;
    const tokens = [];

    const openToken = { type: openType, attrs: null, attrGet: () => null };
    if (type === 'ordered' && start != null) {
        openToken.attrs = [['start', start]];
        openToken.attrGet = (k) => (k === 'start' ? String(start) : null);
    }
    tokens.push(openToken);

    for (const item of items) {
        tokens.push({ type: 'list_item_open' });
        tokens.push({ type: 'paragraph_open', hidden: true });
        tokens.push(fakeInline(item));
        tokens.push({ type: 'paragraph_close', hidden: true });
        tokens.push({ type: 'list_item_close' });
    }

    tokens.push({ type: closeType });
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
        const tokens = [
            { type: 'bullet_list_open', attrs: null, attrGet: () => null },
            { type: 'list_item_open' },
            { type: 'paragraph_open', hidden: true },
            fakeInline('item1'),
            { type: 'paragraph_close', hidden: true },
            // ネストされたリスト
            { type: 'bullet_list_open', attrs: null, attrGet: () => null },
            { type: 'list_item_open' },
            { type: 'paragraph_open', hidden: true },
            fakeInline('nested1'),
            { type: 'paragraph_close', hidden: true },
            { type: 'list_item_close' },
            { type: 'list_item_open' },
            { type: 'paragraph_open', hidden: true },
            fakeInline('nested2'),
            { type: 'paragraph_close', hidden: true },
            { type: 'list_item_close' },
            { type: 'bullet_list_close' },
            { type: 'list_item_close' },
            { type: 'list_item_open' },
            { type: 'paragraph_open', hidden: true },
            fakeInline('item2'),
            { type: 'paragraph_close', hidden: true },
            { type: 'list_item_close' },
            { type: 'bullet_list_close' },
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
        const tokens = [
            { type: 'bullet_list_open', attrs: null, attrGet: () => null },
            { type: 'list_item_open' },
            { type: 'paragraph_open', hidden: true },
            {
                type: 'inline',
                children: [
                    { type: 'text', content: 'Click ' },
                    {
                        type: 'link_open',
                        attrGet: () => 'https://example.com',
                    },
                    { type: 'text', content: 'here' },
                    { type: 'link_close' },
                ],
            },
            { type: 'paragraph_close', hidden: true },
            { type: 'list_item_close' },
            { type: 'bullet_list_close' },
        ];

        const { block } = transformList(tokens, 0, deps);
        expect(String(block.innerBlocks[0].attributes.content)).toBe(
            'Click <a href="https://example.com">here</a>',
        );
    });
});
