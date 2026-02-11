/**
 * テスト共通セットアップ
 *
 * DOM ポリフィル + @wordpress/blocks 初期化を全テストで共有する。
 * vitest.config.mjs の setupFiles で指定。
 */

import '../lib/wp-env.mjs';
