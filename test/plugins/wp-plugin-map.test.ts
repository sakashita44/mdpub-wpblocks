import { describe, it, expect } from 'vitest';
import { mapWpPlugins } from '../../lib/plugins/wp-plugin-map.js';
import type { WpPlugin } from '../../lib/types.js';

describe('mapWpPlugins', () => {
    it('active な KaTeX プラグインを認識する', () => {
        const plugins: WpPlugin[] = [
            { plugin: 'katex/katex', status: 'active', name: 'KaTeX' },
        ];
        expect(mapWpPlugins(plugins)).toEqual(new Set(['katex']));
    });

    it('inactive なプラグインは無視する', () => {
        const plugins: WpPlugin[] = [
            { plugin: 'katex/katex', status: 'inactive', name: 'KaTeX' },
        ];
        expect(mapWpPlugins(plugins)).toEqual(new Set());
    });

    it('未知のプラグインは無視する', () => {
        const plugins: WpPlugin[] = [
            {
                plugin: 'unknown/unknown',
                status: 'active',
                name: 'Unknown',
            },
        ];
        expect(mapWpPlugins(plugins)).toEqual(new Set());
    });

    it('空配列に対して空 Set を返す', () => {
        expect(mapWpPlugins([])).toEqual(new Set());
    });

    it('複数プラグインから既知の active のみ抽出する', () => {
        const plugins: WpPlugin[] = [
            { plugin: 'katex/katex', status: 'active', name: 'KaTeX' },
            {
                plugin: 'akismet/akismet',
                status: 'active',
                name: 'Akismet',
            },
            {
                plugin: 'hello-dolly/hello',
                status: 'inactive',
                name: 'Hello Dolly',
            },
        ];
        expect(mapWpPlugins(plugins)).toEqual(new Set(['katex']));
    });
});
