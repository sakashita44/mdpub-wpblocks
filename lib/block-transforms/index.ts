/**
 * ブロック変換ディスパッチャ
 *
 * markdown-it のトークン配列を走査し、各トークンパターンに応じた
 * 変換関数にディスパッチして Gutenberg ブロック配列を生成する。
 */

import type Token from 'markdown-it/lib/token.mjs';
import type { Block } from '@wordpress/blocks';
import type { TransformDeps } from '../types.js';

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
    'container_columns_close',
]);

/** 有効プラグインを設定する。スクリプトから呼び出す。 */
let activePlugins: Set<string> = new Set();
export function setPlugins(plugins: Set<string>): void {
    activePlugins = plugins;
}

/** markdown-it トークン配列を Gutenberg ブロック配列に変換 */
export function transformTokens(tokens: Token[]): Block[] {
    const renderInline = (children: Token[] | null): string =>
        renderInlineBase(children, activePlugins);

    const deps: TransformDeps = {
        createBlock,
        renderInline,
        plugins: activePlugins,
    };

    const blocks: Block[] = [];
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

                // KaTeX プラグインが有効な場合のみディスプレイ数式を変換
                if (activePlugins.has('katex')) {
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
