/**
 * 軽量トークン検証（wp-env 非依存）
 *
 * markdown-it トークン配列から未対応トークンを検出する。
 * validate-content CLI から利用するため、DOM ポリフィルや
 * @wordpress/blocks に依存しない。
 */

import type Token from 'markdown-it/lib/token.mjs';
import type { TransformWarning } from './types.js';
import {
    HANDLED_TOKEN_TYPES,
    CONSUMED_TOKEN_TYPES,
} from './block-transforms/token-types.js';

/** トークン配列から未対応トークンを収集 */
export function collectUnsupportedTokens(tokens: Token[]): TransformWarning[] {
    const warnings: TransformWarning[] = [];

    for (const token of tokens) {
        if (
            !HANDLED_TOKEN_TYPES.has(token.type) &&
            !CONSUMED_TOKEN_TYPES.has(token.type)
        ) {
            warnings.push({
                type: 'unsupported_token',
                tokenType: token.type,
                line: token.map?.[0],
            });
        }
    }

    return warnings;
}
