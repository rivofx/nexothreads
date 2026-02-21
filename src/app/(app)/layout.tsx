import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import NavBar from '@/components/layout/NavBar';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) redirect('/login');

  return (
    <div className="min-h-screen bg-surface-0">
      <NavBar profile={profile} />
      <main className="pt-16 max-w-2xl mx-auto px-4 pb-20">
        {children}
      </main>
    </div>
  );
}
