import { describe, it, expect } from 'vitest';
import { renderInline } from '../lib/inline-format.js';
import { mockToken, mockTextToken } from './helpers/mock-token.js';

const katexPlugins = new Set(['katex']);
const noPlugins = new Set<string>();

describe('renderInline', () => {
    it('null / 空配列で空文字を返す', () => {
        expect(renderInline(null, noPlugins)).toBe('');
        expect(renderInline([], noPlugins)).toBe('');
    });

    it('プレーンテキストをエスケープして返す', () => {
        expect(
            renderInline([mockTextToken('Hello & "world"')], noPlugins),
        ).toBe('Hello &amp; &quot;world&quot;');
    });

    it('strong タグで囲む', () => {
        const tokens = [
            mockToken({ type: 'strong_open' }),
            mockTextToken('bold'),
            mockToken({ type: 'strong_close' }),
        ];
        expect(renderInline(tokens, noPlugins)).toBe('<strong>bold</strong>');
    });

    it('em タグで囲む', () => {
        const tokens = [
            mockToken({ type: 'em_open' }),
            mockTextToken('italic'),
            mockToken({ type: 'em_close' }),
        ];
        expect(renderInline(tokens, noPlugins)).toBe('<em>italic</em>');
    });

    it('code_inline をエスケープ付きで変換', () => {
        const tokens = [mockToken({ type: 'code_inline', content: '<div>' })];
        expect(renderInline(tokens, noPlugins)).toBe(
            '<code>&lt;div&gt;</code>',
        );
    });

    it('s（strikethrough）タグで囲む', () => {
        const tokens = [
            mockToken({ type: 's_open' }),
            mockTextToken('deleted'),
            mockToken({ type: 's_close' }),
        ];
        expect(renderInline(tokens, noPlugins)).toBe('<s>deleted</s>');
    });

    it('softbreak を改行に変換', () => {
        const tokens = [
            mockTextToken('line1'),
            mockToken({ type: 'softbreak' }),
            mockTextToken('line2'),
        ];
        expect(renderInline(tokens, noPlugins)).toBe('line1\nline2');
    });

    it('hardbreak を <br> に変換', () => {
        const tokens = [
            mockTextToken('line1'),
            mockToken({ type: 'hardbreak' }),
            mockTextToken('line2'),
        ];
        expect(renderInline(tokens, noPlugins)).toBe('line1<br>line2');
    });

    describe('link', () => {
        it('安全な https リンクを生成', () => {
            const tokens = [
                mockToken({
                    type: 'link_open',
                    attrs: [['href', 'https://example.com']],
                }),
                mockTextToken('Example'),
                mockToken({ type: 'link_close' }),
            ];
            expect(renderInline(tokens, noPlugins)).toBe(
                '<a href="https://example.com">Example</a>',
            );
        });

        it('mailto リンクを許可', () => {
            const tokens = [
                mockToken({
                    type: 'link_open',
                    attrs: [['href', 'mailto:test@example.com']],
                }),
                mockTextToken('mail'),
                mockToken({ type: 'link_close' }),
            ];
            expect(renderInline(tokens, noPlugins)).toBe(
                '<a href="mailto:test@example.com">mail</a>',
            );
        });

        it('相対パス（/）を許可', () => {
            const tokens = [
                mockToken({
                    type: 'link_open',
                    attrs: [['href', '/path/to/page']],
                }),
                mockTextToken('link'),
                mockToken({ type: 'link_close' }),
            ];
            expect(renderInline(tokens, noPlugins)).toBe(
                '<a href="/path/to/page">link</a>',
            );
        });

        it('アンカー（#）を許可', () => {
            const tokens = [
                mockToken({
                    type: 'link_open',
                    attrs: [['href', '#section']],
                }),
                mockTextToken('anchor'),
                mockToken({ type: 'link_close' }),
            ];
            expect(renderInline(tokens, noPlugins)).toBe(
                '<a href="#section">anchor</a>',
            );
        });

        it('javascript: スキームを空文字に置換（XSS 防御）', () => {
            const tokens = [
                mockToken({
                    type: 'link_open',
                    attrs: [['href', 'javascript:alert(1)']],
                }),
                mockTextToken('xss'),
                mockToken({ type: 'link_close' }),
            ];
            expect(renderInline(tokens, noPlugins)).toBe('<a href="">xss</a>');
        });

        it('data: スキームを空文字に置換', () => {
            const tokens = [
                mockToken({
                    type: 'link_open',
                    attrs: [['href', 'data:text/html,<h1>hi</h1>']],
                }),
                mockTextToken('data'),
                mockToken({ type: 'link_close' }),
            ];
            expect(renderInline(tokens, noPlugins)).toBe('<a href="">data</a>');
        });

        it('href 内の & をエスケープ', () => {
            const tokens = [
                mockToken({
                    type: 'link_open',
                    attrs: [['href', 'https://example.com?a=1&b=2']],
                }),
                mockTextToken('link'),
                mockToken({ type: 'link_close' }),
            ];
            expect(renderInline(tokens, noPlugins)).toBe(
                '<a href="https://example.com?a=1&amp;b=2">link</a>',
            );
        });
    });

    it('複合的なインライン要素を正しく結合', () => {
        const tokens = [
            mockTextToken('Hello '),
            mockToken({ type: 'strong_open' }),
            mockTextToken('bold'),
            mockToken({ type: 'strong_close' }),
            mockTextToken(' and '),
            mockToken({ type: 'em_open' }),
            mockTextToken('italic'),
            mockToken({ type: 'em_close' }),
        ];
        expect(renderInline(tokens, noPlugins)).toBe(
            'Hello <strong>bold</strong> and <em>italic</em>',
        );
    });

    it('インライン数式を KaTeX ショートコードに変換（katex 有効時）', () => {
        const tokens = [mockTextToken('before $x^2$ after')];
        expect(renderInline(tokens, katexPlugins)).toBe(
            'before [katex]x^2[/katex] after',
        );
    });

    it('1段落に複数のインライン数式を変換（katex 有効時）', () => {
        const tokens = [mockTextToken('$a$ and $b$')];
        expect(renderInline(tokens, katexPlugins)).toBe(
            '[katex]a[/katex] and [katex]b[/katex]',
        );
    });

    it('エスケープされた $ は通常文字として扱う（katex 有効時）', () => {
        const tokens = [mockTextToken('price is \\$10')];
        expect(renderInline(tokens, katexPlugins)).toBe('price is $10');
    });

    it('display math 形式の $$...$$ はインライン数式として変換しない（katex 有効時）', () => {
        const tokens = [mockTextToken('see $$x^2$$ end')];
        expect(renderInline(tokens, katexPlugins)).toBe('see $$x^2$$ end');
    });

    it('katex 無効時は $ をプレーンテキストとして扱う', () => {
        const tokens = [mockTextToken('before $x^2$ after')];
        expect(renderInline(tokens, noPlugins)).toBe('before $x^2$ after');
    });

    it('html_inline をパススルーして保持する', () => {
        const tokens = [
            mockTextToken('before '),
            mockToken({
                type: 'html_inline',
                content: '<span class="x">ok</span>',
            }),
            mockTextToken(' after'),
        ];
        expect(renderInline(tokens, noPlugins)).toBe(
            'before <span class="x">ok</span> after',
        );
    });

    it('image トークンを img タグに変換する', () => {
        const imgToken = mockToken({
            type: 'image',
            content: 'alt text',
            attrs: [
                ['src', 'https://example.com/img.png'],
                ['alt', ''],
            ],
        });
        expect(renderInline([imgToken], noPlugins)).toBe(
            '<img src="https://example.com/img.png" alt="alt text">',
        );
    });

    it('テキストと画像が混在する段落を描画する', () => {
        const tokens = [
            mockTextToken('see '),
            mockToken({
                type: 'image',
                content: 'photo',
                attrs: [
                    ['src', 'img.jpg'],
                    ['alt', ''],
                ],
            }),
            mockTextToken(' here'),
        ];
        expect(renderInline(tokens, noPlugins)).toBe(
            'see <img src="img.jpg" alt="photo"> here',
        );
    });

    it('image の src と alt を HTML エスケープする', () => {
        const imgToken = mockToken({
            type: 'image',
            content: 'a "quoted" & <alt>',
            attrs: [
                ['src', 'img.jpg?a=1&b=2'],
                ['alt', ''],
            ],
        });
        expect(renderInline([imgToken], noPlugins)).toBe(
            '<img src="img.jpg?a=1&amp;b=2" alt="a &quot;quoted&quot; &amp; &lt;alt&gt;">',
        );
    });
});
