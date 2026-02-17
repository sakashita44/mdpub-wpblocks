import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { parseMd } from '../../lib/md-parser.js';
import {
    transformTokens,
    setPlugins,
} from '../../lib/block-transforms/index.js';

describe('Issue #5 transforms', () => {
    const savedPlugins = new Set(['katex']);
    beforeAll(() => setPlugins(savedPlugins));
    afterAll(() => setPlugins(new Set()));
    it('インライン数式を paragraph 内ショートコードへ変換', () => {
        const { tokens } = parseMd('これは $E=mc^2$ です');
        const blocks = transformTokens(tokens);

        expect(blocks).toHaveLength(1);
        expect(blocks[0].name).toBe('core/paragraph');
        expect(String(blocks[0].attributes.content)).toContain(
            '[katex]E=mc^2[/katex]',
        );
    });

    it('display math を core/shortcode に変換', () => {
        const { tokens } = parseMd('$$\\int_0^1 f(x)dx$$');
        const blocks = transformTokens(tokens);

        expect(blocks).toHaveLength(1);
        expect(blocks[0].name).toBe('core/shortcode');
        expect(String(blocks[0].attributes.text)).toBe(
            '[katex display=true]\\int_0^1 f(x)dx[/katex]',
        );
    });

    it('単独 URL 行を core/embed に変換', () => {
        const url = 'https://www.youtube.com/watch?v=xxxxx';
        const { tokens } = parseMd(url);
        const blocks = transformTokens(tokens);

        expect(blocks).toHaveLength(1);
        expect(blocks[0].name).toBe('core/embed');
        expect(blocks[0].attributes.url).toBe(url);
    });

    it('HTML ブロックを core/html にパススルー', () => {
        const html =
            '<iframe src="https://example.com/embed" width="640" height="480"></iframe>';
        const { tokens } = parseMd(html);
        const blocks = transformTokens(tokens);

        expect(blocks).toHaveLength(1);
        expect(blocks[0].name).toBe('core/html');
        expect(String(blocks[0].attributes.content)).toContain('<iframe');
        expect(String(blocks[0].attributes.content)).toContain(
            'https://example.com/embed',
        );
    });

    it(':::columns 内の各画像を core/column に配置', () => {
        const markdown = `:::columns
![alt1](images/a.jpg "キャプション1")
![alt2](images/b.jpg "キャプション2")
:::`;
        const { tokens } = parseMd(markdown);
        const blocks = transformTokens(tokens);

        expect(blocks).toHaveLength(1);
        expect(blocks[0].name).toBe('core/columns');
        expect(blocks[0].innerBlocks).toHaveLength(2);

        const firstCol = blocks[0].innerBlocks[0];
        const secondCol = blocks[0].innerBlocks[1];
        expect(firstCol.name).toBe('core/column');
        expect(secondCol.name).toBe('core/column');

        expect(firstCol.innerBlocks[0].name).toBe('core/image');
        expect(firstCol.innerBlocks[0].attributes.url).toBe('images/a.jpg');
        expect(String(firstCol.innerBlocks[0].attributes.caption)).toBe(
            'キャプション1',
        );

        expect(secondCol.innerBlocks[0].name).toBe('core/image');
        expect(secondCol.innerBlocks[0].attributes.url).toBe('images/b.jpg');
        expect(String(secondCol.innerBlocks[0].attributes.caption)).toBe(
            'キャプション2',
        );
    });

    it(':::columns 内の非画像段落は警告してスキップ', () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const { tokens } = parseMd(':::columns\nJust text\n:::');
        const blocks = transformTokens(tokens);

        expect(blocks).toHaveLength(1);
        expect(blocks[0].name).toBe('core/columns');
        expect(blocks[0].innerBlocks).toHaveLength(0);
        expect(warnSpy).toHaveBeenCalledWith(
            '[warn] columns 内の非画像段落をスキップしました',
        );

        warnSpy.mockRestore();
    });

    it('空の :::columns で innerBlocks が空配列になる', () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const { tokens } = parseMd(':::columns\n:::');
        const blocks = transformTokens(tokens);

        expect(blocks).toHaveLength(1);
        expect(blocks[0].name).toBe('core/columns');
        expect(blocks[0].innerBlocks).toHaveLength(0);

        warnSpy.mockRestore();
    });

    it('クエリパラメータ付き URL を core/embed に変換', () => {
        const url = 'https://example.com/video?a=1&b=2';
        const { tokens } = parseMd(url);
        const blocks = transformTokens(tokens);

        expect(blocks).toHaveLength(1);
        expect(blocks[0].name).toBe('core/embed');
        expect(blocks[0].attributes.url).toBe(url);
    });

    it('末尾にピリオドが付いた URL もそのまま保持して core/embed に変換', () => {
        const { tokens } = parseMd('https://example.com/page.');
        const blocks = transformTokens(tokens);

        expect(blocks).toHaveLength(1);
        expect(blocks[0].name).toBe('core/embed');
        expect(blocks[0].attributes.url).toBe('https://example.com/page.');
    });

    it('strong 内の数式を正しく変換', () => {
        const { tokens } = parseMd('**式 $x^2$ です**');
        const blocks = transformTokens(tokens);

        expect(blocks).toHaveLength(1);
        expect(blocks[0].name).toBe('core/paragraph');
        const content = String(blocks[0].attributes.content);
        expect(content).toContain('<strong>');
        expect(content).toContain('[katex]x^2[/katex]');
    });
});
