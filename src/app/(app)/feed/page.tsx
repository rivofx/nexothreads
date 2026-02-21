import { createClient } from '@/lib/supabase/server';
import FeedClient from '@/components/feed/FeedClient';
import type { Post } from '@/types';

export default async function FeedPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: posts } = await supabase
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
    .limit(10);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const enrichedPosts: Post[] = (posts || []).map((post: any) => ({
    id: post.id as string,
    author_id: post.author_id as string,
    content: post.content as string,
    created_at: post.created_at as string,
    updated_at: (post.updated_at ?? post.created_at) as string,
    author: post.author,
    media: post.media ?? [],
    like_count: (post.likes?.length ?? 0) as number,
    comment_count: (post.comments?.length ?? 0) as number,
    user_has_liked: (post.likes?.some((l: { user_id: string }) => l.user_id === user.id) ?? false) as boolean,
  }));

  return <FeedClient initialPosts={enrichedPosts} currentUserId={user.id} />;
}
