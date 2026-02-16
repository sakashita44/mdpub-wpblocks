/**
 * core/table ブロック変換
 *
 * markdown-it の GFM テーブルトークン列を core/table ブロックに変換する。
 * トークン構造:
 *   table_open → thead_open → tr_open → th_open → inline → th_close → ...
 *   → thead_close → tbody_open → tr_open → td_open → inline → td_close → ...
 *   → tbody_close → table_close
 */

import type Token from 'markdown-it/lib/token.mjs';
import type { TransformDeps, TransformResult } from '../types.js';

/** テーブルセルの型 */
interface TableCell {
    content: string;
    tag: string;
    align?: string;
}

/** テーブル行の型 */
interface TableRow {
    cells: TableCell[];
}

/** style 属性から text-align 値を抽出 */
function extractAlign(cellToken: Token): string | undefined {
    const style = cellToken.attrGet('style');
    if (!style) return undefined;
    const match = /text-align:(\w+)/.exec(style);
    return match ? match[1] : undefined;
}

/**
 * テーブルセクション（thead / tbody）内の行をパースして WP テーブル行配列を返す
 * end はセクション _close の次のインデックス
 */
function parseSection(
    tokens: Token[],
    start: number,
    sectionClose: string,
    cellTag: string,
    { renderInline }: Pick<TransformDeps, 'renderInline'>,
): { rows: TableRow[]; end: number } {
    const rows: TableRow[] = [];
    let i = start;

    while (i < tokens.length && tokens[i].type !== sectionClose) {
        if (tokens[i].type === 'tr_open') {
            const cells: TableCell[] = [];
            i += 1; // tr_open をスキップ

            while (i < tokens.length && tokens[i].type !== 'tr_close') {
                if (
                    tokens[i].type === 'th_open' ||
                    tokens[i].type === 'td_open'
                ) {
                    const align = extractAlign(tokens[i]);
                    i += 1; // th_open / td_open をスキップ

                    // 次は inline トークン
                    const content =
                        tokens[i].type === 'inline'
                            ? renderInline(tokens[i].children)
                            : '';
                    i += 1; // inline をスキップ
                    i += 1; // th_close / td_close をスキップ

                    const cell: TableCell = { content, tag: cellTag };
                    if (align) cell.align = align;
                    cells.push(cell);
                } else {
                    i += 1;
                }
            }

            rows.push({ cells });
            i += 1; // tr_close をスキップ
        } else {
            i += 1;
        }
    }

    // sectionClose をスキップ
    return { rows, end: i + 1 };
}

/** table_open から始まるトークン列を core/table ブロックに変換 */
export function transformTable(
    tokens: Token[],
    startIndex: number,
    {
        createBlock,
        renderInline,
    }: Pick<TransformDeps, 'createBlock' | 'renderInline'>,
): TransformResult {
    let i = startIndex + 1; // table_open をスキップ

    let head: TableRow[] = [];
    let body: TableRow[] = [];

    // thead セクション
    if (i < tokens.length && tokens[i].type === 'thead_open') {
        i += 1; // thead_open をスキップ
        const result = parseSection(tokens, i, 'thead_close', 'th', {
            renderInline,
        });
        head = result.rows;
        i = result.end;
    }

    // tbody セクション
    if (i < tokens.length && tokens[i].type === 'tbody_open') {
        i += 1; // tbody_open をスキップ
        const result = parseSection(tokens, i, 'tbody_close', 'td', {
            renderInline,
        });
        body = result.rows;
        i = result.end;
    }

    // table_close をスキップ
    if (i < tokens.length && tokens[i].type === 'table_close') {
        i += 1;
    }

    const block = createBlock('core/table', {
        hasFixedLayout: true,
        head,
        body,
    });

    return { block, consumed: i - startIndex };
}
