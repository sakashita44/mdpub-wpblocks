import { describe, it, expect } from 'vitest';
import type Token from 'markdown-it/lib/token.mjs';
import { createBlock } from '../../lib/wp-env.js';
import { parseMd } from '../../lib/md-parser.js';
import { transformTokens } from '../../lib/block-transforms/index.js';
import {
    transformImage,
    isImageOnly,
} from '../../lib/block-transforms/image.js';

const deps = { createBlock };

/** 画像トークンのモック */
function fakeImageToken(src: string, altText: string, title: string): Token {
    const attrs: string[][] = [
        ['src', src],
        ['alt', ''],
        ...(title ? [['title', title]] : []),
    ];
    return {
        type: 'image',
        attrs,
        attrGet(key: string) {
            const pair = attrs.find((a) => a[0] === key);
            return pair ? pair[1] : null;
        },
        children: [{ type: 'text', content: altText }],
    } as unknown as Token;
}

/** 画像のみの inline トークンを生成 */
function fakeImageInline(src: string, altText = '', title = ''): Token {
    return {
        type: 'inline',
        children: [fakeImageToken(src, altText, title)],
    } as unknown as Token;
}

describe('isImageOnly', () => {
    it('画像のみの children → true', () => {
        const children = [
            fakeImageToken('img.jpg', 'alt', ''),
        ] as unknown as Token[];
        expect(isImageOnly(children)).toBe(true);
    });

    it('空の children → false', () => {
        expect(isImageOnly([])).toBe(false);
        expect(isImageOnly(null)).toBe(false);
    });

    it('テキスト混在の children → false', () => {
        const children = [
            { type: 'text', content: 'Before ' },
            fakeImageToken('img.jpg', 'alt', ''),
        ] as unknown as Token[];
        expect(isImageOnly(children)).toBe(false);
    });

    it('空白テキスト + 画像 → true', () => {
        const children = [
            { type: 'text', content: '  ' },
            fakeImageToken('img.jpg', 'alt', ''),
        ] as unknown as Token[];
        expect(isImageOnly(children)).toBe(true);
    });

    it('softbreak + 画像 → true', () => {
        const children = [
            fakeImageToken('img.jpg', 'alt', ''),
            { type: 'softbreak' },
        ] as unknown as Token[];
        expect(isImageOnly(children)).toBe(true);
    });
});

describe('transformImage', () => {
    it('基本的な画像を core/image に変換', () => {
        const inline = fakeImageInline('images/photo.jpg', 'alt text');
        const block = transformImage(inline, deps);

        expect(block.name).toBe('core/image');
        expect(block.attributes.url).toBe('images/photo.jpg');
        expect(block.attributes.alt).toBe('alt text');
        expect(block.attributes.sizeSlug).toBe('medium');
        expect(block.attributes.align).toBe('center');
        expect(block.attributes.lightbox).toEqual({ enabled: true });
    });

    it('title をキャプションとして設定', () => {
        const inline = fakeImageInline('images/photo.jpg', 'alt', 'My Caption');
        const block = transformImage(inline, deps);

        expect(String(block.attributes.caption)).toBe('My Caption');
    });

    it('title なしの場合は caption を設定しない', () => {
        const inline = fakeImageInline('images/photo.jpg', 'alt');
        const block = transformImage(inline, deps);

        // core/image の caption は未指定でも空の RichTextData が入る
        expect(String(block.attributes.caption || '')).toBe('');
    });

    it('共通画像パスを保持', () => {
        const inline = fakeImageInline('../shared/logo.png', 'logo');
        const block = transformImage(inline, deps);

        expect(block.attributes.url).toBe('../shared/logo.png');
    });

    it('alt テキストが空の場合', () => {
        const imageAttrs: string[][] = [
            ['src', 'img.jpg'],
            ['alt', ''],
        ];
        const inline = {
            type: 'inline',
            children: [
                {
                    type: 'image',
                    attrs: imageAttrs,
                    attrGet(key: string) {
                        const pair = imageAttrs.find((a) => a[0] === key);
                        return pair ? pair[1] : null;
                    },
                    children: [],
                },
            ],
        } as unknown as Token;
        const block = transformImage(inline, deps);

        expect(block.attributes.alt).toBe('');
    });
});

describe('transformTokens (image paragraph)', () => {
    it('同一段落に画像が複数ある場合は画像数分の core/image を生成', () => {
        const { tokens } = parseMd('![a](img/a.jpg) ![b](img/b.jpg)');
        const blocks = transformTokens(tokens);

        expect(blocks).toHaveLength(2);
        expect(blocks[0].name).toBe('core/image');
        expect(blocks[1].name).toBe('core/image');
        expect(blocks[0].attributes.url).toBe('img/a.jpg');
        expect(blocks[1].attributes.url).toBe('img/b.jpg');
    });
});
