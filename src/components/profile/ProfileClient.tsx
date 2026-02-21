'use client';

import { useState } from 'react';
import PostCard from '@/components/post/PostCard';
import type { Post } from '@/types';

interface ProfileClientProps {
  initialPosts: Post[];
  currentUserId: string;
  profileId: string;
}

export default function ProfileClient({ initialPosts, currentUserId }: ProfileClientProps) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);

  function updatePost(updated: Post) {
    setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }

  function removePost(id: string) {
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 rounded-full bg-surface-2 flex items-center justify-center mb-3 text-2xl">
          ✦
        </div>
        <p className="text-ink-secondary text-sm">No posts yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          currentUserId={currentUserId}
          onUpdate={updatePost}
          onDelete={removePost}
        />
      ))}
    </div>
  );
}
