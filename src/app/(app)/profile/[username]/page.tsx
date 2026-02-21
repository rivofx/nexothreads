import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import ProfileClient from '@/components/profile/ProfileClient';
import Avatar from '@/components/ui/Avatar';
import EditButtonClient from '@/components/profile/EditButtonClient';
import type { Post } from '@/types';

interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single();

  if (!profile) notFound();

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
    .eq('author_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(20);

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

  const isOwner = user.id === profile.id;

  return (
    <div className="py-8">
      <div className="bg-surface-1 border border-surface-2 rounded-2xl p-6 mb-6 animate-slide-up">
        <div className="flex items-start justify-between gap-4">
          <Avatar
            src={profile.avatar_url}
            name={profile.display_name || profile.username}
            size={72}
          />
          {isOwner && <EditButtonClient profile={profile} />}
        </div>
        <div className="mt-4">
          <h1 className="text-xl font-semibold text-ink-primary">
            {profile.display_name || profile.username}
          </h1>
          <p className="text-ink-muted text-sm mt-0.5">@{profile.username}</p>
          {profile.bio && (
            <p className="text-ink-secondary text-sm mt-3 leading-relaxed">{profile.bio}</p>
          )}
        </div>
        <div className="mt-4 pt-4 border-t border-surface-2">
          <p className="text-sm text-ink-muted">
            <span className="text-ink-primary font-medium">{enrichedPosts.length}</span> posts
          </p>
        </div>
      </div>

      <ProfileClient
        initialPosts={enrichedPosts}
        currentUserId={user.id}
        profileId={profile.id}
      />
    </div>
  );
}
