import { describe, it, expect } from 'vitest';
import { collectUnsupportedTokens } from '../lib/validate-tokens.js';
import { mockToken } from './helpers/mock-token.js';

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
});
