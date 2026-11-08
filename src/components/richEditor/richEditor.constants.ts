import type { BlockType, FormatCommand, InlineTag } from './richEditor.types.ts';

export const FORMAT_COMMANDS: readonly string[] = [
  'bold', 'italic', 'underline', 'strikeThrough', 'insertUnorderedList', 'insertOrderedList',
] satisfies FormatCommand[];

export const BLOCK_LABELS: Readonly<Record<BlockType, string>> = {
  p: 'Обычный текст',
  h3: 'Подзаголовок',
};

export const INLINE_TAGS: Readonly<Partial<Record<string, InlineTag>>> = {
  underline: 'u',
  strikeThrough: 's',
};

export const INLINE_TAG_SELECTORS: Readonly<Record<InlineTag, string>> = {
  u: 'u',
  s: 's, strike',
};

export const TEXT_BLOCKS = 'p, h3, li';
