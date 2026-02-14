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
