import { formatDistanceToNow } from 'date-fns';

export function relativeTime(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function sanitizeText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm'];
export const MAX_IMAGE_SIZE = 8 * 1024 * 1024; // 8MB
export const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
export const MAX_IMAGES_PER_POST = 4;
export const MAX_POST_LENGTH = 500;

export function validateMediaFile(file: File): string | null {
  if (ALLOWED_IMAGE_TYPES.includes(file.type)) {
    if (file.size > MAX_IMAGE_SIZE) return `Image must be under 8MB`;
    return null;
  }
  if (ALLOWED_VIDEO_TYPES.includes(file.type)) {
    if (file.size > MAX_VIDEO_SIZE) return `Video must be under 50MB`;
    return null;
  }
  return 'File type not supported. Use JPG, PNG, WebP, MP4, or WebM.';
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function generateStoragePath(userId: string, filename: string): string {
  const ext = filename.split('.').pop();
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  return `${userId}/${timestamp}-${random}.${ext}`;
}
