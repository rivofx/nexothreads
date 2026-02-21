'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { relativeTime } from '@/lib/utils';
import Avatar from '@/components/ui/Avatar';
import type { Comment } from '@/types';

interface CommentSectionProps {
  postId: string;
  currentUserId: string;
  onCommentAdded: () => void;
  onCommentDeleted: () => void;
}

export default function CommentSection({
  postId,
  currentUserId,
  onCommentAdded,
  onCommentDeleted,
}: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchComments = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('comments')
      .select('*, author:profiles(*)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
      .limit(50);

    setComments(data || []);
    setLoading(false);
  }, [postId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || trimmed.length > 500) return;

    setSubmitting(true);
    const supabase = createClient();

    const { data: newComment, error } = await supabase
      .from('comments')
      .insert({ post_id: postId, author_id: currentUserId, content: trimmed })
      .select('*, author:profiles(*)')
      .single();

    if (!error && newComment) {
      setComments((prev) => [...prev, newComment]);
      setText('');
      onCommentAdded();
    }

    setSubmitting(false);
  }

  async function handleDelete(commentId: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)
      .eq('author_id', currentUserId);

    if (!error) {
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      onCommentDeleted();
    }
  }

  return (
    <div className="px-5 py-4">
      {/* Comment list */}
      {loading ? (
        <div className="space-y-3 mb-4">
          {[1, 2].map((i) => (
            <div key={i} className="flex gap-2 animate-pulse">
              <div className="w-8 h-8 rounded-full skeleton flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-24 skeleton rounded" />
                <div className="h-3 w-full skeleton rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length > 0 ? (
        <div className="space-y-4 mb-4">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-3 group">
              <Link href={`/profile/${comment.author?.username}`} className="flex-shrink-0">
                <Avatar
                  src={comment.author?.avatar_url}
                  name={comment.author?.display_name || comment.author?.username || '?'}
                  size={32}
                />
              </Link>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <Link
                    href={`/profile/${comment.author?.username}`}
                    className="text-sm font-medium text-ink-primary hover:text-brand-300 transition-colors"
                  >
                    {comment.author?.display_name || comment.author?.username}
                  </Link>
                  <span className="text-xs text-ink-muted">
                    {relativeTime(comment.created_at)}
                  </span>
                </div>
                <p className="text-sm text-ink-secondary mt-0.5 post-content">
                  {comment.content}
                </p>
              </div>
              {comment.author_id === currentUserId && (
                <button
                  onClick={() => handleDelete(comment.id)}
                  className="opacity-0 group-hover:opacity-100 text-ink-muted hover:text-red-400 transition-all p-1 flex-shrink-0"
                  aria-label="Delete comment"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-ink-muted mb-4">No comments yet. Be first!</p>
      )}

      {/* Comment input */}
      <form onSubmit={handleSubmit} className="flex gap-2 items-end">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a comment…"
          maxLength={500}
          rows={1}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e as unknown as React.FormEvent);
            }
          }}
          className="flex-1 bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-ink-primary placeholder-ink-muted focus:outline-none focus:border-brand-500 transition-colors min-h-[38px]"
        />
        <button
          type="submit"
          disabled={submitting || !text.trim()}
          className="px-3 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex-shrink-0"
        >
          {submitting ? '…' : 'Send'}
        </button>
      </form>
    </div>
  );
}
