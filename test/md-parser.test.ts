import { describe, it, expect } from 'vitest';
import { parseMd } from '../lib/md-parser.js';

describe('parseMd', () => {
    describe('frontmatter パース', () => {
        it('正常系: 必須フィールドを含む frontmatter を抽出', () => {
            const md = `---
title: テスト記事
slug: test-article
categories:
  - tech
---
本文テキストです。`;
            const { frontmatter, tokens } = parseMd(md);
            expect(frontmatter.title).toBe('テスト記事');
            expect(frontmatter.slug).toBe('test-article');
            expect(frontmatter.categories).toEqual(['tech']);
            expect(tokens.length).toBeGreaterThan(0);
        });

        it('正常系: オプションフィールドも抽出', () => {
            const md = `---
title: テスト
slug: test
categories: []
tags:
  - tag1
excerpt: 概要テキスト
date: '2026-01-01'
featured_image: cover.jpg
---`;
            const { frontmatter } = parseMd(md);
            expect(frontmatter.tags).toEqual(['tag1']);
            expect(frontmatter.excerpt).toBe('概要テキスト');
            expect(frontmatter.date).toBe('2026-01-01');
            expect(frontmatter.featured_image).toBe('cover.jpg');
        });

        it('frontmatter なし: 空オブジェクトを返す', () => {
            const md = '本文のみです。';
            const { frontmatter, tokens } = parseMd(md);
            expect(frontmatter).toEqual({});
            expect(tokens.length).toBeGreaterThan(0);
        });

        it('frontmatter のみ（本文なし）: トークン配列が空', () => {
            const md = `---
title: テスト
slug: test
categories: []
---`;
            const { frontmatter, tokens } = parseMd(md);
            expect(frontmatter.title).toBe('テスト');
            expect(tokens).toHaveLength(0);
        });

        it('必須フィールド不足: エラーにならず部分的に返す', () => {
            const md = `---\ntitle: テスト\n---\n本文`;
            const { frontmatter } = parseMd(md);
            expect(frontmatter.title).toBe('テスト');
            expect(frontmatter.slug).toBeUndefined();
            expect(frontmatter.categories).toBeUndefined();
        });

        it('不正 YAML frontmatter: エラーをスロー', () => {
            // js-yaml は未クローズのフロー記法を不正として例外を投げる
            const md = `---
title: [unclosed bracket
---`;
            expect(() => parseMd(md)).toThrow();
        });

        it('空文字列: 空の frontmatter と空のトークン配列を返す', () => {
            const { frontmatter, tokens } = parseMd('');
            expect(frontmatter).toEqual({});
            expect(tokens).toHaveLength(0);
        });
    });

    describe('トークン生成', () => {
        it('見出しを含む本文で対応するトークンを生成', () => {
            const { tokens } = parseMd('# 見出し');
            const types = tokens.map((t) => t.type);
            expect(types).toContain('heading_open');
            expect(types).toContain('inline');
            expect(types).toContain('heading_close');
        });

        it('コードブロックを含む本文で fence トークンを生成', () => {
            const { tokens } = parseMd('```js\nconst x = 1;\n```');
            const types = tokens.map((t) => t.type);
            expect(types).toContain('fence');
        });

        it('段落を含む本文で paragraph トークンを生成', () => {
            const { tokens } = parseMd('段落テキスト');
            const types = tokens.map((t) => t.type);
            expect(types).toContain('paragraph_open');
            expect(types).toContain('paragraph_close');
        });
    });
});
