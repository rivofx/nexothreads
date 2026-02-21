'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/types';
import CreatePostModal from '@/components/post/CreatePostModal';
import Avatar from '@/components/ui/Avatar';

interface NavBarProps {
  profile: Profile;
}

export default function NavBar({ profile }: NavBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 h-16 bg-surface-0/90 backdrop-blur-md border-b border-surface-2">
        <div className="max-w-2xl mx-auto h-full px-4 flex items-center justify-between">
          {/* Logo */}
          <Link
            href="/feed"
            className="text-2xl font-bold text-brand-400 hover:text-brand-300 transition-colors"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Nexo
          </Link>

          {/* Desktop nav */}
          <nav className="hidden sm:flex items-center gap-2">
            <Link
              href="/feed"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === '/feed'
                  ? 'text-ink-primary bg-surface-2'
                  : 'text-ink-secondary hover:text-ink-primary hover:bg-surface-1'
              }`}
            >
              Feed
            </Link>

            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-brand-500 hover:bg-brand-600 text-white transition-colors"
            >
              + Post
            </button>

            <Link
              href={`/profile/${profile.username}`}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname.startsWith('/profile')
                  ? 'text-ink-primary bg-surface-2'
                  : 'text-ink-secondary hover:text-ink-primary hover:bg-surface-1'
              }`}
            >
              <Avatar
                src={profile.avatar_url}
                name={profile.display_name || profile.username}
                size={24}
              />
              <span>{profile.display_name || profile.username}</span>
            </Link>

            <button
              onClick={handleLogout}
              className="px-3 py-2 rounded-lg text-sm text-ink-muted hover:text-ink-secondary hover:bg-surface-1 transition-colors"
            >
              Logout
            </button>
          </nav>

          {/* Mobile nav */}
          <div className="flex sm:hidden items-center gap-2">
            <button
              onClick={() => setShowCreate(true)}
              className="w-9 h-9 rounded-lg bg-brand-500 hover:bg-brand-600 text-white flex items-center justify-center transition-colors"
              aria-label="Create post"
            >
              <PlusIcon />
            </button>

            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="flex items-center"
                aria-label="Menu"
              >
                <Avatar
                  src={profile.avatar_url}
                  name={profile.display_name || profile.username}
                  size={32}
                />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-surface-2 border border-surface-3 rounded-xl shadow-xl overflow-hidden">
                  <Link
                    href="/feed"
                    className="block px-4 py-3 text-sm text-ink-secondary hover:text-ink-primary hover:bg-surface-3 transition-colors"
                    onClick={() => setShowMenu(false)}
                  >
                    Feed
                  </Link>
                  <Link
                    href={`/profile/${profile.username}`}
                    className="block px-4 py-3 text-sm text-ink-secondary hover:text-ink-primary hover:bg-surface-3 transition-colors"
                    onClick={() => setShowMenu(false)}
                  >
                    Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-surface-3 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {showCreate && (
        <CreatePostModal
          profile={profile}
          onClose={() => setShowCreate(false)}
          onSuccess={() => {
            setShowCreate(false);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 2v12M2 8h12" strokeLinecap="round" />
    </svg>
  );
}
