import { describe, it, expect } from 'vitest';
import type Token from 'markdown-it/lib/token.mjs';
import { createBlock } from '../../lib/wp-env.js';
import { renderInline } from '../../lib/inline-format.js';
import { transformHeading } from '../../lib/block-transforms/heading.js';

const deps = { createBlock, renderInline };

/** heading_open トークンのモック */
function fakeHeadingOpen(level: number): Token {
    return { type: 'heading_open', tag: `h${level}` } as unknown as Token;
}

/** inline トークンのモック（children にテキストトークンを持つ） */
function fakeInline(text: string): Token {
    return {
        type: 'inline',
        children: [{ type: 'text', content: text }],
    } as unknown as Token;
}

describe('transformHeading', () => {
    it('h1 を level: 1 で変換', () => {
        const block = transformHeading(
            fakeHeadingOpen(1),
            fakeInline('Title'),
            deps,
        );
        expect(block.name).toBe('core/heading');
        expect(String(block.attributes.content)).toBe('Title');
        expect(block.attributes.level).toBe(1);
    });

    it('h3 を level: 3 で変換', () => {
        const block = transformHeading(
            fakeHeadingOpen(3),
            fakeInline('Section'),
            deps,
        );
        expect(block.attributes.level).toBe(3);
    });

    it('h6 を level: 6 で変換', () => {
        const block = transformHeading(
            fakeHeadingOpen(6),
            fakeInline('Small'),
            deps,
        );
        expect(block.attributes.level).toBe(6);
    });

    it('インライン要素を含む見出しを変換', () => {
        const inlineToken = {
            type: 'inline',
            children: [
                { type: 'text', content: 'Hello ' },
                { type: 'strong_open' },
                { type: 'text', content: 'World' },
                { type: 'strong_close' },
            ],
        } as unknown as Token;
        const block = transformHeading(fakeHeadingOpen(2), inlineToken, deps);
        expect(String(block.attributes.content)).toBe(
            'Hello <strong>World</strong>',
        );
    });
});
