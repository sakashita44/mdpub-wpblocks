/**
 * CLI: サーバ状態から .registry.yaml を再生成（Issue #8）
 */

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { stringify as stringifyYaml } from 'yaml';
import { createWpClient, loadEnv, getWpConfig } from '../lib/wp-client.js';
import { extractOption, resolveContentRoot } from '../lib/cli-config.js';
import { resolveProjectRoot } from '../lib/project-root.js';
import type {
    WpClient,
    WpClientConfig,
    WpPost,
    WpMedia,
} from '../lib/types.js';

const projectRoot: string = resolveProjectRoot(import.meta.url);

loadEnv(resolve(projectRoot, '.env'));

main().catch((e: unknown) => {
    console.error(`❌ sync に失敗しました: ${(e as Error).message}`);
    process.exit(1);
});

async function main(): Promise<void> {
    let outputPath: string | undefined;
    let cliContentRoot: string | undefined;

    try {
        const parsedOutput = extractOption(process.argv.slice(2), '--output');
        outputPath = parsedOutput.value;

        const parsedContentRoot = extractOption(
            parsedOutput.rest,
            '--content-root',
        );
        cliContentRoot = parsedContentRoot.value;
    } catch (e) {
        console.error(`引数エラー: ${(e as Error).message}`);
        process.exit(1);
    }

    const output: string = resolve(projectRoot, outputPath || '.registry.yaml');
    const { value: contentRoot } = resolveContentRoot({
        projectRoot,
        cliValue: cliContentRoot,
    });

    let config: WpClientConfig;
    try {
        config = getWpConfig();
    } catch (e) {
        console.error((e as Error).message);
        process.exit(1);
    }

    try {
        const wp: WpClient = createWpClient(config);
        const [posts, media]: [WpPost[], WpMedia[]] = await Promise.all([
            fetchAll<WpPost>((page, perPage) =>
                wp.listPostsPage(page, perPage),
            ),
            fetchAll<WpMedia>((page, perPage) =>
                wp.listMediaPage(page, perPage),
            ),
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
        console.error(`❌ sync に失敗しました: ${(e as Error).message}`);
        process.exit(1);
    }
}

async function fetchAll<T>(
    fetchPage: (
        page: number,
        perPage: number,
    ) => Promise<{ items: T[]; totalPages: number | null }>,
    pageSize: number = 100,
): Promise<T[]> {
    const all: T[] = [];
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
