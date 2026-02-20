/**
 * DOM ポリフィル + @wordpress/blocks 初期化
 *
 * Node.js 環境で Gutenberg ブロックを生成・シリアライズするために、
 * happy-dom で DOM API をグローバルに登録し、WordPress Blocks を初期化する。
 *
 * 使い方: 他のモジュールより先に `import 'lib/wp-env.js'` を呼ぶ。
 */

import { createRequire } from 'node:module';
import { Window } from 'happy-dom';
import type {
    Block,
    BlockType,
    createBlock as CreateBlockFn,
    serialize as SerializeFn,
    registerBlockType as RegisterBlockTypeFn,
    getBlockTypes as GetBlockTypesFn,
} from '@wordpress/blocks';

const require = createRequire(import.meta.url);
const window = new Window({ url: 'https://localhost' });

let wpEnvCleaned = false;

/**
 * happy-dom の Window が保持するリソース（タイマー等）を解放する。
 * 冪等（二重呼び出し可）。`beforeExit` イベントでも自動実行されるため、
 * 明示的に呼ばなくてもプロセスは自然に終了する。
 */
export function cleanupWpEnv(): void {
    if (wpEnvCleaned) return;
    wpEnvCleaned = true;
    window.happyDOM.abort();
}

/**
 * テスト用: プロセスイベントリスナーを解除し、クリーンアップフラグをリセットする。
 * vitest で wp-env.ts を import するたびにリスナーが蓄積しないよう、
 * afterEach 等で呼ぶことを想定している。
 */
export function _resetWpEnvForTest(): void {
    process.removeListener('beforeExit', cleanupWpEnv);
    wpEnvCleaned = false;
}

// happyDOM.abort() は非同期（Promise を返す）のため exit ではなく beforeExit を使用する。
// 呼び忘れによるハングを防止するため、イベントループ終了時に自動実行。
process.on('beforeExit', cleanupWpEnv);

// @wordpress/blocks が参照する DOM API をグローバルに登録
const domGlobals = [
    'document',
    'window',
    'navigator',
    'HTMLElement',
    'HTMLInputElement',
    'HTMLSelectElement',
    'HTMLTextAreaElement',
    'HTMLButtonElement',
    'HTMLAnchorElement',
    'HTMLFormElement',
    'HTMLImageElement',
    'Node',
    'Element',
    'DocumentFragment',
    'DOMParser',
    'MutationObserver',
    'CustomEvent',
    'Event',
    'CSSStyleDeclaration',
    'getComputedStyle',
    'requestAnimationFrame',
    'cancelAnimationFrame',
    'URL',
    'URLSearchParams',
    'IntersectionObserver',
    'ResizeObserver',
    'matchMedia',
] as const;

for (const key of domGlobals) {
    if (
        (globalThis as Record<string, unknown>)[key] === undefined &&
        (window as unknown as Record<string, unknown>)[key] !== undefined
    ) {
        (globalThis as Record<string, unknown>)[key] = (
            window as unknown as Record<string, unknown>
        )[key];
    }
}

// matchMedia フォールバック（happy-dom が未実装の場合）
if (typeof globalThis.matchMedia !== 'function') {
    globalThis.matchMedia = () =>
        ({
            matches: false,
            media: '',
            addEventListener: () => {},
            removeEventListener: () => {},
            addListener: () => {},
            removeListener: () => {},
            onchange: null,
            dispatchEvent: () => false,
        }) as unknown as MediaQueryList;
}

// @wordpress/blocks を初期化
// ESM 版は Node.js v22+ で JSON import attribute エラーになるため CJS 版を使用
const wpBlocks = require('@wordpress/blocks') as {
    createBlock: typeof CreateBlockFn;
    serialize: typeof SerializeFn;
    registerBlockType: typeof RegisterBlockTypeFn;
    getBlockTypes: typeof GetBlockTypesFn;
};
const { registerCoreBlocks } = require('@wordpress/block-library') as {
    registerCoreBlocks: () => void;
};

const { createBlock, serialize, registerBlockType, getBlockTypes } = wpBlocks;

registerCoreBlocks();

export { createBlock, serialize, registerBlockType, getBlockTypes };
export type { Block, BlockType };
