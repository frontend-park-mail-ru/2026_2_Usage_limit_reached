import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  { ignores: ['dist/'] },
  js.configs.recommended,
  {
    files: ['**/*.ts'],
    extends: [tseslint.configs.recommended],
  },
  {
    files: ['**/*.{js,ts}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
    },
    rules: {
      eqeqeq: ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'error',
      semi: ['error', 'always'],
      quotes: ['error', 'single', { avoidEscape: true }],
      curly: ['error', 'all'],
    },
  },
  {
    files: ['server/**/*.js', 'webpack.*.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
]);
