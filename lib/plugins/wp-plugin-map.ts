/**
 * WP plugin slug → mdpub プラグイン名のマッピング
 *
 * WordPress の `GET /wp/v2/plugins` が返す `plugin` フィールド
 * （例: `katex/katex`）から、mdpub 内部で使うプラグイン名へ変換する。
 */

import type { WpPlugin } from '../types.js';

/** WP plugin slug → mdpub プラグイン名 */
const WP_PLUGIN_MAP: ReadonlyMap<string, string> = new Map([
    ['katex/katex', 'katex'],
]);

/**
 * WP プラグイン一覧から、mdpub で認識するプラグイン名の Set を返す。
 * active なプラグインのみ対象とする。
 */
export function mapWpPlugins(wpPlugins: WpPlugin[]): Set<string> {
    const result = new Set<string>();
    for (const wp of wpPlugins) {
        if (wp.status !== 'active') continue;
        const mdpubName = WP_PLUGIN_MAP.get(wp.plugin);
        if (mdpubName !== undefined) {
            result.add(mdpubName);
        }
    }
    return result;
}
