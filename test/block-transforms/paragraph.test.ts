import { describe, it, expect } from 'vitest';
import type Token from 'markdown-it/lib/token.mjs';
import { createBlock } from '../../lib/wp-env.js';
import { renderInline } from '../../lib/inline-format.js';
import { transformParagraph } from '../../lib/block-transforms/paragraph.js';
import {
    mockToken,
    mockTextToken,
    mockInlineToken,
} from '../helpers/mock-token.js';

const noPlugins = new Set<string>();
const deps = {
    createBlock,
    renderInline: (children: Token[] | null) =>
        renderInline(children, noPlugins),
};

/** inline トークンのモック */
function fakeInline(text: string) {
    return mockInlineToken([mockTextToken(text)]);
}

describe('transformParagraph', () => {
    it('プレーンテキストを core/paragraph に変換', () => {
        const block = transformParagraph(fakeInline('Hello world'), deps);
        expect(block.name).toBe('core/paragraph');
        expect(String(block.attributes.content)).toBe('Hello world');
    });

    it('HTML 特殊文字をエスケープ', () => {
        const block = transformParagraph(
            fakeInline('<script>alert(1)</script>'),
            deps,
        );
        const content = String(block.attributes.content);
        // < はエスケープされタグとして解釈されない（RichTextData が > を正規化する）
        expect(content).not.toContain('<script>');
        expect(content).toContain('&lt;script');
    });

    it('インライン要素を含む段落を変換', () => {
        const inlineToken = mockInlineToken([
            mockTextToken('Click '),
            mockToken({
                type: 'link_open',
                attrs: [['href', 'https://example.com']],
            }),
            mockTextToken('here'),
            mockToken({ type: 'link_close' }),
        ]);
        const block = transformParagraph(inlineToken, deps);
        expect(String(block.attributes.content)).toBe(
            'Click <a href="https://example.com">here</a>',
        );
    });

    it('空の children で空の content を生成', () => {
        const block = transformParagraph(mockInlineToken([]), deps);
        expect(String(block.attributes.content)).toBe('');
    });
});
