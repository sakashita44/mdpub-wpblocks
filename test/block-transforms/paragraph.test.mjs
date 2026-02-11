import { describe, it, expect } from 'vitest';
import { createBlock } from '../../lib/wp-env.mjs';
import { renderInline } from '../../lib/inline-format.mjs';
import { transformParagraph } from '../../lib/block-transforms/paragraph.mjs';

const deps = { createBlock, renderInline };

/** inline トークンのモック */
function fakeInline(text) {
    return { type: 'inline', children: [{ type: 'text', content: text }] };
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
        };
        const block = transformParagraph(inlineToken, deps);
        expect(String(block.attributes.content)).toBe(
            'Click <a href="https://example.com">here</a>',
        );
    });

    it('空の children で空の content を生成', () => {
        const block = transformParagraph(
            { type: 'inline', children: [] },
            deps,
        );
        expect(String(block.attributes.content)).toBe('');
    });
});
