/**
 * core/table ブロック変換
 *
 * markdown-it の GFM テーブルトークン列を core/table ブロックに変換する。
 * トークン構造:
 *   table_open → thead_open → tr_open → th_open → inline → th_close → ...
 *   → thead_close → tbody_open → tr_open → td_open → inline → td_close → ...
 *   → tbody_close → table_close
 */

/**
 * style 属性から text-align 値を抽出
 * @param {import('markdown-it').Token} cellToken - th_open / td_open トークン
 * @returns {string|undefined}
 */
function extractAlign(cellToken) {
    const style = cellToken.attrGet('style');
    if (!style) return undefined;
    const match = /text-align:(\w+)/.exec(style);
    return match ? match[1] : undefined;
}

/**
 * テーブルセクション（thead / tbody）内の行をパースして WP テーブル行配列を返す
 * @param {import('markdown-it').Token[]} tokens
 * @param {number} start - セクション _open の次のインデックス
 * @param {string} sectionClose - 'thead_close' or 'tbody_close'
 * @param {string} cellTag - 'th' or 'td'
 * @param {{ renderInline: Function }} deps
 * @returns {{ rows: object[], end: number }} end はセクション _close の次のインデックス
 */
function parseSection(tokens, start, sectionClose, cellTag, { renderInline }) {
    const rows = [];
    let i = start;

    while (i < tokens.length && tokens[i].type !== sectionClose) {
        if (tokens[i].type === 'tr_open') {
            const cells = [];
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

                    const cell = { content, tag: cellTag };
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

/**
 * table_open から始まるトークン列を core/table ブロックに変換
 * @param {import('markdown-it').Token[]} tokens - トークン配列全体
 * @param {number} startIndex - table_open のインデックス
 * @param {{ createBlock: Function, renderInline: Function }} deps
 * @returns {{ block: import('@wordpress/blocks').Block, consumed: number }}
 */
export function transformTable(
    tokens,
    startIndex,
    { createBlock, renderInline },
) {
    let i = startIndex + 1; // table_open をスキップ

    let head = [];
    let body = [];

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
