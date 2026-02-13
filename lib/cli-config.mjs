import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const CONFIG_FILE = '.mdpub-wpblocks.json';

export function extractOption(args, name) {
    const rest = [];
    let value;

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === name) {
            const next = args[i + 1];
            if (next === undefined || next.startsWith('--')) {
                throw new Error(`${name} に値が指定されていません`);
            }
            value = next;
            i++;
            continue;
        }
        if (arg.startsWith(`${name}=`)) {
            value = arg.slice(name.length + 1);
            continue;
        }
        rest.push(arg);
    }

    return { value, rest };
}

export function extractFlag(args, name) {
    const rest = [];
    let enabled = false;

    for (const arg of args) {
        if (arg === name) {
            enabled = true;
            continue;
        }
        rest.push(arg);
    }

    return {
        enabled,
        rest,
    };
}

export function resolveContentRoot({ projectRoot, cliValue }) {
    const config = loadProjectConfig(projectRoot);
    const configValue =
        typeof config.contentRoot === 'string' ? config.contentRoot : undefined;
    const selected = selectContentRoot([
        {
            value: cliValue,
            source: 'CLI 引数 --content-root',
        },
        {
            value: process.env.MDPUB_CONTENT_ROOT,
            source: '環境変数 MDPUB_CONTENT_ROOT',
        },
        {
            value: configValue,
            source: `設定ファイル ${CONFIG_FILE}`,
        },
    ]);

    return {
        value: selected,
        absPath: resolve(projectRoot, selected),
    };
}

export function resolveArticleDirPath(input, { contentRootAbsPath }) {
    if (looksLikePath(input)) {
        return resolve(input);
    }
    return resolve(contentRootAbsPath, input);
}

export function resolveArticleMarkdownPath(input, { contentRootAbsPath }) {
    if (looksLikeMarkdownPath(input)) {
        return resolve(input);
    }

    if (looksLikePath(input)) {
        return resolve(input, 'index.md');
    }

    return resolve(contentRootAbsPath, input, 'index.md');
}

function loadProjectConfig(projectRoot) {
    const configPath = resolve(projectRoot, CONFIG_FILE);
    if (!existsSync(configPath)) {
        return {};
    }

    try {
        return JSON.parse(readFileSync(configPath, 'utf-8'));
    } catch (e) {
        throw new Error(
            `${CONFIG_FILE} の読み込みに失敗しました: ${e.message}`,
            { cause: e },
        );
    }
}

function looksLikePath(input) {
    return /[\\/]/.test(input) || input.startsWith('.') || input.includes(':');
}

function looksLikeMarkdownPath(input) {
    return input.endsWith('.md');
}

function selectContentRoot(candidates) {
    for (const candidate of candidates) {
        if (candidate.value === undefined) {
            continue;
        }

        const normalized = String(candidate.value).trim();
        if (normalized.length === 0) {
            throw new Error(`${candidate.source} が空です`);
        }

        return normalized;
    }

    return 'posts';
}
