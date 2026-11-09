const directives = {
  'default-src': ["'none'"],
  'script-src': ["'self'"],
  'script-src-attr': ["'none'"],
  'style-src': ["'self'"],
  'style-src-attr': ["'none'"],
  'font-src': ["'self'"],
  'img-src': ["'self'", 'blob:'],
  'connect-src': ["'self'"],
  'worker-src': ["'self'"],
  'base-uri': ["'none'"],
  'form-action': ["'none'"],
};

/** Политика статического production-приложения. */
export const CONTENT_SECURITY_POLICY = Object.entries(directives)
  .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
  .join('; ');
