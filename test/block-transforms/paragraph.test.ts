import { describe, it, expect } from 'vitest';
import type Token from 'markdown-it/lib/token.mjs';
import { createBlock } from '../../lib/wp-env.js';
import { renderInline } from '../../lib/inline-format.js';
import { transformParagraph } from '../../lib/block-transforms/paragraph.js';

const deps = { createBlock, renderInline };

/** inline トークンのモック */
function fakeInline(text: string): Token {
    return {
        type: 'inline',
        children: [{ type: 'text', content: text }],
    } as unknown as Token;
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
        const inlineToken = {
            type: 'inline',
            children: [
                { type: 'text', content: 'Click ' },
                { type: 'link_open', attrGet: () => 'https://example.com' },
                { type: 'text', content: 'here' },
                { type: 'link_close' },
            ],
        } as unknown as Token;
        const block = transformParagraph(inlineToken, deps);
        expect(String(block.attributes.content)).toBe(
            'Click <a href="https://example.com">here</a>',
        );
    });

    it('空の children で空の content を生成', () => {
        const block = transformParagraph(
            { type: 'inline', children: [] } as unknown as Token,
            deps,
        );
        expect(String(block.attributes.content)).toBe('');
    });
});
