/**
 * CLI: メディアアップロード
 *
 * 使い方: node scripts/upload-media.mjs <path-to-article-dir> [--force-upload]
 *
 * 記事ディレクトリ内の画像および共有リソースを WordPress にアップロードする。
 * ステートレス設計: slug でサーバに問い合わせ、既存ならスキップ。
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import {
    uploadFilename,
    expectedSlug,
    extractImagePaths,
    resolveImagePath,
} from '../lib/media-slug.mjs';
import { createWpClient, loadEnv, getWpConfig } from '../lib/wp-client.mjs';
import {
    extractOption,
    resolveContentRoot,
    resolveArticleDirPath,
} from '../lib/cli-config.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

// .env 読み込み
loadEnv(resolve(projectRoot, '.env'));

// --- 引数パース ---
const args = process.argv.slice(2);
const forceUpload = args.includes('--force-upload');
const { value: cliContentRoot, rest: withoutRoot } = extractOption(
    args.filter((a) => a !== '--force-upload'),
    '--content-root',
);
const articleInput = withoutRoot[0];

if (!articleInput) {
    console.error(
        '使い方: npm run upload-media -- [--content-root <path>] <article-slug|path-to-article-dir> [--force-upload]',
    );
    process.exit(1);
}

const { absPath: contentRootAbsPath } = resolveContentRoot({
    projectRoot,
    cliValue: cliContentRoot,
});
const absArticleDir = resolveArticleDirPath(articleInput, {
    contentRootAbsPath,
});
const indexMd = join(absArticleDir, 'index.md');

if (!existsSync(indexMd)) {
    console.error(
        `エラー: index.md が見つかりません: ${indexMd}\n` +
            `記事ディレクトリを指定してください（例: posts/my-article/）`,
    );
    process.exit(1);
}

// --- Frontmatter から slug 取得 ---
const mdContent = readFileSync(indexMd, 'utf-8');
const { data: frontmatter, content: body } = matter(mdContent);
const articleSlug = frontmatter.slug;

if (!articleSlug) {
    console.error('エラー: frontmatter に slug が定義されていません');
    process.exit(1);
}

// --- 画像パス収集 ---
/** @type {{ localPath: string, absPath: string, uploadName: string, slug: string }[]} */
const images = [];

// MD 本文から画像パスを抽出
const imagePaths = extractImagePaths(body);

// featured_image も含める
if (frontmatter.featured_image) {
    const fi = frontmatter.featured_image;
    if (!imagePaths.includes(fi)) {
        imagePaths.push(fi);
    }
}

for (const imgPath of imagePaths) {
    const absPath = resolveImagePath(imgPath, absArticleDir);
    if (!existsSync(absPath)) {
        console.warn(`⚠ 画像ファイルが見つかりません（スキップ）: ${imgPath}`);
        continue;
    }
    images.push({
        localPath: imgPath,
        absPath,
        uploadName: uploadFilename(imgPath, articleSlug),
        slug: expectedSlug(imgPath, articleSlug),
    });
}

if (images.length === 0) {
    console.log('アップロード対象の画像がありません。');
    process.exit(0);
}

// --- WP クライアント初期化 ---
let config;
try {
    config = getWpConfig();
} catch (e) {
    console.error(e.message);
    process.exit(1);
}

const wp = createWpClient(config);

// --- アップロード実行 ---
console.log(`\n📁 記事: ${articleSlug}`);
console.log(`📷 画像: ${images.length} 件`);
if (forceUpload) {
    console.log('🔄 強制再アップロードモード');
}
console.log('');

let uploaded = 0;
let skipped = 0;
let errors = 0;

for (const img of images) {
    const label = `  ${img.localPath} → ${img.uploadName}`;
    try {
        // 既存チェック
        const existing = await wp.findMediaBySlug(img.slug);

        if (existing && !forceUpload) {
            console.log(`${label} … ⏭ スキップ（既存 id:${existing.id}）`);
            skipped++;
            continue;
        }

        // --force-upload: 既存を削除
        if (existing && forceUpload) {
            console.log(`${label} … 🗑 既存削除（id:${existing.id}）`);
            await wp.deleteMedia(existing.id);
        }

        // アップロード
        console.log(`${label} … ⬆ アップロード中...`);
        const result = await wp.uploadMedia(img.absPath, img.uploadName);

        // slug 検証
        if (result.slug !== img.slug) {
            console.error(
                `  ❌ slug 不一致: 期待="${img.slug}" 実際="${result.slug}"\n` +
                    `  他の post type と slug が衝突している可能性があります。\n` +
                    `  衝突元を解消してから再実行してください。`,
            );
            errors++;
            continue;
        }

        console.log(`  ✅ 完了（id:${result.id}, slug:${result.slug}）`);
        uploaded++;
    } catch (e) {
        console.error(`  ❌ エラー: ${e.message}`);
        errors++;
    }
}

// --- サマリー ---
console.log(
    `\n📊 結果: アップロード ${uploaded} / スキップ ${skipped} / エラー ${errors}`,
);

if (errors > 0) {
    process.exit(1);
}
