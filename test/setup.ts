/**
 * テスト共通セットアップ
 *
 * DOM ポリフィル + @wordpress/blocks 初期化を全テストで共有する。
 * vitest.config の setupFiles で指定。
 */

import '../lib/wp-env.js';
