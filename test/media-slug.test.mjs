/**
 * media-slug.mjs のユニットテスト
 *
 * 純粋関数のみのモジュールのため、wp-env 不要。
 */

import { describe, it, expect } from 'vitest';
import {
    uploadFilename,
    expectedSlug,
    extractImagePaths,
} from '../lib/media-slug.mjs';

describe('uploadFilename', () => {
    it('記事固有画像: <article-slug>-<filename>（サニタイズ済み）', () => {
        expect(uploadFilename('images/photo.jpg', 'article-a')).toBe(
            'article-a-photo.jpg',
        );
    });

    it('共有リソース: shared-<filename>', () => {
        expect(uploadFilename('../shared/logo.png', 'article-a')).toBe(
            'shared-logo.png',
        );
    });

    it('ネストされた画像パスでもファイル名のみ抽出', () => {
        expect(uploadFilename('images/sub/deep.webp', 'my-post')).toBe(
            'my-post-deep.webp',
        );
    });

    it('Windows バックスラッシュを正規化', () => {
        expect(uploadFilename('images\\photo.jpg', 'article-a')).toBe(
            'article-a-photo.jpg',
        );
    });

    it('shared ディレクトリがパスのどこにあっても認識', () => {
        expect(uploadFilename('shared/logo.png', 'article-a')).toBe(
            'shared-logo.png',
        );
    });

    it('スペース・括弧入りファイル名をサニタイズ', () => {
        expect(uploadFilename('images/Test Image (1).png', 'article-a')).toBe(
            'article-a-test-image-1.png',
        );
    });

    it('大文字ファイル名を小文字化', () => {
        expect(uploadFilename('images/UPPER_CASE.PNG', 'my-post')).toBe(
            'my-post-upper_case.png',
        );
    });
});

describe('expectedSlug', () => {
    it('拡張子を除去し slug 化', () => {
        expect(expectedSlug('images/photo.jpg', 'article-a')).toBe(
            'article-a-photo',
        );
    });

    it('共有リソースの slug', () => {
        expect(expectedSlug('../shared/logo.png', 'article-a')).toBe(
            'shared-logo',
        );
    });

    it('大文字を小文字化', () => {
        expect(expectedSlug('images/MyPhoto.JPG', 'Article-A')).toBe(
            'article-a-myphoto',
        );
    });

    it('記号をハイフンに変換し連続ハイフンを圧縮（アンダースコアは保持）', () => {
        expect(expectedSlug('images/my_photo (1).jpg', 'article-a')).toBe(
            'article-a-my_photo-1',
        );
    });

    it('先頭・末尾ハイフンを除去', () => {
        expect(expectedSlug('images/-test-.jpg', 'article-a')).toBe(
            'article-a-test',
        );
    });

    it('slug を算出できない場合は例外を投げる', () => {
        expect(() => expectedSlug('images/写真.jpg', '')).toThrow(
            'メディア slug を算出できません',
        );
    });

    it('全角のみファイル名で slug がプレフィックスに退化する場合は例外を投げる', () => {
        expect(() => expectedSlug('images/テスト.jpg', 'article-a')).toThrow(
            'プレフィックスと同一',
        );
    });
});

describe('extractImagePaths', () => {
    it('Markdown 本文から画像パスを抽出', () => {
        const body = [
            '段落テキスト',
            '![alt1](images/a.jpg)',
            '![alt2](images/b.png "キャプション")',
            'テキスト',
        ].join('\n');
        expect(extractImagePaths(body)).toEqual([
            'images/a.jpg',
            'images/b.png',
        ]);
    });

    it('重複パスは除去される', () => {
        const body = ['![a](images/photo.jpg)', '![b](images/photo.jpg)'].join(
            '\n',
        );
        expect(extractImagePaths(body)).toEqual(['images/photo.jpg']);
    });

    it('共有リソースも含む', () => {
        const body = '![logo](../shared/logo.png)';
        expect(extractImagePaths(body)).toEqual(['../shared/logo.png']);
    });

    it('画像がない場合は空配列', () => {
        expect(extractImagePaths('段落テキストのみ')).toEqual([]);
    });

    it('インラインリンクは含まない', () => {
        const body = '[click](https://example.com)';
        expect(extractImagePaths(body)).toEqual([]);
    });

    it('angle-bracket 記法でスペース入りパスを抽出', () => {
        const body = '![a](<images/Test Image (1).png>)';
        expect(extractImagePaths(body)).toEqual(['images/Test Image (1).png']);
    });

    it('URL エンコードされたパスをデコードして抽出', () => {
        const body = '![a](images/Test%20Image%20%281%29.png)';
        expect(extractImagePaths(body)).toEqual(['images/Test Image (1).png']);
    });

    it('angle-bracket 記法と通常記法が混在', () => {
        const body = [
            '![a](<images/space file.png>)',
            '![b](images/normal.jpg)',
        ].join('\n');
        expect(extractImagePaths(body)).toEqual([
            'images/space file.png',
            'images/normal.jpg',
        ]);
    });

    it('angle-bracket 記法が通常 regex で二重マッチしない', () => {
        const body = '![a](<images/テスト 画像.jpg>)';
        const paths = extractImagePaths(body);
        expect(paths).toEqual(['images/テスト 画像.jpg']);
        // <images/...> のように angle bracket が含まれたパスが混入しない
        expect(paths.every((p) => !p.startsWith('<'))).toBe(true);
    });
});
