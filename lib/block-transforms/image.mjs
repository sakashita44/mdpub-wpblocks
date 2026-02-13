/**
 * core/image ブロック変換
 *
 * paragraph 内の inline トークンが画像のみの場合に core/image ブロックを生成する。
 * 画像パスは変換時点ではローカルパスのまま保持し、
 * メディア URL への置換は投稿時（Issue #7）に実施する。
 */

/**
 * inline トークンの children が画像のみかどうか判定
 * softbreak, hardbreak, 空白テキストは無視する
 * @param {import('markdown-it').Token[]} children
 * @returns {boolean}
 */
export function isImageOnly(children) {
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

/**
 * 画像トークンから alt テキストをプレーンテキストとして取得
 * @param {import('markdown-it').Token} imageToken
 * @returns {string}
 */
function getAltText(imageToken) {
    if (!imageToken.children || imageToken.children.length === 0) return '';
    return imageToken.children
        .filter((c) => c.type === 'text')
        .map((c) => c.content)
        .join('');
}

/**
 * inline トークンの画像を core/image ブロックに変換
 * @param {import('markdown-it').Token} inlineToken - type: 'inline' のトークン
 * @param {{ createBlock: Function }} deps
 * @returns {import('@wordpress/blocks').Block}
 */
export function transformImage(inlineToken, { createBlock }) {
    const imageToken = inlineToken.children.find((c) => c.type === 'image');

    const url = imageToken.attrGet('src') || '';
    const alt = getAltText(imageToken);
    const caption = imageToken.attrGet('title') || '';

    const attrs = {
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
