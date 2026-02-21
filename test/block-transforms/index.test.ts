import { describe, it, expect } from 'vitest';
import { parseMd } from '../../lib/md-parser.js';
import { transformTokens } from '../../lib/block-transforms/index.js';
import { mockToken, mockInlineToken } from '../helpers/mock-token.js';

const noPlugins = new Set<string>();

describe('transformTokens', () => {
    it('空のトークン配列: 空のブロック配列を返す', () => {
        const { blocks } = transformTokens([], noPlugins);
        expect(blocks).toHaveLength(0);
    });

    it('単一の段落を変換', () => {
        const { tokens } = parseMd('Hello world');
        const { blocks } = transformTokens(tokens, noPlugins);
        expect(blocks).toHaveLength(1);
        expect(blocks[0].name).toBe('core/paragraph');
    });

    it('複数ブロックの統合変換（段落 + 見出し + コードブロック）', () => {
        const { tokens } = parseMd(`段落テキスト

## 見出し

\`\`\`js
const x = 1;
\`\`\``);
        const { blocks } = transformTokens(tokens, noPlugins);
        expect(blocks).toHaveLength(3);
        expect(blocks[0].name).toBe('core/paragraph');
        expect(blocks[1].name).toBe('core/heading');
        expect(blocks[2].name).toBe('core/code');
    });

    it('未対応トークンを warnings に記録', () => {
        const unknownToken = mockToken({
            type: 'unknown_custom_type',
            map: [5, 6],
        });
        const { warnings } = transformTokens([unknownToken], noPlugins);
        expect(warnings).toHaveLength(1);
        expect(warnings[0]).toEqual({
            type: 'unsupported_token',
            tokenType: 'unknown_custom_type',
            line: 5,
        });
    });

    it('CONSUMED_TOKEN_TYPES のトークンは warnings に含まれない', () => {
        const consumedTokens = [
            mockToken({ type: 'paragraph_close' }),
            mockToken({ type: 'inline' }),
        ];
        const { warnings } = transformTokens(consumedTokens, noPlugins);
        expect(warnings).toHaveLength(0);
    });

    it('境界ケース: paragraph_open が末尾（後続トークンなし）→ incomplete_token 警告', () => {
        const tokens = [mockToken({ type: 'paragraph_open', map: [3, 4] })];
        const { blocks, warnings } = transformTokens(tokens, noPlugins);
        expect(blocks).toHaveLength(0);
        expect(warnings).toHaveLength(1);
        expect(warnings[0]).toEqual({
            type: 'incomplete_token',
            tokenType: 'paragraph_open',
            line: 3,
        });
    });

    it('境界ケース: heading_open が末尾（後続トークンなし）→ incomplete_token 警告', () => {
        const tokens = [
            mockToken({ type: 'heading_open', tag: 'h2', map: [7, 8] }),
        ];
        const { blocks, warnings } = transformTokens(tokens, noPlugins);
        expect(blocks).toHaveLength(0);
        expect(warnings).toHaveLength(1);
        expect(warnings[0]).toEqual({
            type: 'incomplete_token',
            tokenType: 'heading_open',
            line: 7,
        });
    });

    it('plugins に katex を含む場合、インライン数式を paragraph ブロック（[katex]ショートコード）に変換', () => {
        const { tokens } = parseMd('$E = mc^2$');
        const { blocks } = transformTokens(tokens, new Set(['katex']));
        expect(blocks).toHaveLength(1);
        expect(blocks[0].name).toBe('core/paragraph');
        expect(String(blocks[0].attributes.content)).toBe(
            '[katex]E = mc^2[/katex]',
        );
    });

    it('段落が単独 URL の場合、embed ブロックに変換', () => {
        const { tokens } = parseMd(
            'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        );
        const { blocks } = transformTokens(tokens, new Set());
        expect(blocks).toHaveLength(1);
        expect(blocks[0].name).toBe('core/embed');
    });

    it('inline children の未対応トークンを unsupported_inline_token として収集', () => {
        const inlineToken = mockInlineToken([
            mockToken({ type: 'text', content: 'hello' }),
            mockToken({ type: 'footnote_ref' }),
            mockToken({ type: 'abbr_open' }),
        ]);
        inlineToken.map = [10, 11];
        const tokens = [inlineToken];

        const { warnings } = transformTokens(tokens, noPlugins);
        const inlineWarnings = warnings.filter(
            (w) => w.type === 'unsupported_inline_token',
        );
        expect(inlineWarnings).toHaveLength(2);
        expect(inlineWarnings[0]).toEqual({
            type: 'unsupported_inline_token',
            tokenType: 'footnote_ref',
            line: 10,
        });
        expect(inlineWarnings[1]).toEqual({
            type: 'unsupported_inline_token',
            tokenType: 'abbr_open',
            line: 10,
        });
    });

    it('inline children の対応済みトークンは警告に含まれない', () => {
        const inlineToken = mockInlineToken([
            mockToken({ type: 'text', content: 'normal' }),
            mockToken({ type: 'strong_open' }),
            mockToken({ type: 'text', content: 'bold' }),
            mockToken({ type: 'strong_close' }),
        ]);
        const tokens = [inlineToken];

        const { warnings } = transformTokens(tokens, noPlugins);
        const inlineWarnings = warnings.filter(
            (w) => w.type === 'unsupported_inline_token',
        );
        expect(inlineWarnings).toHaveLength(0);
    });
});
