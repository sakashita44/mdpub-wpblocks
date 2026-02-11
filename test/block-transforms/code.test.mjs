import { describe, it, expect } from 'vitest';
import { createBlock } from '../../lib/wp-env.mjs';
import { transformCode } from '../../lib/block-transforms/code.mjs';

const deps = { createBlock };

/** fence トークンのモック */
function fakeFence(content, info = '') {
    return { type: 'fence', content, info };
}

describe('transformCode', () => {
    it('言語指定ありの fence を className 付きで変換', () => {
        const block = transformCode(fakeFence('const x = 1;\n', 'js'), deps);
        expect(block.name).toBe('core/code');
        // content は RichTextData にラップされるため toString() で比較
        expect(String(block.attributes.content)).toBe('const x = 1;');
        expect(block.attributes.className).toBe('language-js');
    });

    it('言語指定なしの fence は className を設定しない', () => {
        const block = transformCode(fakeFence('hello\n', ''), deps);
        expect(block.name).toBe('core/code');
        expect(String(block.attributes.content)).toBe('hello');
        expect(block.attributes.className).toBeUndefined();
    });

    it('HTML 特殊文字をエスケープ', () => {
        const block = transformCode(
            fakeFence('<div class="x">&</div>\n', 'html'),
            deps,
        );
        // RichTextData は &lt; &amp; を保持するが &quot; &gt; は正規化する
        const content = String(block.attributes.content);
        expect(content).toContain('&lt;');
        expect(content).toContain('&amp;');
        expect(content).not.toContain('<div');
    });
});
