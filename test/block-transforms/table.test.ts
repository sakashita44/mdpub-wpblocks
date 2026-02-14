import { describe, it, expect } from 'vitest';
import type Token from 'markdown-it/lib/token.mjs';
import { createBlock } from '../../lib/wp-env.js';
import { renderInline } from '../../lib/inline-format.js';
import { transformTable } from '../../lib/block-transforms/table.js';

/** テーブル属性の型（テスト用アサーション） */
interface TableAttrs {
    hasFixedLayout?: boolean;
    head: { cells: { content: string; tag: string; align?: string }[] }[];
    body: { cells: { content: string; tag: string; align?: string }[] }[];
}

const deps = { createBlock, renderInline };

/**
 * markdown-it のテーブルトークン列を簡易生成するヘルパー
 * @param {string[]} headRow - ヘッダ行のセル文字列
 * @param {string[][]} bodyRows - ボディ行のセル文字列配列
 * @param {(string|undefined)[]} [aligns] - 各カラムのアライメント
 */
function fakeTableTokens(
    headRow: string[],
    bodyRows: string[][],
    aligns?: (string | undefined)[],
): Token[] {
    const tokens: object[] = [];
    tokens.push({ type: 'table_open' });

    // thead
    tokens.push({ type: 'thead_open' });
    tokens.push({ type: 'tr_open' });
    headRow.forEach((cell: string, idx: number) => {
        const attrs = aligns?.[idx]
            ? [['style', `text-align:${aligns[idx]}`]]
            : null;
        tokens.push({
            type: 'th_open',
            attrs,
            attrGet: (k: string) => {
                const pair = attrs?.find((a) => a[0] === k);
                return pair ? pair[1] : null;
            },
        });
        tokens.push({
            type: 'inline',
            children: [{ type: 'text', content: cell }],
        });
        tokens.push({ type: 'th_close' });
    });
    tokens.push({ type: 'tr_close' });
    tokens.push({ type: 'thead_close' });

    // tbody
    tokens.push({ type: 'tbody_open' });
    for (const row of bodyRows) {
        tokens.push({ type: 'tr_open' });
        row.forEach((cell: string, idx: number) => {
            const attrs = aligns?.[idx]
                ? [['style', `text-align:${aligns[idx]}`]]
                : null;
            tokens.push({
                type: 'td_open',
                attrs,
                attrGet: (k: string) => {
                    const pair = attrs?.find((a) => a[0] === k);
                    return pair ? pair[1] : null;
                },
            });
            tokens.push({
                type: 'inline',
                children: [{ type: 'text', content: cell }],
            });
            tokens.push({ type: 'td_close' });
        });
        tokens.push({ type: 'tr_close' });
    }
    tokens.push({ type: 'tbody_close' });

    tokens.push({ type: 'table_close' });
    return tokens as unknown as Token[];
}

describe('transformTable', () => {
    it('基本的な 2x2 テーブルを変換', () => {
        const tokens = fakeTableTokens(['H1', 'H2'], [['a', 'b']]);
        const { block, consumed } = transformTable(tokens, 0, deps);
        const attrs = block.attributes as unknown as TableAttrs;

        expect(block.name).toBe('core/table');
        expect(attrs.hasFixedLayout).toBe(true);
        expect(attrs.head).toHaveLength(1);
        expect(attrs.head[0].cells).toHaveLength(2);
        expect(attrs.head[0].cells[0].content).toBe('H1');
        expect(attrs.head[0].cells[0].tag).toBe('th');
        expect(attrs.body).toHaveLength(1);
        expect(attrs.body[0].cells[0].content).toBe('a');
        expect(attrs.body[0].cells[0].tag).toBe('td');
        expect(consumed).toBe(tokens.length);
    });

    it('複数行のボディを変換', () => {
        const tokens = fakeTableTokens(
            ['Name', 'Age'],
            [
                ['Alice', '30'],
                ['Bob', '25'],
            ],
        );
        const { block } = transformTable(tokens, 0, deps);
        const attrs = block.attributes as unknown as TableAttrs;

        expect(attrs.body).toHaveLength(2);
        expect(attrs.body[1].cells[0].content).toBe('Bob');
    });

    it('アライメント情報を保持', () => {
        const tokens = fakeTableTokens(
            ['Left', 'Center', 'Right'],
            [['a', 'b', 'c']],
            ['left', 'center', 'right'],
        );
        const { block } = transformTable(tokens, 0, deps);
        const attrs = block.attributes as unknown as TableAttrs;

        expect(attrs.head[0].cells[0].align).toBe('left');
        expect(attrs.head[0].cells[1].align).toBe('center');
        expect(attrs.head[0].cells[2].align).toBe('right');
        expect(attrs.body[0].cells[2].align).toBe('right');
    });

    it('アライメントなしの場合は align プロパティを設定しない', () => {
        const tokens = fakeTableTokens(['H1'], [['a']]);
        const { block } = transformTable(tokens, 0, deps);
        const attrs = block.attributes as unknown as TableAttrs;

        expect(attrs.head[0].cells[0].align).toBeUndefined();
    });

    it('セル内のインライン要素を HTML に変換', () => {
        const tokens = [
            { type: 'table_open' },
            { type: 'thead_open' },
            { type: 'tr_open' },
            {
                type: 'th_open',
                attrs: null,
                attrGet: () => null,
            },
            {
                type: 'inline',
                children: [
                    { type: 'strong_open' },
                    { type: 'text', content: 'Bold' },
                    { type: 'strong_close' },
                ],
            },
            { type: 'th_close' },
            { type: 'tr_close' },
            { type: 'thead_close' },
            { type: 'tbody_open' },
            { type: 'tbody_close' },
            { type: 'table_close' },
        ] as unknown as Token[];
        const { block } = transformTable(tokens, 0, deps);
        const attrs = block.attributes as unknown as TableAttrs;

        expect(attrs.head[0].cells[0].content).toBe('<strong>Bold</strong>');
    });

    it('startIndex がオフセットされていても正しく消費数を返す', () => {
        const prefix = [
            { type: 'paragraph_open' },
            { type: 'inline' },
            { type: 'paragraph_close' },
        ] as unknown as Token[];
        const tableTokens = fakeTableTokens(['H'], [['v']]);
        const tokens = [...prefix, ...tableTokens];

        const { consumed } = transformTable(tokens, 3, deps);
        expect(consumed).toBe(tableTokens.length);
    });
});
