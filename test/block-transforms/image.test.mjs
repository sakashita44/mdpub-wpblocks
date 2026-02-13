import { describe, it, expect } from 'vitest';
import { createBlock } from '../../lib/wp-env.mjs';
import {
    transformImage,
    isImageOnly,
} from '../../lib/block-transforms/image.mjs';

const deps = { createBlock };

/** 画像トークンのモック */
function fakeImageToken(src, altText, title) {
    return {
        type: 'image',
        attrs: [
            ['src', src],
            ['alt', ''],
            ...(title ? [['title', title]] : []),
        ],
        attrGet(key) {
            const pair = this.attrs.find((a) => a[0] === key);
            return pair ? pair[1] : null;
        },
        children: [{ type: 'text', content: altText }],
    };
}

/** 画像のみの inline トークンを生成 */
function fakeImageInline(src, altText = '', title = '') {
    return {
        type: 'inline',
        children: [fakeImageToken(src, altText, title)],
    };
}

describe('isImageOnly', () => {
    it('画像のみの children → true', () => {
        const children = [fakeImageToken('img.jpg', 'alt', '')];
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
        ];
        expect(isImageOnly(children)).toBe(false);
    });

    it('空白テキスト + 画像 → true', () => {
        const children = [
            { type: 'text', content: '  ' },
            fakeImageToken('img.jpg', 'alt', ''),
        ];
        expect(isImageOnly(children)).toBe(true);
    });

    it('softbreak + 画像 → true', () => {
        const children = [
            fakeImageToken('img.jpg', 'alt', ''),
            { type: 'softbreak' },
        ];
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
        const inline = {
            type: 'inline',
            children: [
                {
                    type: 'image',
                    attrs: [
                        ['src', 'img.jpg'],
                        ['alt', ''],
                    ],
                    attrGet(key) {
                        const pair = this.attrs.find((a) => a[0] === key);
                        return pair ? pair[1] : null;
                    },
                    children: [],
                },
            ],
        };
        const block = transformImage(inline, deps);

        expect(block.attributes.alt).toBe('');
    });
});
