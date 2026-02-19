/**
 * 環境変数初期化ユーティリティ
 *
 * dotenv で .env を読み込む。既存の環境変数は上書きしない。
 * ファイルが見つからない場合は警告ログを出力する。
 */

import dotenv from 'dotenv';

/**
 * 指定パスの .env を読み込む
 * 既存の環境変数は上書きしない（CI など外部から注入された値を優先）
 */
export function initEnv(envPath: string): void {
    const result = dotenv.config({ path: envPath, override: false });
    if (result.error) {
        console.warn(`⚠️ .env を読み込めませんでした: ${result.error.message}`);
    }
}
