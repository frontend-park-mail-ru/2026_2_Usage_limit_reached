import path from 'node:path';

export const SRC_DIR = path.join(import.meta.dirname, 'src');

export const DIST_DIR = path.join(import.meta.dirname, 'dist');

export const COMPONENTS_DIR = path.join(SRC_DIR, 'components');
