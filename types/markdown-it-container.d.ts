declare module 'markdown-it-container' {
    import type MarkdownIt from 'markdown-it';

    interface ContainerOptions {
        validate?: (params: string) => boolean;
        render?: (
            tokens: MarkdownIt.Token[],
            idx: number,
            options: MarkdownIt.Options,
            env: unknown,
            self: unknown,
        ) => string;
        marker?: string;
    }

    function markdownItContainer(
        md: MarkdownIt,
        name: string,
        options?: ContainerOptions,
    ): void;

    export = markdownItContainer;
}
