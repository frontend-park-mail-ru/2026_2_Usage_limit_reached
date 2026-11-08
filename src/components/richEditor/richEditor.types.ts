export type FormatCommand = 'bold' | 'italic' | 'underline' | 'strikeThrough' | 'insertUnorderedList' | 'insertOrderedList';

export type BlockType = 'p' | 'h3';

export type InlineTag = 'u' | 's';

/** Кусок текста внутри выделения. */
export interface TextPiece {
  node: Text;
  start: number;
  end: number;
}
