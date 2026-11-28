import type { AttachmentType } from '@/modules/api/attachments.ts';

export const ATTACHMENT_OPTIONS: Record<AttachmentType, { extensions: string[]; maxMiB: number }> = {
  image: { extensions: ['.jpg', '.jpeg', '.png', '.webp'], maxMiB: 25 },
  video: { extensions: ['.mp4'], maxMiB: 1024 },
  audio: { extensions: ['.mp3'], maxMiB: 100 },
  file: { extensions: ['.pdf', '.docx', '.pptx', '.xlsx', '.zip'], maxMiB: 100 },
};

/** Проверяет расширение и размер. Содержимое и кодеки проверяет сервер. */
export function validateAttachment(file: File, type: AttachmentType): 'format' | 'size' | undefined {
  const { extensions, maxMiB } = ATTACHMENT_OPTIONS[type];
  const extension = /\.[^.]+$/u.exec(file.name.toLowerCase())?.[0];
  if (!extension || !extensions.includes(extension)) {
    return 'format';
  }
  return file.size > maxMiB * 1024 ** 2 ? 'size' : undefined;
}
