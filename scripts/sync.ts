/**
 * CLI: WP プラグイン情報を取得し .mdpub-cache.json に書き出す
 *
 * 使い方:
 *   node dist/scripts/sync.js
 */

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createWpClient, loadEnv, getWpConfig } from '../lib/wp-client.js';
import { mapWpPlugins } from '../lib/plugins/wp-plugin-map.js';
import { resolveProjectRoot } from '../lib/project-root.js';
import type { MdpubCache, WpClientConfig } from '../lib/types.js';

const projectRoot = resolveProjectRoot(import.meta.url);

loadEnv(resolve(projectRoot, '.env'));

main().catch((e: unknown) => {
    console.error(`❌ sync に失敗しました: ${(e as Error).message}`);
    process.exit(1);
});

async function main(): Promise<void> {
    let config: WpClientConfig;
    try {
        config = getWpConfig();
    } catch (e) {
        console.error((e as Error).message);
        process.exit(1);
    }

    const wp = createWpClient(config);
    const wpPlugins = await wp.listPlugins();
    const mdpubPlugins = mapWpPlugins(wpPlugins);

    const cache: MdpubCache = {
        generatedAt: new Date().toISOString(),
        plugins: [...mdpubPlugins],
    };

    const outputPath = resolve(projectRoot, '.mdpub-cache.json');
    writeFileSync(outputPath, JSON.stringify(cache, null, 4) + '\n', 'utf-8');
    console.log(
        `✅ ${outputPath} を生成しました（plugins: ${mdpubPlugins.size}）`,
    );
    process.exit(0);
}
