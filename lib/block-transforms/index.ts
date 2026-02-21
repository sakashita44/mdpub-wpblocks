/**
 * ブロック変換ディスパッチャ
 *
 * markdown-it のトークン配列を走査し、各トークンパターンに応じた
 * 変換関数にディスパッチして Gutenberg ブロック配列を生成する。
 */

import type Token from 'markdown-it/lib/token.mjs';
import type {
    TransformDeps,
    TransformTokensResult,
    TransformWarning,
} from '../types.js';

import { createBlock } from '../wp-env.js';
import { renderInline as renderInlineBase } from '../inline-format.js';
import { transformParagraph } from './paragraph.js';
import { transformHeading } from './heading.js';
import { transformCode } from './code.js';
import { transformTable } from './table.js';
import { transformList } from './list.js';
import { transformImage, transformImageToken, isImageOnly } from './image.js';
import { extractDisplayMath, transformDisplayMath } from '../plugins/katex.js';
import { extractStandaloneUrl, transformEmbed } from './embed.js';
import { transformHtml } from './html.js';
import { transformColumns } from './columns.js';
import { CONSUMED_TOKEN_TYPES } from './token-types.js';

export { HANDLED_TOKEN_TYPES, CONSUMED_TOKEN_TYPES } from './token-types.js';

/** markdown-it トークン配列を Gutenberg ブロック配列に変換 */
export function transformTokens(
    tokens: Token[],
    plugins: Set<string>,
): TransformTokensResult {
    const renderInline = (children: Token[] | null): string =>
        renderInlineBase(children, plugins);

    const deps: TransformDeps = {
        createBlock,
        renderInline,
        plugins,
    };

    const blocks: TransformTokensResult['blocks'] = [];
    const warnings: TransformWarning[] = [];
    let i = 0;

    while (i < tokens.length) {
        const token = tokens[i];

        switch (token.type) {
            // 段落: paragraph_open → inline → paragraph_close（3 トークン消費）
            case 'paragraph_open': {
                if (i + 1 >= tokens.length) {
                    warnings.push({
                        type: 'incomplete_token',
                        tokenType: 'paragraph_open',
                        line: token.map?.[0],
                    });
                    i += 1;
                    break;
                }
                const inlineToken = tokens[i + 1];

                // KaTeX プラグインが有効な場合のみディスプレイ数式を変換
                if (plugins.has('katex')) {
                    const displayMath = extractDisplayMath(inlineToken);
                    if (displayMath) {
                        blocks.push(transformDisplayMath(displayMath, deps));
                        i += 3;
                        break;
                    }
                }

                const embedUrl = extractStandaloneUrl(inlineToken);
                if (embedUrl) {
                    blocks.push(transformEmbed(embedUrl, deps));
                    i += 3;
                    break;
                }

                if (isImageOnly(inlineToken.children)) {
                    const imageTokens = (inlineToken.children ?? []).filter(
                        (c: Token) => c.type === 'image',
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
                    warnings.push({
                        type: 'incomplete_token',
                        tokenType: 'heading_open',
                        line: token.map?.[0],
                    });
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

            // HTML ブロック（iframe 等）をそのまま core/html に格納
            case 'html_block': {
                blocks.push(transformHtml(token, deps));
                i += 1;
                break;
            }

            // :::columns ... :::
            case 'container_columns_open': {
                const result = transformColumns(tokens, i, deps);
                blocks.push(result.block);
                i += result.consumed;
                break;
            }

            default:
                if (!CONSUMED_TOKEN_TYPES.has(token.type)) {
                    warnings.push({
                        type: 'unsupported_token',
                        tokenType: token.type,
                        line: token.map?.[0],
                    });
                }
                i += 1;
                break;
        }
    }

    return { blocks, warnings };
}
