/**
 * CLI: サーバ状態から .registry.yaml を再生成（Issue #8）
 */

import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stringify as stringifyYaml } from 'yaml';
import { createWpClient, loadEnv, getWpConfig } from '../lib/wp-client.mjs';
import { extractOption, resolveContentRoot } from '../lib/cli-config.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

loadEnv(resolve(projectRoot, '.env'));

const { value: outputPath, rest } = extractOption(
    process.argv.slice(2),
    '--output',
);
const { value: cliContentRoot } = extractOption(rest, '--content-root');

const output = resolve(projectRoot, outputPath || '.registry.yaml');
const { value: contentRoot } = resolveContentRoot({
    projectRoot,
    cliValue: cliContentRoot,
});

let config;
try {
    config = getWpConfig();
} catch (e) {
    console.error(e.message);
    process.exit(1);
}

try {
    const wp = createWpClient(config);
    const [posts, media] = await Promise.all([
        fetchAll((page, perPage) => wp.listPosts(page, perPage)),
        fetchAll((page, perPage) => wp.listMedia(page, perPage)),
    ]);

    const registry = {
        generatedAt: new Date().toISOString(),
        contentRoot,
        posts: posts.map((post) => ({
            id: post.id,
            slug: post.slug,
            status: post.status,
            date: post.date,
            modified: post.modified,
            link: post.link,
        })),
        media: media.map((item) => ({
            id: item.id,
            slug: item.slug,
            source_url: item.source_url,
            mime_type: item.mime_type,
        })),
    };

    writeFileSync(output, stringifyYaml(registry), 'utf-8');
    console.log(
        `✅ ${output} を生成しました（posts: ${posts.length}, media: ${media.length}）`,
    );
    process.exit(0);
} catch (e) {
    console.error(`❌ sync に失敗しました: ${e.message}`);
    process.exit(1);
}

async function fetchAll(fetchPage, pageSize = 100) {
    const all = [];
    let page = 1;

    while (true) {
        const rows = await fetchPage(page, pageSize);
        all.push(...rows);
        if (rows.length < pageSize) {
            break;
        }
        page++;
    }

    return all;
}
