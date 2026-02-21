'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { generateStoragePath, ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE } from '@/lib/utils';
import Avatar from '@/components/ui/Avatar';
import type { Profile, ProfileUpdate } from '@/types';
import { z } from 'zod';

const editSchema = z.object({
  display_name: z.string().min(1, 'Display name required').max(50, 'Max 50 characters'),
  bio: z.string().max(160, 'Bio max 160 characters').optional(),
});

export default function EditButtonClient({ profile }: { profile: Profile }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="px-4 py-2 text-sm border border-surface-3 rounded-lg text-ink-secondary hover:text-ink-primary hover:border-surface-4 transition-colors"
      >
        Edit profile
      </button>
      {showModal && (
        <EditProfileModal profile={profile} onClose={() => setShowModal(false)} />
      )}
    </>
  );
}

function EditProfileModal({ profile, onClose }: { profile: Profile; onClose: () => void }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState(profile.display_name || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile.avatar_url);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) { setError('Use JPG, PNG, or WebP'); return; }
    if (file.size > MAX_IMAGE_SIZE) { setError('Image must be under 8MB'); return; }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setError('');
  }

  async function handleSave() {
    const result = editSchema.safeParse({
      display_name: displayName,
      bio: bio || undefined,
    });
    if (!result.success) { setError(result.error.errors[0].message); return; }

    setLoading(true);
    const supabase = createClient();
    let avatarUrl = profile.avatar_url;

    if (avatarFile) {
      const path = generateStoragePath(profile.id, avatarFile.name);
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, avatarFile, { upsert: true });

      if (uploadError) { setError('Failed to upload avatar'); setLoading(false); return; }
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      avatarUrl = data.publicUrl;
    }

    const updatePayload: ProfileUpdate = {
      display_name: result.data.display_name,
      bio: result.data.bio ?? null,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', profile.id);

    if (updateError) { setError(updateError.message); setLoading(false); return; }

    router.refresh();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md bg-surface-1 border border-surface-3 rounded-2xl shadow-2xl animate-slide-up overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-2">
          <h2 className="text-base font-semibold text-ink-primary">Edit profile</h2>
          <button
            onClick={onClose}
            className="text-ink-muted hover:text-ink-primary text-sm px-2 py-1 rounded hover:bg-surface-2 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative w-16 h-16 rounded-full overflow-hidden group flex-shrink-0"
            >
              {avatarPreview ? (
                <Image src={avatarPreview} alt="Avatar" fill className="object-cover" />
              ) : (
                <Avatar src={null} name={displayName || profile.username} size={64} />
              )}
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                <span className="text-white text-xs">Change</span>
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarChange}
              className="hidden"
            />
            <div>
              <p className="text-sm text-ink-secondary">Profile photo</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-sm text-brand-400 hover:text-brand-300 transition-colors"
              >
                Upload new
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm text-ink-secondary mb-1.5">Display name</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={50}
              className="w-full bg-surface-2 border border-surface-3 rounded-lg px-4 py-3 text-sm text-ink-primary focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm text-ink-secondary mb-1.5">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={160}
              rows={3}
              className="w-full bg-surface-2 border border-surface-3 rounded-lg px-4 py-3 text-sm text-ink-primary focus:outline-none focus:border-brand-500 transition-colors"
            />
            <p className="text-xs text-ink-muted text-right mt-1">{bio.length}/160</p>
          </div>

          {error && (
            <div className="bg-red-950/50 border border-red-800/50 rounded-lg px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 text-sm border border-surface-3 rounded-lg text-ink-secondary hover:bg-surface-2 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 py-2.5 text-sm bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Save changes'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
