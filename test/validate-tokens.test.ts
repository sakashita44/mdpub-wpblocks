import { describe, it, expect } from 'vitest';
import { collectUnsupportedTokens } from '../lib/validate-tokens.js';
import { mockToken, mockInlineToken } from './helpers/mock-token.js';

describe('collectUnsupportedTokens', () => {
    it('未対応トークンを検出する', () => {
        const tokens = [
            mockToken({ type: 'unknown_type', map: [2, 3] }),
            mockToken({ type: 'another_unknown', map: [10, 11] }),
        ];
        const warnings = collectUnsupportedTokens(tokens);
        expect(warnings).toHaveLength(2);
        expect(warnings[0]).toEqual({
            type: 'unsupported_token',
            tokenType: 'unknown_type',
            line: 2,
        });
        expect(warnings[1]).toEqual({
            type: 'unsupported_token',
            tokenType: 'another_unknown',
            line: 10,
        });
    });

    it('対応済みトークン（HANDLED_TOKEN_TYPES）は空配列を返す', () => {
        const tokens = [
            mockToken({ type: 'paragraph_open' }),
            mockToken({ type: 'heading_open' }),
            mockToken({ type: 'fence' }),
            mockToken({ type: 'table_open' }),
        ];
        const warnings = collectUnsupportedTokens(tokens);
        expect(warnings).toHaveLength(0);
    });

    it('消費済みトークン（CONSUMED_TOKEN_TYPES）は空配列を返す', () => {
        const tokens = [
            mockToken({ type: 'paragraph_close' }),
            mockToken({ type: 'inline' }),
            mockToken({ type: 'heading_close' }),
        ];
        const warnings = collectUnsupportedTokens(tokens);
        expect(warnings).toHaveLength(0);
    });

    it('map が null のトークンは line が undefined になる', () => {
        const tokens = [mockToken({ type: 'custom_block' })];
        const warnings = collectUnsupportedTokens(tokens);
        expect(warnings).toHaveLength(1);
        expect(warnings[0].line).toBeUndefined();
    });

    it('空のトークン配列は空配列を返す', () => {
        expect(collectUnsupportedTokens([])).toHaveLength(0);
    });

    it('inline children の未対応トークンを検出する', () => {
        const tokens = [
            mockInlineToken([
                mockToken({ type: 'text', content: 'hello' }),
                mockToken({ type: 'footnote_ref' }),
            ]),
        ];
        // inline トークン自体に map を設定
        tokens[0].map = [5, 6];

        const warnings = collectUnsupportedTokens(tokens);
        expect(warnings).toHaveLength(1);
        expect(warnings[0]).toEqual({
            type: 'unsupported_inline_token',
            tokenType: 'footnote_ref',
            line: 5,
        });
    });

    it('inline children の対応済みトークンは警告しない', () => {
        const tokens = [
            mockInlineToken([
                mockToken({ type: 'text', content: 'hello' }),
                mockToken({ type: 'strong_open' }),
                mockToken({ type: 'text', content: 'bold' }),
                mockToken({ type: 'strong_close' }),
                mockToken({ type: 'code_inline', content: 'code' }),
                mockToken({ type: 'softbreak' }),
                mockToken({ type: 'image' }),
            ]),
        ];
        const warnings = collectUnsupportedTokens(tokens);
        expect(warnings).toHaveLength(0);
    });

    it('トップレベルとインライン両方の未対応トークンを同時に検出する', () => {
        const tokens = [
            mockToken({ type: 'unknown_block', map: [1, 2] }),
            mockInlineToken([mockToken({ type: 'unknown_inline' })]),
        ];
        tokens[1].map = [3, 4];

        const warnings = collectUnsupportedTokens(tokens);
        expect(warnings).toHaveLength(2);
        expect(warnings[0].type).toBe('unsupported_token');
        expect(warnings[1].type).toBe('unsupported_inline_token');
    });
});
