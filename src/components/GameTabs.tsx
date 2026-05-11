import Link from 'next/link';

interface GameTabsProps {
  gameId: string;
  current: 'overzicht' | 'lineup' | 'score' | 'boxscore';
}

const tabs = [
  { key: 'overzicht', label: 'Overzicht', href: (id: string) => `/wedstrijd/${id}/overzicht` },
  { key: 'lineup', label: 'Line-up', href: (id: string) => `/wedstrijd/${id}/lineup` },
  { key: 'score', label: 'Live scoresheet', href: (id: string) => `/wedstrijd/${id}/score` },
  { key: 'boxscore', label: 'Box score', href: (id: string) => `/wedstrijd/${id}/boxscore` },
] as const;

export function GameTabs({ gameId, current }: GameTabsProps) {
  return (
    <nav className='mb-4 flex flex-wrap gap-2'>
      {tabs.map((tab) => {
        const isActive = tab.key === current;
        return (
          <Link
            key={tab.key}
            className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${
              isActive
                ? 'border-accent bg-accent text-white'
                : 'border-black/15 bg-white hover:bg-muted'
            }`}
            href={tab.href(gameId)}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
