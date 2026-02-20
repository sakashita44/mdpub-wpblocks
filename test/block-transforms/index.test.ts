import { describe, it, expect, vi, afterEach } from 'vitest';
import { parseMd } from '../../lib/md-parser.js';
import { transformTokens } from '../../lib/block-transforms/index.js';
import { mockToken } from '../helpers/mock-token.js';

const noPlugins = new Set<string>();

describe('transformTokens', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('空のトークン配列: 空のブロック配列を返す', () => {
        const blocks = transformTokens([], noPlugins);
        expect(blocks).toHaveLength(0);
    });

    it('単一の段落を変換', () => {
        const { tokens } = parseMd('Hello world');
        const blocks = transformTokens(tokens, noPlugins);
        expect(blocks).toHaveLength(1);
        expect(blocks[0].name).toBe('core/paragraph');
    });

    it('複数ブロックの統合変換（段落 + 見出し + コードブロック）', () => {
        const { tokens } = parseMd(`段落テキスト

## 見出し

\`\`\`js
const x = 1;
\`\`\``);
        const blocks = transformTokens(tokens, noPlugins);
        expect(blocks).toHaveLength(3);
        expect(blocks[0].name).toBe('core/paragraph');
        expect(blocks[1].name).toBe('core/heading');
        expect(blocks[2].name).toBe('core/code');
    });

    it('未対応トークンに対して console.warn を出力', () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const unknownToken = mockToken({ type: 'unknown_custom_type' });
        transformTokens([unknownToken], noPlugins);
        expect(warnSpy).toHaveBeenCalledWith(
            expect.stringMatching(
                /^\[warn\] 未対応トークン: unknown_custom_type（スキップ）$/,
            ),
        );
    });

    it('CONSUMED_TOKEN_TYPES のトークンは console.warn を出力しない', () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const consumedTokens = [
            mockToken({ type: 'paragraph_close' }),
            mockToken({ type: 'inline' }),
        ];
        transformTokens(consumedTokens, noPlugins);
        expect(warnSpy).not.toHaveBeenCalled();
    });

    it('境界ケース: paragraph_open が末尾（後続トークンなし）', () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const tokens = [mockToken({ type: 'paragraph_open' })];
        const blocks = transformTokens(tokens, noPlugins);
        expect(warnSpy).toHaveBeenCalledWith(
            expect.stringMatching(
                /^\[warn\] paragraph_open の後にトークンがありません$/,
            ),
        );
        expect(blocks).toHaveLength(0);
    });

    it('境界ケース: heading_open が末尾（後続トークンなし）', () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const tokens = [mockToken({ type: 'heading_open', tag: 'h2' })];
        const blocks = transformTokens(tokens, noPlugins);
        expect(warnSpy).toHaveBeenCalledWith(
            expect.stringMatching(
                /^\[warn\] heading_open の後にトークンがありません$/,
            ),
        );
        expect(blocks).toHaveLength(0);
    });
});
