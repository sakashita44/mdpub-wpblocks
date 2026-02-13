/**
 * 数式変換
 */

const DISPLAY_MATH_PATTERN = /^\$\$([\s\S]*?)\$\$$/;

/**
 * inline トークンが display math 段落かどうか判定し、数式本体を返す
 * @param {import('markdown-it').Token} inlineToken
 * @returns {string|null}
 */
export function extractDisplayMath(inlineToken) {
    if (!inlineToken) return null;

    const raw = String(inlineToken.content || '').trim();
    const match = raw.match(DISPLAY_MATH_PATTERN);
    if (!match) return null;

    const expr = match[1].trim();
    return expr || null;
}

/**
 * display math を core/shortcode に変換
 * @param {string} expr
 * @param {{ createBlock: Function }} deps
 * @returns {import('@wordpress/blocks').Block}
 */
export function transformDisplayMath(expr, { createBlock }) {
    return createBlock('core/shortcode', {
        text: `[katex display=true]${expr}[/katex]`,
    });
}
