'use client';

import { useState, useCallback, useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { createClient } from '@/lib/supabase/client';
import PostCard from '@/components/post/PostCard';
import type { Post } from '@/types';

interface FeedClientProps {
  initialPosts: Post[];
  currentUserId: string;
}

export default function FeedClient({ initialPosts, currentUserId }: FeedClientProps) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [hasMore, setHasMore] = useState(initialPosts.length === 10);
  const [loading, setLoading] = useState(false);
  const { ref, inView } = useInView({ threshold: 0 });

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);

    const supabase = createClient();
    const lastPost = posts[posts.length - 1];

    const { data } = await supabase
      .from('posts')
      .select(`
        id,
        author_id,
        content,
        created_at,
        updated_at,
        author:profiles(*),
        media:post_media(*),
        likes(user_id),
        comments(id)
      `)
      .order('created_at', { ascending: false })
      .lt('created_at', lastPost.created_at)
      .limit(10);

    if (!data || data.length === 0) {
      setHasMore(false);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const enriched: Post[] = data.map((post: any) => ({
        id: post.id as string,
        author_id: post.author_id as string,
        content: post.content as string,
        created_at: post.created_at as string,
        updated_at: (post.updated_at ?? post.created_at) as string,
        author: post.author,
        media: post.media ?? [],
        like_count: (post.likes?.length ?? 0) as number,
        comment_count: (post.comments?.length ?? 0) as number,
        user_has_liked: (post.likes?.some((l: { user_id: string }) => l.user_id === currentUserId) ?? false) as boolean,
      }));
      setPosts((prev) => [...prev, ...enriched]);
      if (data.length < 10) setHasMore(false);
    }

    setLoading(false);
  }, [loading, hasMore, posts, currentUserId]);

  useEffect(() => {
    if (inView) loadMore();
  }, [inView, loadMore]);

  function updatePost(updated: Post) {
    setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }

  function removePost(id: string) {
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-surface-2 flex items-center justify-center mb-4 text-3xl">
          ✦
        </div>
        <h3 className="text-lg font-medium text-ink-primary mb-2">Nothing here yet</h3>
        <p className="text-ink-secondary text-sm">Be the first to post something!</p>
      </div>
    );
  }

  return (
    <div className="py-6 space-y-4">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          currentUserId={currentUserId}
          onUpdate={updatePost}
          onDelete={removePost}
        />
      ))}

      <div ref={ref} className="h-4" />

      {loading && (
        <div className="flex justify-center py-4">
          <span className="w-6 h-6 border-2 border-surface-3 border-t-brand-500 rounded-full animate-spin" />
        </div>
      )}

      {!hasMore && posts.length > 0 && (
        <p className="text-center text-ink-muted text-sm py-6">
          You&apos;ve reached the end
        </p>
      )}
    </div>
  );
}
