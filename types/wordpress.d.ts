/**
 * @wordpress/blocks + @wordpress/block-library の最小型宣言
 */

declare module '@wordpress/blocks' {
    export interface Block {
        name: string;
        clientId: string;
        attributes: Record<string, unknown>;
        innerBlocks: Block[];
        isValid: boolean;
        originalContent?: string;
    }

    export interface BlockType {
        name: string;
        title: string;
        category?: string;
        attributes?: Record<string, unknown>;
    }

    export function createBlock(
        name: string,
        attributes?: Record<string, unknown>,
        innerBlocks?: Block[],
    ): Block;

    export function serialize(blocks: Block | Block[]): string;

    export function registerBlockType(
        name: string,
        settings: Record<string, unknown>,
    ): BlockType | undefined;

    export function getBlockTypes(): BlockType[];
}

declare module '@wordpress/block-library' {
    export function registerCoreBlocks(): void;
}
