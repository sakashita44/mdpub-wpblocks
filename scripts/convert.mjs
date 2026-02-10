/**
 * CLI: Markdown → Gutenberg ブロック HTML 変換
 *
 * TODO: Issue #2 で MD パース + ブロック変換を実装
 */

import { createBlock, serialize } from '../lib/wp-env.mjs';

// 仮実装: 動作確認用
const block = createBlock('core/paragraph', {
  content: 'test',
});

console.log(serialize(block));
process.exit(0);
