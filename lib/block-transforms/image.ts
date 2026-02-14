/**
 * core/image ブロック変換
 *
 * paragraph 内の inline トークンが画像のみの場合に core/image ブロックを生成する。
 * 画像パスは変換時点ではローカルパスのまま保持し、
 * メディア URL への置換は投稿時に実施する。
 */

import type Token from 'markdown-it/lib/token.mjs';
import type { Block } from '@wordpress/blocks';
import type { TransformDeps } from '../types.js';

/**
 * inline トークンの children が画像のみかどうか判定
 * softbreak, hardbreak, 空白テキストは無視する
 */
export function isImageOnly(children: Token[] | null): boolean {
    if (!children || children.length === 0) return false;

    let hasImage = false;
    for (const child of children) {
        if (child.type === 'image') {
            hasImage = true;
        } else if (child.type === 'softbreak' || child.type === 'hardbreak') {
            // 無視
        } else if (child.type === 'text' && child.content.trim() === '') {
            // 空白テキストは無視
        } else {
            return false;
        }
    }
    return hasImage;
}

/** 画像トークンから alt テキストをプレーンテキストとして取得 */
function getAltText(imageToken: Token): string {
    if (!imageToken.children || imageToken.children.length === 0) return '';
    return imageToken.children
        .filter((c: Token) => c.type === 'text')
        .map((c: Token) => c.content)
        .join('');
}

/** 画像トークン1件を core/image ブロックに変換 */
export function transformImageToken(
    imageToken: Token,
    { createBlock }: Pick<TransformDeps, 'createBlock'>,
): Block {
    const url = imageToken.attrGet('src') || '';
    const alt = getAltText(imageToken);
    const caption = imageToken.attrGet('title') || '';

    const attrs: Record<string, unknown> = {
        url,
        alt,
        sizeSlug: 'medium',
        align: 'center',
        lightbox: { enabled: true },
    };

    if (caption) {
        attrs.caption = caption;
    }

    return createBlock('core/image', attrs);
}

/** inline トークンの画像を core/image ブロックに変換 */
export function transformImage(
    inlineToken: Token,
    { createBlock }: Pick<TransformDeps, 'createBlock'>,
): Block {
    const imageToken = inlineToken.children!.find(
        (c: Token) => c.type === 'image',
    )!;
    return transformImageToken(imageToken, { createBlock });
}
