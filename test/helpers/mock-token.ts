/**
 * テスト用 Token モックヘルパー
 *
 * markdown-it の Token コンストラクタで実インスタンスを生成するため
 * attrGet 等のメソッドがそのまま使える。
 */

import Token from 'markdown-it/lib/token.mjs';

/** 任意プロパティを上書きした Token インスタンスを生成 */
export function mockToken(overrides: Partial<Token> & { type: string }): Token {
    const t = new Token(
        overrides.type,
        overrides.tag ?? '',
        overrides.nesting ?? 0,
    );
    if (overrides.content !== undefined) t.content = overrides.content;
    if (overrides.children !== undefined) t.children = overrides.children;
    if (overrides.info !== undefined) t.info = overrides.info;
    if (overrides.attrs !== undefined) t.attrs = overrides.attrs;
    if (overrides.markup !== undefined) t.markup = overrides.markup;
    if (overrides.block !== undefined) t.block = overrides.block;
    if (overrides.hidden !== undefined) t.hidden = overrides.hidden;
    if (overrides.level !== undefined) t.level = overrides.level;
    if (overrides.meta !== undefined) t.meta = overrides.meta;
    if (overrides.map !== undefined) t.map = overrides.map;
    return t;
}

/** テキストトークンを生成 */
export function mockTextToken(content: string): Token {
    return mockToken({ type: 'text', content });
}

/** inline トークンを生成（children を指定） */
export function mockInlineToken(children: Token[]): Token {
    return mockToken({ type: 'inline', children });
}
