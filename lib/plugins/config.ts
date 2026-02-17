/**
 * プラグイン設定読み込み
 *
 * `.mdpub-cache.json` の `plugins` フィールドから有効プラグイン名の Set を返す。
 * sync 未実行（ファイル不在）の場合は空 Set を返す。
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { MdpubCache } from '../types.js';

const CACHE_FILE = '.mdpub-cache.json';

/** 有効プラグイン名の Set を返す */
export function loadPlugins(projectRoot: string): Set<string> {
    const cachePath = resolve(projectRoot, CACHE_FILE);
    if (!existsSync(cachePath)) {
        return new Set();
    }

    let cache: MdpubCache;
    try {
        cache = JSON.parse(readFileSync(cachePath, 'utf-8')) as MdpubCache;
    } catch (e) {
        throw new Error(
            `${CACHE_FILE} の読み込みに失敗しました: ${(e as Error).message}`,
            { cause: e },
        );
    }

    const plugins = cache.plugins;
    if (!Array.isArray(plugins)) {
        return new Set();
    }

    return new Set(plugins);
}
