/**
 * ブロック変換ディスパッチャ
 *
 * markdown-it のトークン配列を走査し、各トークンパターンに応じた
 * 変換関数にディスパッチして Gutenberg ブロック配列を生成する。
 */

import { createBlock } from '../wp-env.mjs';
import { renderInline } from '../inline-format.mjs';
import { transformParagraph } from './paragraph.mjs';
import { transformHeading } from './heading.mjs';
import { transformCode } from './code.mjs';
import { transformTable } from './table.mjs';
import { transformList } from './list.mjs';
import { transformImage, transformImageToken, isImageOnly } from './image.mjs';

const deps = { createBlock, renderInline };

// switch case で消費済みのためスキップすべきトークン
const CONSUMED_TOKEN_TYPES = new Set([
    'paragraph_close',
    'heading_close',
    'inline',
    'thead_open',
    'thead_close',
    'tbody_open',
    'tbody_close',
    'tr_open',
    'tr_close',
    'th_open',
    'th_close',
    'td_open',
    'td_close',
    'list_item_open',
    'list_item_close',
    'ordered_list_close',
    'bullet_list_close',
]);

/**
 * markdown-it トークン配列を Gutenberg ブロック配列に変換
 * @param {import('markdown-it').Token[]} tokens
 * @returns {import('@wordpress/blocks').Block[]}
 */
export function transformTokens(tokens) {
    const blocks = [];
    let i = 0;

    while (i < tokens.length) {
        const token = tokens[i];

        switch (token.type) {
            // 段落: paragraph_open → inline → paragraph_close（3 トークン消費）
            case 'paragraph_open': {
                if (i + 1 >= tokens.length) {
                    console.warn(
                        '[warn] paragraph_open の後にトークンがありません',
                    );
                    i += 1;
                    break;
                }
                const inlineToken = tokens[i + 1];
                if (isImageOnly(inlineToken.children)) {
                    const imageTokens = inlineToken.children.filter(
                        (c) => c.type === 'image',
                    );
                    if (imageTokens.length === 1) {
                        blocks.push(transformImage(inlineToken, deps));
                    } else {
                        for (const imageToken of imageTokens) {
                            blocks.push(transformImageToken(imageToken, deps));
                        }
                    }
                } else {
                    blocks.push(transformParagraph(inlineToken, deps));
                }
                i += 3;
                break;
            }

            // 見出し: heading_open → inline → heading_close（3 トークン消費）
            case 'heading_open': {
                if (i + 1 >= tokens.length) {
                    console.warn(
                        '[warn] heading_open の後にトークンがありません',
                    );
                    i += 1;
                    break;
                }
                const inlineToken = tokens[i + 1];
                blocks.push(transformHeading(token, inlineToken, deps));
                i += 3;
                break;
            }

            // コードブロック: fence（1 トークン消費）
            // NOTE: インデント式コードブロック（code_block）は非対応。
            // fence のみサポートする設計判断。必要になれば Issue で対応を検討する。
            case 'fence': {
                blocks.push(transformCode(token, deps));
                i += 1;
                break;
            }

            // GFM テーブル: table_open ... table_close（複数トークン消費）
            case 'table_open': {
                const result = transformTable(tokens, i, deps);
                blocks.push(result.block);
                i += result.consumed;
                break;
            }

            // リスト: bullet/ordered_list_open ... _close（複数トークン消費）
            case 'bullet_list_open':
            case 'ordered_list_open': {
                const result = transformList(tokens, i, deps);
                blocks.push(result.block);
                i += result.consumed;
                break;
            }

            default:
                if (!CONSUMED_TOKEN_TYPES.has(token.type)) {
                    console.warn(
                        `[warn] 未対応トークン: ${token.type}（スキップ）`,
                    );
                }
                i += 1;
                break;
        }
    }

    return blocks;
}
