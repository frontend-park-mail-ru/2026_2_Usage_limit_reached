import { request } from './request.ts';

export type AttachmentType = 'image' | 'video' | 'audio' | 'file';

export interface PostAttachment {
  id: string;
  name: string;
  media_type: AttachmentType;
  mime_type: string;
  size_bytes: number;
  url: string;
}

const ATTACHMENT_UPLOAD_TIMEOUT = 30 * 60 * 1000;

/** Загружает один файл для вложения в пост. */
export function uploadAttachment(file: File, signal: AbortSignal): Promise<PostAttachment> {
  const data = new FormData();
  data.append('file', file);
  return request<PostAttachment>('/attachments', { method: 'POST', data, signal, timeoutMs: ATTACHMENT_UPLOAD_TIMEOUT });
}
