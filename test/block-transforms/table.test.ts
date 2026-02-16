import { describe, it, expect } from 'vitest';
import type Token from 'markdown-it/lib/token.mjs';
import { createBlock } from '../../lib/wp-env.js';
import { renderInline } from '../../lib/inline-format.js';
import { transformTable } from '../../lib/block-transforms/table.js';
import {
    mockToken,
    mockTextToken,
    mockInlineToken,
} from '../helpers/mock-token.js';

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
    const tokens: Token[] = [];
    tokens.push(mockToken({ type: 'table_open' }));

    // thead
    tokens.push(mockToken({ type: 'thead_open' }));
    tokens.push(mockToken({ type: 'tr_open' }));
    headRow.forEach((cell: string, idx: number) => {
        const attrs: [string, string][] | null = aligns?.[idx]
            ? [['style', `text-align:${aligns[idx]}`]]
            : null;
        tokens.push(mockToken({ type: 'th_open', attrs }));
        tokens.push(mockInlineToken([mockTextToken(cell)]));
        tokens.push(mockToken({ type: 'th_close' }));
    });
    tokens.push(mockToken({ type: 'tr_close' }));
    tokens.push(mockToken({ type: 'thead_close' }));

    // tbody
    tokens.push(mockToken({ type: 'tbody_open' }));
    for (const row of bodyRows) {
        tokens.push(mockToken({ type: 'tr_open' }));
        row.forEach((cell: string, idx: number) => {
            const attrs: [string, string][] | null = aligns?.[idx]
                ? [['style', `text-align:${aligns[idx]}`]]
                : null;
            tokens.push(mockToken({ type: 'td_open', attrs }));
            tokens.push(mockInlineToken([mockTextToken(cell)]));
            tokens.push(mockToken({ type: 'td_close' }));
        });
        tokens.push(mockToken({ type: 'tr_close' }));
    }
    tokens.push(mockToken({ type: 'tbody_close' }));

    tokens.push(mockToken({ type: 'table_close' }));
    return tokens;
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
        const tokens: Token[] = [
            mockToken({ type: 'table_open' }),
            mockToken({ type: 'thead_open' }),
            mockToken({ type: 'tr_open' }),
            mockToken({ type: 'th_open' }),
            mockInlineToken([
                mockToken({ type: 'strong_open' }),
                mockTextToken('Bold'),
                mockToken({ type: 'strong_close' }),
            ]),
            mockToken({ type: 'th_close' }),
            mockToken({ type: 'tr_close' }),
            mockToken({ type: 'thead_close' }),
            mockToken({ type: 'tbody_open' }),
            mockToken({ type: 'tbody_close' }),
            mockToken({ type: 'table_close' }),
        ];
        const { block } = transformTable(tokens, 0, deps);
        const attrs = block.attributes as unknown as TableAttrs;

        expect(attrs.head[0].cells[0].content).toBe('<strong>Bold</strong>');
    });

    it('startIndex がオフセットされていても正しく消費数を返す', () => {
        const prefix: Token[] = [
            mockToken({ type: 'paragraph_open' }),
            mockToken({ type: 'inline' }),
            mockToken({ type: 'paragraph_close' }),
        ];
        const tableTokens = fakeTableTokens(['H'], [['v']]);
        const tokens = [...prefix, ...tableTokens];

        const { consumed } = transformTable(tokens, 3, deps);
        expect(consumed).toBe(tableTokens.length);
    });
});
