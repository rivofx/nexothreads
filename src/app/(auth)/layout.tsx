export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-0 relative overflow-hidden">
      {/* Background texture */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #f5f0e8 1px, transparent 0)`,
          backgroundSize: '32px 32px',
        }}
      />
      {/* Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-brand-600/5 blur-[120px] pointer-events-none" />
      <div className="relative z-10 w-full max-w-md px-4">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1
            className="text-5xl font-bold text-brand-400"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Nexo
          </h1>
          <p className="mt-2 text-ink-secondary text-sm tracking-wide">Share your world</p>
        </div>
        {children}
      </div>
    </div>
  );
}
