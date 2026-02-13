/**
 * CLI: サーバ状態から .registry.yaml を再生成（Issue #8）
 */

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { stringify as stringifyYaml } from 'yaml';
import { createWpClient, loadEnv, getWpConfig } from '../lib/wp-client.mjs';
import { extractOption, resolveContentRoot } from '../lib/cli-config.mjs';
import { resolveProjectRoot } from '../lib/project-root.mjs';

const projectRoot = resolveProjectRoot(import.meta.url);

loadEnv(resolve(projectRoot, '.env'));

main();

async function main() {
    let outputPath;
    let cliContentRoot;

    try {
        const parsedOutput = extractOption(process.argv.slice(2), '--output');
        outputPath = parsedOutput.value;

        const parsedContentRoot = extractOption(
            parsedOutput.rest,
            '--content-root',
        );
        cliContentRoot = parsedContentRoot.value;
    } catch (e) {
        console.error(`引数エラー: ${e.message}`);
        process.exit(1);
    }

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
            fetchAll((page, perPage) => wp.listPostsPage(page, perPage)),
            fetchAll((page, perPage) => wp.listMediaPage(page, perPage)),
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
}

async function fetchAll(fetchPage, pageSize = 100) {
    const all = [];
    let page = 1;

    while (true) {
        const { items, totalPages } = await fetchPage(page, pageSize);
        all.push(...items);

        if (typeof totalPages === 'number') {
            if (page >= totalPages) {
                break;
            }
        } else if (items.length < pageSize) {
            break;
        }

        page++;
    }

    return all;
}
