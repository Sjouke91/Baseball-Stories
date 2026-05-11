'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { syncIndicator } from '@/lib/selectors';
import { useActiveTeam, useAppStore } from '@/stores/useAppStore';

const syncColor: Record<'synced' | 'pending' | 'offline', string> = {
  synced: 'bg-accent-2',
  pending: 'bg-warning',
  offline: 'bg-zinc-400',
};

const syncLabel: Record<'synced' | 'pending' | 'offline', string> = {
  synced: 'synced',
  pending: 'pending',
  offline: 'offline',
};

export function AppShell({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  const team = useActiveTeam();
  const online = useAppStore((state) => state.online);
  const setOnline = useAppStore((state) => state.setOnline);
  const flushPendingSync = useAppStore((state) => state.flushPendingSync);
  const plays = useAppStore((state) => state.plays);
  const indicator = syncIndicator(plays, online);

  useEffect(() => {
    const onOnline = () => {
      setOnline(true);
      flushPendingSync();
    };
    const onOffline = () => setOnline(false);

    setOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [flushPendingSync, setOnline]);

  return (
    <div className='min-h-screen'>
      <header className='sticky top-0 z-10 border-b border-black/10 bg-card/95 backdrop-blur'>
        <div className='mx-auto flex w-full max-w-6xl flex-wrap items-center gap-3 px-4 py-3'>
          <div>
            <p className='text-xs uppercase tracking-[0.24em] text-black/60'>
              Baseball Stories
            </p>
            <h1 className='text-2xl font-bold leading-tight'>{title}</h1>
          </div>
          <div className='ml-auto flex items-center gap-3'>
            <div className='rounded-full bg-muted px-3 py-1 text-sm font-semibold'>
              {team ? `${team.name} (${team.season})` : 'Maak eerst een team'}
            </div>
            <div className='flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wider'>
              <span
                className={`h-2.5 w-2.5 rounded-full ${syncColor[indicator]}`}
              />
              <span>{syncLabel[indicator]}</span>
            </div>
          </div>
          <nav className='flex w-full flex-wrap gap-2 text-sm font-medium'>
            <Link
              className='rounded-full border border-black/10 bg-white px-3 py-1.5 hover:bg-muted'
              href='/'
            >
              Dashboard
            </Link>
            <Link
              className='rounded-full border border-black/10 bg-white px-3 py-1.5 hover:bg-muted'
              href='/spelers'
            >
              Spelers
            </Link>
            <Link
              className='rounded-full border border-black/10 bg-white px-3 py-1.5 hover:bg-muted'
              href='/agenda'
            >
              Agenda
            </Link>
            <Link
              className='rounded-full border border-black/10 bg-white px-3 py-1.5 hover:bg-muted'
              href='/stats'
            >
              Stats
            </Link>
          </nav>
        </div>
      </header>
      <main className='mx-auto w-full max-w-6xl px-4 py-6'>{children}</main>
    </div>
  );
}
