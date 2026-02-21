export type Profile = {
  id: string;
  email: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at?: string;
};

export type Post = {
  id: string;
  author_id: string;
  content: string;
  created_at: string;
  updated_at?: string;
  author?: Profile;
  media?: PostMedia[];
  like_count?: number;
  comment_count?: number;
  user_has_liked?: boolean;
};

export type PostMedia = {
  id: string;
  post_id: string;
  type: 'image' | 'video';
  url: string;
  mime_type: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  created_at: string;
};

export type Like = {
  post_id: string;
  user_id: string;
  created_at: string;
};

export type Comment = {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
  updated_at?: string;
  author?: Profile;
};

export type ProfileUpdate = {
  display_name?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  onboarding_completed?: boolean;
  updated_at?: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string; username: string; email: string };
        Update: ProfileUpdate;
      };
      posts: {
        Row: Post;
        Insert: { author_id: string; content: string };
        Update: { content?: string; updated_at?: string };
      };
      post_media: {
        Row: PostMedia;
        Insert: Omit<PostMedia, 'id' | 'created_at'>;
        Update: Partial<PostMedia>;
      };
      likes: {
        Row: Like;
        Insert: { post_id: string; user_id: string };
        Update: Partial<Like>;
      };
      comments: {
        Row: Comment;
        Insert: { post_id: string; author_id: string; content: string };
        Update: { content?: string; updated_at?: string };
      };
    };
  };
};
