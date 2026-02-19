/**
 * CLI: WP プラグイン情報を取得し .mdpub-cache.json に書き出す
 *
 * 使い方:
 *   node dist/scripts/sync.js
 */

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createWpClient, getWpConfig } from '../lib/wp-client.js';
import { initEnv } from '../lib/env.js';
import { mapWpPlugins } from '../lib/plugins/wp-plugin-map.js';
import { resolveProjectRoot } from '../lib/project-root.js';
import type { MdpubCache, WpClientConfig } from '../lib/types.js';

const projectRoot = resolveProjectRoot(import.meta.url);

initEnv(resolve(projectRoot, '.env'));

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

    let wpPlugins;
    try {
        wpPlugins = await wp.listPlugins();
    } catch (e) {
        const msg = (e as Error).message || '';
        if (/403|401|Forbidden|Unauthorized/i.test(msg)) {
            console.error(
                'プラグイン一覧の取得に失敗しました。WordPress の Application Password に管理者権限があるか確認してください。',
            );
        }
        throw e;
    }
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
}
