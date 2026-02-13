import { describe, it, expect } from 'vitest';
import { renderInline } from '../lib/inline-format.mjs';

/** テキストトークンのモック */
function textToken(content) {
    return { type: 'text', content };
}

describe('renderInline', () => {
    it('null / 空配列で空文字を返す', () => {
        expect(renderInline(null)).toBe('');
        expect(renderInline([])).toBe('');
    });

    it('プレーンテキストをエスケープして返す', () => {
        expect(renderInline([textToken('Hello & "world"')])).toBe(
            'Hello &amp; &quot;world&quot;',
        );
    });

    it('strong タグで囲む', () => {
        const tokens = [
            { type: 'strong_open' },
            textToken('bold'),
            { type: 'strong_close' },
        ];
        expect(renderInline(tokens)).toBe('<strong>bold</strong>');
    });

    it('em タグで囲む', () => {
        const tokens = [
            { type: 'em_open' },
            textToken('italic'),
            { type: 'em_close' },
        ];
        expect(renderInline(tokens)).toBe('<em>italic</em>');
    });

    it('code_inline をエスケープ付きで変換', () => {
        const tokens = [{ type: 'code_inline', content: '<div>' }];
        expect(renderInline(tokens)).toBe('<code>&lt;div&gt;</code>');
    });

    it('s（strikethrough）タグで囲む', () => {
        const tokens = [
            { type: 's_open' },
            textToken('deleted'),
            { type: 's_close' },
        ];
        expect(renderInline(tokens)).toBe('<s>deleted</s>');
    });

    it('softbreak を改行に変換', () => {
        const tokens = [
            textToken('line1'),
            { type: 'softbreak' },
            textToken('line2'),
        ];
        expect(renderInline(tokens)).toBe('line1\nline2');
    });

    it('hardbreak を <br> に変換', () => {
        const tokens = [
            textToken('line1'),
            { type: 'hardbreak' },
            textToken('line2'),
        ];
        expect(renderInline(tokens)).toBe('line1<br>line2');
    });

    describe('link', () => {
        it('安全な https リンクを生成', () => {
            const tokens = [
                { type: 'link_open', attrGet: () => 'https://example.com' },
                textToken('Example'),
                { type: 'link_close' },
            ];
            expect(renderInline(tokens)).toBe(
                '<a href="https://example.com">Example</a>',
            );
        });

        it('mailto リンクを許可', () => {
            const tokens = [
                { type: 'link_open', attrGet: () => 'mailto:test@example.com' },
                textToken('mail'),
                { type: 'link_close' },
            ];
            expect(renderInline(tokens)).toBe(
                '<a href="mailto:test@example.com">mail</a>',
            );
        });

        it('相対パス（/）を許可', () => {
            const tokens = [
                { type: 'link_open', attrGet: () => '/path/to/page' },
                textToken('link'),
                { type: 'link_close' },
            ];
            expect(renderInline(tokens)).toBe(
                '<a href="/path/to/page">link</a>',
            );
        });

        it('アンカー（#）を許可', () => {
            const tokens = [
                { type: 'link_open', attrGet: () => '#section' },
                textToken('anchor'),
                { type: 'link_close' },
            ];
            expect(renderInline(tokens)).toBe('<a href="#section">anchor</a>');
        });

        it('javascript: スキームを空文字に置換（XSS 防御）', () => {
            const tokens = [
                { type: 'link_open', attrGet: () => 'javascript:alert(1)' },
                textToken('xss'),
                { type: 'link_close' },
            ];
            expect(renderInline(tokens)).toBe('<a href="">xss</a>');
        });

        it('data: スキームを空文字に置換', () => {
            const tokens = [
                {
                    type: 'link_open',
                    attrGet: () => 'data:text/html,<h1>hi</h1>',
                },
                textToken('data'),
                { type: 'link_close' },
            ];
            expect(renderInline(tokens)).toBe('<a href="">data</a>');
        });

        it('href 内の & をエスケープ', () => {
            const tokens = [
                {
                    type: 'link_open',
                    attrGet: () => 'https://example.com?a=1&b=2',
                },
                textToken('link'),
                { type: 'link_close' },
            ];
            expect(renderInline(tokens)).toBe(
                '<a href="https://example.com?a=1&amp;b=2">link</a>',
            );
        });
    });

    it('複合的なインライン要素を正しく結合', () => {
        const tokens = [
            textToken('Hello '),
            { type: 'strong_open' },
            textToken('bold'),
            { type: 'strong_close' },
            textToken(' and '),
            { type: 'em_open' },
            textToken('italic'),
            { type: 'em_close' },
        ];
        expect(renderInline(tokens)).toBe(
            'Hello <strong>bold</strong> and <em>italic</em>',
        );
    });

    it('インライン数式を KaTeX ショートコードに変換', () => {
        const tokens = [textToken('before $x^2$ after')];
        expect(renderInline(tokens)).toBe('before [katex]x^2[/katex] after');
    });

    it('エスケープされた $ は通常文字として扱う', () => {
        const tokens = [textToken('price is \\$10')];
        expect(renderInline(tokens)).toBe('price is $10');
    });

    it('display math 形式の $$...$$ はインライン数式として変換しない', () => {
        const tokens = [textToken('see $$x^2$$ end')];
        expect(renderInline(tokens)).toBe('see $$x^2$$ end');
    });

    it('html_inline をエスケープして保持する', () => {
        const tokens = [
            textToken('before '),
            { type: 'html_inline', content: '<span class="x">ok</span>' },
            textToken(' after'),
        ];
        expect(renderInline(tokens)).toBe(
            'before &lt;span class=&quot;x&quot;&gt;ok&lt;/span&gt; after',
        );
    });
});
