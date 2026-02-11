import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        // wp-env（DOM ポリフィル + WP Blocks 初期化）を全テスト共通で実行
        setupFiles: ['./test/setup.mjs'],
    },
});
