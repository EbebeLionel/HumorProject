// Laughing face in the app's neon cyan → pink gradient
export default function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="logo-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#45f3ff" />
          <stop offset="1" stopColor="#f3357e" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="21" fill="none" stroke="url(#logo-gradient)" strokeWidth="3.5" />
      <path d="M14 19.5q3-4 6 0M28 19.5q3-4 6 0" fill="none" stroke="#45f3ff" strokeWidth="3" strokeLinecap="round" />
      <path d="M13 26h22q-1.5 10-11 10t-11-10z" fill="url(#logo-gradient)" />
    </svg>
  );
}
