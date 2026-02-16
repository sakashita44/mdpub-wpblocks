import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        // wp-env（DOM ポリフィル + WP Blocks 初期化）を全テスト共通で実行
        setupFiles: ['./test/setup.ts'],
        // Node v24 + Windows 環境での queued 停滞を避ける
        pool: 'forks',
        maxWorkers: 1,
    },
});
