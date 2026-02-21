'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { relativeTime } from '@/lib/utils';
import Avatar from '@/components/ui/Avatar';
import CommentSection from '@/components/post/CommentSection';
import type { Post } from '@/types';

interface PostCardProps {
  post: Post;
  currentUserId: string;
  onUpdate: (post: Post) => void;
  onDelete: (id: string) => void;
}

export default function PostCard({ post, currentUserId, onUpdate, onDelete }: PostCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [heartAnim, setHeartAnim] = useState(false);

  const isOwner = post.author_id === currentUserId;

  async function handleLike() {
    if (heartAnim) return;
    setHeartAnim(true);
    setTimeout(() => setHeartAnim(false), 300);

    const supabase = createClient();
    const optimistic: Post = {
      ...post,
      user_has_liked: !post.user_has_liked,
      like_count: (post.like_count ?? 0) + (post.user_has_liked ? -1 : 1),
    };
    onUpdate(optimistic);

    if (post.user_has_liked) {
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('post_id', post.id)
        .eq('user_id', currentUserId);
      if (error) onUpdate(post); // rollback
    } else {
      const { error } = await supabase
        .from('likes')
        .insert({ post_id: post.id, user_id: currentUserId });
      if (error) onUpdate(post); // rollback
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this post?')) return;
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from('posts').delete().eq('id', post.id);
    if (!error) {
      onDelete(post.id);
    } else {
      setDeleting(false);
    }
  }

  const author = post.author;
  const media = post.media ?? [];

  return (
    <article className="bg-surface-1 border border-surface-2 rounded-2xl overflow-hidden animate-fade-in hover:border-surface-3 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between px-5 pt-5 pb-3">
        <Link
          href={`/profile/${author?.username}`}
          className="flex items-center gap-3 group"
        >
          <Avatar
            src={author?.avatar_url}
            name={author?.display_name || author?.username || '?'}
            size={40}
          />
          <div>
            <p className="font-medium text-ink-primary text-sm group-hover:text-brand-300 transition-colors">
              {author?.display_name || author?.username}
            </p>
            <p className="text-ink-muted text-xs">
              @{author?.username} · {relativeTime(post.created_at)}
            </p>
          </div>
        </Link>

        {isOwner && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-ink-muted hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-surface-3"
            aria-label="Delete post"
          >
            <TrashIcon />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="px-5 pb-3">
        <p className="post-content text-ink-primary text-sm leading-relaxed">
          {post.content}
        </p>
      </div>

      {/* Media */}
      {media.length > 0 && (
        <div className="px-5 pb-4">
          <MediaGallery media={media} />
        </div>
      )}

      {/* Actions */}
      <div className="px-5 pb-4 flex items-center gap-5 border-t border-surface-2 pt-3">
        <button
          onClick={handleLike}
          className={`flex items-center gap-1.5 text-sm transition-colors ${
            post.user_has_liked
              ? 'text-rose-400'
              : 'text-ink-muted hover:text-rose-400'
          }`}
          aria-label={post.user_has_liked ? 'Unlike' : 'Like'}
        >
          <span className={heartAnim ? 'animate-pulse-heart' : ''}>
            {post.user_has_liked ? <HeartFilledIcon /> : <HeartIcon />}
          </span>
          <span>{post.like_count ?? 0}</span>
        </button>

        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-1.5 text-sm text-ink-muted hover:text-brand-400 transition-colors"
          aria-label="Toggle comments"
        >
          <CommentIcon />
          <span>{post.comment_count ?? 0}</span>
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <div className="border-t border-surface-2">
          <CommentSection
            postId={post.id}
            currentUserId={currentUserId}
            onCommentAdded={() =>
              onUpdate({ ...post, comment_count: (post.comment_count ?? 0) + 1 })
            }
            onCommentDeleted={() =>
              onUpdate({ ...post, comment_count: Math.max(0, (post.comment_count ?? 0) - 1) })
            }
          />
        </div>
      )}
    </article>
  );
}

function MediaGallery({ media }: { media: NonNullable<Post['media']> }) {
  const images = media.filter((m) => m.type === 'image');
  const video = media.find((m) => m.type === 'video');

  if (video) {
    return (
      <video
        src={video.url}
        controls
        className="w-full rounded-xl max-h-80 object-cover bg-surface-2"
        preload="metadata"
      />
    );
  }

  if (images.length === 0) return null;

  const gridClass =
    images.length === 1
      ? 'grid-cols-1'
      : images.length === 2
      ? 'grid-cols-2'
      : images.length === 3
      ? 'grid-cols-2'
      : 'grid-cols-2';

  return (
    <div className={`grid ${gridClass} gap-1.5 rounded-xl overflow-hidden`}>
      {images.slice(0, 4).map((img, i) => (
        <div
          key={img.id}
          className={`relative bg-surface-2 overflow-hidden ${
            images.length === 3 && i === 0 ? 'row-span-2' : ''
          }`}
          style={{ aspectRatio: images.length === 1 ? '16/9' : '1' }}
        >
          <Image
            src={img.url}
            alt="Post image"
            fill
            className="object-cover hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 672px) 50vw, 336px"
          />
          {images.length > 4 && i === 3 && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <span className="text-white text-xl font-bold">+{images.length - 4}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function HeartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HeartFilledIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6" strokeLinecap="round" />
      <path d="M19 6l-1 14H6L5 6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 11v6M14 11v6" strokeLinecap="round" />
      <path d="M9 6V4h6v2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
