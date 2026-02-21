'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { generateStoragePath, ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE } from '@/lib/utils';
import type { ProfileUpdate } from '@/types';
import { z } from 'zod';

const onboardingSchema = z.object({
  display_name: z.string().min(1, 'Display name is required').max(50, 'Max 50 characters'),
  bio: z.string().max(160, 'Bio max 160 characters').optional(),
});

export default function OnboardingPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError('Avatar must be JPG, PNG, or WebP');
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setError('Avatar must be under 8MB');
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const result = onboardingSchema.safeParse({ display_name: displayName, bio: bio || undefined });
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    let avatarUrl: string | null = null;

    if (avatarFile) {
      const path = generateStoragePath(user.id, avatarFile.name);
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, avatarFile, { upsert: true });

      if (uploadError) {
        setError('Failed to upload avatar: ' + uploadError.message);
        setLoading(false);
        return;
      }

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      avatarUrl = urlData.publicUrl;
    }

    const updatePayload: ProfileUpdate = {
      display_name: result.data.display_name,
      bio: result.data.bio ?? null,
      avatar_url: avatarUrl,
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', user.id);

    if (updateError) {
      setError('Failed to save profile: ' + updateError.message);
      setLoading(false);
      return;
    }

    router.push('/feed');
  }

  return (
    <div className="min-h-screen bg-surface-0 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1
            className="text-4xl font-bold text-brand-400"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Nexo
          </h1>
        </div>

        <div className="bg-surface-1 border border-surface-3 rounded-2xl p-8 shadow-2xl animate-slide-up">
          <h2 className="text-2xl font-semibold text-ink-primary mb-1">Set up your profile</h2>
          <p className="text-ink-secondary text-sm mb-8">Tell the world who you are</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="relative w-24 h-24 rounded-full overflow-hidden bg-surface-2 border-2 border-dashed border-surface-4 hover:border-brand-500 transition-colors group"
              >
                {avatarPreview ? (
                  <Image
                    src={avatarPreview}
                    alt="Avatar preview"
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center w-full h-full text-ink-muted group-hover:text-brand-400 transition-colors">
                    <CameraIcon />
                    <span className="text-xs mt-1">Add photo</span>
                  </div>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarChange}
                className="hidden"
              />
              <p className="text-xs text-ink-muted">Optional — JPG, PNG, WebP up to 8MB</p>
            </div>

            {/* Display name */}
            <div>
              <label htmlFor="display_name" className="block text-sm text-ink-secondary mb-1.5">
                Display name <span className="text-brand-500">*</span>
              </label>
              <input
                id="display_name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your full name or nickname"
                maxLength={50}
                required
                className="w-full bg-surface-2 border border-surface-3 rounded-lg px-4 py-3 text-ink-primary placeholder-ink-muted text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-colors"
              />
            </div>

            {/* Bio */}
            <div>
              <label htmlFor="bio" className="block text-sm text-ink-secondary mb-1.5">
                Bio <span className="text-ink-muted text-xs">(optional)</span>
              </label>
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell people a bit about yourself…"
                maxLength={160}
                rows={3}
                className="w-full bg-surface-2 border border-surface-3 rounded-lg px-4 py-3 text-ink-primary placeholder-ink-muted text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-colors"
              />
              <p className="mt-1 text-xs text-ink-muted text-right">{bio.length}/160</p>
            </div>

            {error && (
              <div className="bg-red-950/50 border border-red-800/50 rounded-lg px-4 py-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving…
                </>
              ) : (
                'Continue to feed →'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function CameraIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="13" r="4" strokeLinecap="round" />
    </svg>
  );
}
