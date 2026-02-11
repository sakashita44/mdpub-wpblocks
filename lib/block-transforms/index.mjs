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

const deps = { createBlock, renderInline };

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
                blocks.push(transformParagraph(inlineToken, deps));
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

            default:
                // 未対応トークンは警告を出してスキップ
                if (
                    token.type !== 'paragraph_close' &&
                    token.type !== 'heading_close' &&
                    token.type !== 'inline'
                ) {
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
