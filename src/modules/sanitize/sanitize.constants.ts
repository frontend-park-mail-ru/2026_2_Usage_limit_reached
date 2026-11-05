export const ALLOWED_TAGS: ReadonlySet<string> = new Set(['P', 'H3', 'STRONG', 'EM', 'U', 'S', 'UL', 'OL', 'LI', 'A', 'BR']);

export const TAG_ALIASES: Readonly<Record<string, string>> = {
  B: 'STRONG',
  I: 'EM',
  DEL: 'S',
  STRIKE: 'S',
  DIV: 'P',
};

export const REMOVED_WITH_CONTENT: ReadonlySet<string> = new Set([
  'SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'TEMPLATE', 'NOSCRIPT', 'SVG', 'MATH', 'TEXTAREA', 'SELECT',
]);

export const SAFE_LINK_PROTOCOL = 'https:';

export const LINK_REL = 'noopener noreferrer nofollow';

export const TEXT_BREAKS: Readonly<Record<string, string>> = {
  P: '\n\n',
  H3: '\n\n',
  LI: '\n',
  UL: '\n',
  OL: '\n',
  BR: '\n',
};
