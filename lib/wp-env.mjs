/**
 * DOM ポリフィル + @wordpress/blocks 初期化
 *
 * Node.js 環境で Gutenberg ブロックを生成・シリアライズするために、
 * happy-dom で DOM API をグローバルに登録し、WordPress Blocks を初期化する。
 *
 * 使い方: 他のモジュールより先に `import 'lib/wp-env.mjs'` を呼ぶ。
 */

import { createRequire } from 'node:module';
import { Window } from 'happy-dom';

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
];

for (const key of domGlobals) {
  if (globalThis[key] === undefined && window[key] !== undefined) {
    globalThis[key] = window[key];
  }
}

// matchMedia フォールバック（happy-dom が未実装の場合）
if (typeof globalThis.matchMedia !== 'function') {
  globalThis.matchMedia = () => ({
    matches: false,
    media: '',
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    onchange: null,
    dispatchEvent: () => false,
  });
}

// @wordpress/blocks を初期化
// ESM 版は Node.js v22+ で JSON import attribute エラーになるため CJS 版を使用
const wpBlocks = require('@wordpress/blocks');
const { registerCoreBlocks } = require('@wordpress/block-library');

const { createBlock, serialize, registerBlockType, getBlockTypes } = wpBlocks;

registerCoreBlocks();

export { createBlock, serialize, registerBlockType, getBlockTypes };
