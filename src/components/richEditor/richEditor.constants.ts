import type { BlockType, FormatCommand } from './richEditor.types.ts';

export const FORMAT_COMMANDS: readonly string[] = [
  'bold', 'italic', 'underline', 'strikeThrough', 'insertUnorderedList', 'insertOrderedList',
] satisfies FormatCommand[];

export const BLOCK_LABELS: Readonly<Record<BlockType, string>> = {
  p: 'Обычный текст',
  h3: 'Подзаголовок',
};
