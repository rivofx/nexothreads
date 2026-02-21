'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be 30 characters or less')
    .regex(/^[a-z0-9_]+$/, 'Username can only contain lowercase letters, numbers, and underscores'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const result = registerSchema.safeParse({ email, username: username.toLowerCase(), password });
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setLoading(true);
    const supabase = createClient();

    // Check username availability
    const { data: existing } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', result.data.username)
      .maybeSingle();

    if (existing) {
      setError('That username is already taken. Try another.');
      setLoading(false);
      return;
    }

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: result.data.email,
      password: result.data.password,
      options: { emailRedirectTo: undefined },
    });

    if (authError || !authData.user) {
      setError(authError?.message || 'Failed to create account');
      setLoading(false);
      return;
    }

    // Create profile row
    const { error: profileError } = await supabase.from('profiles').insert({
      id: authData.user.id,
      email: result.data.email,
      username: result.data.username,
      display_name: null,
      onboarding_completed: false,
    });

    if (profileError) {
      // Rollback: delete auth user via sign-out (can't delete from client)
      await supabase.auth.signOut();
      setError('Failed to create profile. Username may already be taken.');
      setLoading(false);
      return;
    }

    router.push('/onboarding');
    setLoading(false);
  }

  return (
    <div className="bg-surface-1 border border-surface-3 rounded-2xl p-8 shadow-2xl animate-slide-up">
      <h2 className="text-2xl font-semibold text-ink-primary mb-1">Create an account</h2>
      <p className="text-ink-secondary text-sm mb-8">Join the conversation</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className="block text-sm text-ink-secondary mb-1.5">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
            className="w-full bg-surface-2 border border-surface-3 rounded-lg px-4 py-3 text-ink-primary placeholder-ink-muted text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-colors"
          />
        </div>

        <div>
          <label htmlFor="username" className="block text-sm text-ink-secondary mb-1.5">
            Username
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted text-sm">@</span>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="yourcoolname"
              autoComplete="username"
              required
              className="w-full bg-surface-2 border border-surface-3 rounded-lg pl-8 pr-4 py-3 text-ink-primary placeholder-ink-muted text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-colors"
            />
          </div>
          <p className="mt-1 text-xs text-ink-muted">Letters, numbers, underscores only</p>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm text-ink-secondary mb-1.5">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            autoComplete="new-password"
            required
            className="w-full bg-surface-2 border border-surface-3 rounded-lg px-4 py-3 text-ink-primary placeholder-ink-muted text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-colors"
          />
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
              Creating account…
            </>
          ) : (
            'Create account'
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-secondary">
        Already have an account?{' '}
        <Link href="/login" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  );
}
