export type EditorMode = 'create' | 'draft' | 'published';

export type EditorIntent = 'save' | 'publish';

export interface EditorModeView {
  heading: string;
  backLabel: string;
  saveLabel: string;
  leaveTitle: string;
}

export interface EditorSnapshot {
  title: string;
  body: string;
}
