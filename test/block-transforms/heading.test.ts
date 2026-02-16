import { describe, it, expect } from 'vitest';
import { createBlock } from '../../lib/wp-env.js';
import { renderInline } from '../../lib/inline-format.js';
import { transformHeading } from '../../lib/block-transforms/heading.js';
import {
    mockToken,
    mockTextToken,
    mockInlineToken,
} from '../helpers/mock-token.js';

const deps = { createBlock, renderInline };

/** heading_open トークンのモック */
function fakeHeadingOpen(level: number) {
    return mockToken({ type: 'heading_open', tag: `h${level}` });
}

/** inline トークンのモック（children にテキストトークンを持つ） */
function fakeInline(text: string) {
    return mockInlineToken([mockTextToken(text)]);
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
        const inlineToken = mockInlineToken([
            mockTextToken('Hello '),
            mockToken({ type: 'strong_open' }),
            mockTextToken('World'),
            mockToken({ type: 'strong_close' }),
        ]);
        const block = transformHeading(fakeHeadingOpen(2), inlineToken, deps);
        expect(String(block.attributes.content)).toBe(
            'Hello <strong>World</strong>',
        );
    });
});
