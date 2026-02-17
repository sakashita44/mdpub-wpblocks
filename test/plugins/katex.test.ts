import { describe, it, expect } from 'vitest';
import {
    renderTextWithInlineMath,
    extractDisplayMath,
    transformDisplayMath,
} from '../../lib/plugins/katex.js';
import { mockToken } from '../helpers/mock-token.js';
import type { Block } from '@wordpress/blocks';

describe('renderTextWithInlineMath', () => {
    it('インライン数式を KaTeX ショートコードに変換', () => {
        expect(renderTextWithInlineMath('before $x^2$ after')).toBe(
            'before [katex]x^2[/katex] after',
        );
    });

    it('複数のインライン数式を変換', () => {
        expect(renderTextWithInlineMath('$a$ and $b$')).toBe(
            '[katex]a[/katex] and [katex]b[/katex]',
        );
    });

    it('エスケープされた $ は通常文字として扱う', () => {
        expect(renderTextWithInlineMath('price is \\$10')).toBe('price is $10');
    });

    it('$$...$$ はインライン数式として変換しない', () => {
        expect(renderTextWithInlineMath('see $$x^2$$ end')).toBe(
            'see $$x^2$$ end',
        );
    });

    it('数式を含まないテキストはエスケープのみ', () => {
        expect(renderTextWithInlineMath('Hello & "world"')).toBe(
            'Hello &amp; &quot;world&quot;',
        );
    });
});

describe('extractDisplayMath', () => {
    it('$$...$$ からディスプレイ数式を抽出', () => {
        const token = mockToken({
            type: 'inline',
            content: '$$\\int_0^1 f(x)dx$$',
        });
        expect(extractDisplayMath(token)).toBe('\\int_0^1 f(x)dx');
    });

    it('通常テキストでは null を返す', () => {
        const token = mockToken({
            type: 'inline',
            content: 'just text',
        });
        expect(extractDisplayMath(token)).toBeNull();
    });

    it('空の $$$$ では null を返す', () => {
        const token = mockToken({
            type: 'inline',
            content: '$$$$',
        });
        expect(extractDisplayMath(token)).toBeNull();
    });
});

describe('transformDisplayMath', () => {
    it('core/shortcode ブロックを生成', () => {
        const mockCreateBlock = (
            name: string,
            attributes?: Record<string, unknown>,
        ): Block => ({ name, attributes, innerBlocks: [] }) as unknown as Block;

        const block = transformDisplayMath('x^2', {
            createBlock: mockCreateBlock,
        });
        expect(block.name).toBe('core/shortcode');
        expect(block.attributes?.text).toBe('[katex display=true]x^2[/katex]');
    });
});
