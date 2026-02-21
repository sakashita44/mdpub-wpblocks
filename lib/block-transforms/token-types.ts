/**
 * トークンタイプ分類定数
 *
 * ディスパッチャ（index.ts）と軽量バリデーション（validate-tokens.ts）の
 * 両方から参照される。wp-env に依存しない。
 */

/** switch case で直接処理するトークン */
export const HANDLED_TOKEN_TYPES = new Set([
    'paragraph_open',
    'heading_open',
    'fence',
    'table_open',
    'bullet_list_open',
    'ordered_list_open',
    'html_block',
    'container_columns_open',
]);

/** switch case で消費済みのためスキップすべきトークン */
export const CONSUMED_TOKEN_TYPES = new Set([
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
