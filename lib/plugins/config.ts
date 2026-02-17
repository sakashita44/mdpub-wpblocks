/**
 * プラグイン設定読み込み
 *
 * `.mdpub-wpblocks.json` の `plugins` フィールドから有効プラグイン名の Set を返す。
 */

import { loadProjectConfig } from '../cli-config.js';

/** 有効プラグイン名の Set を返す */
export function loadPlugins(projectRoot: string): Set<string> {
    const config = loadProjectConfig(projectRoot);
    const plugins = config.plugins;

    if (plugins === undefined) {
        return new Set();
    }

    if (!Array.isArray(plugins)) {
        throw new Error(
            '.mdpub-wpblocks.json の plugins フィールドは文字列の配列で指定してください',
        );
    }

    for (const item of plugins) {
        if (typeof item !== 'string') {
            throw new Error(
                '.mdpub-wpblocks.json の plugins フィールドは文字列の配列で指定してください',
            );
        }
    }

    return new Set(plugins as string[]);
}
