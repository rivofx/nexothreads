'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import {
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  MAX_IMAGE_SIZE,
  MAX_VIDEO_SIZE,
  MAX_IMAGES_PER_POST,
  MAX_POST_LENGTH,
  validateMediaFile,
  generateStoragePath,
  formatFileSize,
} from '@/lib/utils';
import Avatar from '@/components/ui/Avatar';
import type { Profile } from '@/types';

interface CreatePostModalProps {
  profile: Profile;
  onClose: () => void;
  onSuccess: () => void;
}

interface MediaPreview {
  file: File;
  preview: string;
  type: 'image' | 'video';
  error?: string;
}

export default function CreatePostModal({ profile, onClose, onSuccess }: CreatePostModalProps) {
  const [content, setContent] = useState('');
  const [mediaFiles, setMediaFiles] = useState<MediaPreview[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasVideo = mediaFiles.some((m) => m.type === 'video');
  const imageCount = mediaFiles.filter((m) => m.type === 'image').length;
  const canAddMore = !hasVideo && imageCount < MAX_IMAGES_PER_POST;

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const newPreviews: MediaPreview[] = [];

    for (const file of files) {
      const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
      const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);

      if (!isImage && !isVideo) continue;

      // Check video restrictions
      if (isVideo) {
        if (hasVideo || imageCount > 0 || mediaFiles.length > 0) {
          setError('You can only attach one video (no mixing with images)');
          continue;
        }
      }

      // Check image count
      if (isImage && imageCount + newPreviews.filter(m => m.type === 'image').length >= MAX_IMAGES_PER_POST) {
        setError(`Maximum ${MAX_IMAGES_PER_POST} images per post`);
        continue;
      }

      const validationError = validateMediaFile(file);
      const preview = URL.createObjectURL(file);

      newPreviews.push({
        file,
        preview,
        type: isImage ? 'image' : 'video',
        error: validationError || undefined,
      });
    }

    setMediaFiles((prev) => [...prev, ...newPreviews]);
    e.target.value = '';
    setError('');
  }

  function removeMedia(index: number) {
    setMediaFiles((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  }

  const handleSubmit = useCallback(async () => {
    const trimmed = content.trim();
    if (!trimmed) { setError('Post content is required'); return; }
    if (trimmed.length > MAX_POST_LENGTH) { setError(`Max ${MAX_POST_LENGTH} characters`); return; }

    const invalidMedia = mediaFiles.filter((m) => m.error);
    if (invalidMedia.length > 0) { setError('Please remove invalid files'); return; }

    setSubmitting(true);
    setError('');

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('Not authenticated'); setSubmitting(false); return; }

    // Create post
    const { data: post, error: postError } = await supabase
      .from('posts')
      .insert({ author_id: user.id, content: trimmed })
      .select()
      .single();

    if (postError || !post) {
      setError('Failed to create post: ' + (postError?.message || 'Unknown error'));
      setSubmitting(false);
      return;
    }

    // Upload media
    const mediaRows = [];
    for (const media of mediaFiles) {
      const path = generateStoragePath(user.id, media.file.name);
      const bucket = media.type === 'image' ? 'post-images' : 'post-videos';

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, media.file);

      if (uploadError) {
        // Cleanup post
        await supabase.from('posts').delete().eq('id', post.id);
        setError('Failed to upload media: ' + uploadError.message);
        setSubmitting(false);
        return;
      }

      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
      mediaRows.push({
        post_id: post.id,
        type: media.type,
        url: urlData.publicUrl,
        mime_type: media.file.type,
        size_bytes: media.file.size,
        width: null,
        height: null,
        duration_seconds: null,
      });
    }

    if (mediaRows.length > 0) {
      const { error: mediaError } = await supabase.from('post_media').insert(mediaRows);
      if (mediaError) {
        // Non-fatal: post exists but media rows failed
        console.error('Media metadata save failed:', mediaError);
      }
    }

    onSuccess();
  }, [content, mediaFiles, onSuccess]);

  const charsLeft = MAX_POST_LENGTH - content.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg bg-surface-1 border border-surface-3 rounded-2xl shadow-2xl animate-slide-up overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-2">
          <h2 className="text-base font-semibold text-ink-primary">New post</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-ink-muted hover:text-ink-primary hover:bg-surface-2 transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          <div className="flex gap-3">
            <Avatar
              src={profile.avatar_url}
              name={profile.display_name || profile.username}
              size={40}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-ink-primary mb-1">
                {profile.display_name || profile.username}
              </p>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What's on your mind?"
                maxLength={MAX_POST_LENGTH}
                rows={4}
                autoFocus
                className="w-full bg-transparent text-ink-primary placeholder-ink-muted text-sm focus:outline-none leading-relaxed"
              />
            </div>
          </div>

          {/* Media previews */}
          {mediaFiles.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-2">
              {mediaFiles.map((media, i) => (
                <div key={i} className="relative rounded-xl overflow-hidden bg-surface-2 aspect-square">
                  {media.type === 'image' ? (
                    <Image
                      src={media.preview}
                      alt="Preview"
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <video
                      src={media.preview}
                      className="w-full h-full object-cover"
                      muted
                    />
                  )}
                  <button
                    onClick={() => removeMedia(i)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white text-xs flex items-center justify-center hover:bg-black/80 transition-colors"
                    aria-label="Remove media"
                  >
                    ✕
                  </button>
                  {media.error && (
                    <div className="absolute inset-0 bg-red-900/70 flex items-center justify-center p-2">
                      <p className="text-red-200 text-xs text-center">{media.error}</p>
                    </div>
                  )}
                  <div className="absolute bottom-1.5 left-1.5 bg-black/60 rounded px-1.5 py-0.5 text-xs text-white">
                    {formatFileSize(media.file.size)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="mt-3 bg-red-950/50 border border-red-800/50 rounded-lg px-4 py-2 text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-surface-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Media attach */}
            <button
              type="button"
              onClick={() => canAddMore && fileInputRef.current?.click()}
              disabled={!canAddMore}
              className="text-ink-muted hover:text-brand-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors p-1"
              title={
                hasVideo
                  ? 'Remove video to add more'
                  : imageCount >= MAX_IMAGES_PER_POST
                  ? `Max ${MAX_IMAGES_PER_POST} images`
                  : 'Add photo or video'
              }
              aria-label="Add media"
            >
              <ImageIcon />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <span className="text-xs text-ink-muted">
              {hasVideo ? '1 video' : `${imageCount}/${MAX_IMAGES_PER_POST} photos`}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`text-xs font-mono ${
                charsLeft < 50 ? 'text-amber-400' : 'text-ink-muted'
              } ${charsLeft < 0 ? 'text-red-400' : ''}`}
            >
              {charsLeft}
            </span>
            <button
              onClick={handleSubmit}
              disabled={submitting || !content.trim() || charsLeft < 0}
              className="px-5 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Posting…
                </>
              ) : (
                'Post'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ImageIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" strokeLinecap="round" />
      <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" stroke="none" />
      <polyline points="21 15 16 10 5 21" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
