/**
 * CLI 設定・引数解析
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ExtractOptionResult, ExtractFlagResult } from './types.js';

const CONFIG_FILE = '.mdpub-wpblocks.json';

export function extractOption(
    args: string[],
    name: string,
): ExtractOptionResult {
    const rest: string[] = [];
    let value: string | undefined;

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

export function extractFlag(args: string[], name: string): ExtractFlagResult {
    const rest: string[] = [];
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

export function resolveContentRoot({
    projectRoot,
    cliValue,
}: {
    projectRoot: string;
    cliValue: string | undefined;
}): { value: string; absPath: string } {
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

export function resolveArticleDirPath(
    input: string,
    { contentRootAbsPath }: { contentRootAbsPath: string },
): string {
    if (looksLikePath(input)) {
        return resolve(input);
    }
    return resolve(contentRootAbsPath, input);
}

export function resolveArticleMarkdownPath(
    input: string,
    { contentRootAbsPath }: { contentRootAbsPath: string },
): string {
    if (looksLikeMarkdownPath(input)) {
        return resolve(input);
    }

    if (looksLikePath(input)) {
        return resolve(input, 'index.md');
    }

    return resolve(contentRootAbsPath, input, 'index.md');
}

export function loadProjectConfig(
    projectRoot: string,
): Record<string, unknown> {
    const configPath = resolve(projectRoot, CONFIG_FILE);
    if (!existsSync(configPath)) {
        return {};
    }

    try {
        return JSON.parse(readFileSync(configPath, 'utf-8')) as Record<
            string,
            unknown
        >;
    } catch (e) {
        throw new Error(
            `${CONFIG_FILE} の読み込みに失敗しました: ${(e as Error).message}`,
            { cause: e },
        );
    }
}

function looksLikePath(input: string): boolean {
    return /[\\/]/.test(input) || input.startsWith('.') || input.includes(':');
}

function looksLikeMarkdownPath(input: string): boolean {
    return input.endsWith('.md');
}

interface ContentRootCandidate {
    value: string | undefined;
    source: string;
}

function selectContentRoot(candidates: ContentRootCandidate[]): string {
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
