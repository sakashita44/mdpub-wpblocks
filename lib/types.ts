/**
 * プロジェクト共通の型定義
 */

import type { Block } from '@wordpress/blocks';
import type Token from 'markdown-it/lib/token.mjs';

/** ブロック変換関数に渡す依存オブジェクト */
export interface TransformDeps {
    createBlock: (
        name: string,
        attributes?: Record<string, unknown>,
        innerBlocks?: Block[],
    ) => Block;
    renderInline: (children: Token[] | null) => string;
}

/** 複数トークンを消費するブロック変換の戻り値 */
export interface TransformResult {
    block: Block;
    consumed: number;
}

/** wp-client 設定 */
export interface WpClientConfig {
    wpUrl: string;
    wpUser: string;
    wpAppPassword: string;
}

/** WordPress 投稿オブジェクト（API レスポンスの部分型） */
export interface WpPost {
    id: number;
    slug: string;
    status: string;
    title: { rendered: string };
    content: { rendered: string };
    date: string;
    modified: string;
    link: string;
    categories: number[];
    tags: number[];
    featured_media: number;
    excerpt: { rendered: string };
}

/** WordPress メディアオブジェクト（API レスポンスの部分型） */
export interface WpMedia {
    id: number;
    slug: string;
    source_url: string;
    mime_type: string;
    title: { rendered: string };
}

/** WordPress カテゴリ/タグオブジェクト */
export interface WpTerm {
    id: number;
    slug: string;
    name: string;
}

/** API fetch の戻り値（ページネーション情報付き） */
export interface ApiFetchResult<T> {
    data: T;
    totalPages: number | null;
}

/** WP REST API クライアントのインターフェース */
export interface WpClient {
    findMediaBySlug(slug: string): Promise<WpMedia | null>;
    findPostBySlug(slug: string): Promise<WpPost | null>;
    findCategoryBySlug(slug: string): Promise<WpTerm | null>;
    findTagBySlug(slug: string): Promise<WpTerm | null>;
    listPostsPage(
        page?: number,
        perPage?: number,
    ): Promise<{ items: WpPost[]; totalPages: number | null }>;
    listMediaPage(
        page?: number,
        perPage?: number,
    ): Promise<{ items: WpMedia[]; totalPages: number | null }>;
    createPost(payload: Record<string, unknown>): Promise<WpPost>;
    updatePost(
        postId: number,
        payload: Record<string, unknown>,
    ): Promise<WpPost>;
    uploadMedia(filePath: string, uploadName: string): Promise<WpMedia>;
    deleteMedia(mediaId: number): Promise<unknown>;
}

/** Frontmatter */
export interface Frontmatter {
    title: string;
    slug: string;
    categories: string[];
    tags?: string[];
    excerpt?: string;
    date?: string;
    featured_image?: string;
    [key: string]: unknown;
}

/** extractOption の戻り値 */
export interface ExtractOptionResult {
    value: string | undefined;
    rest: string[];
}

/** extractFlag の戻り値 */
export interface ExtractFlagResult {
    enabled: boolean;
    rest: string[];
}
