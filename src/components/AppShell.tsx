'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useSupabaseSnapshotSync } from '@/hooks/useSupabaseSnapshotSync';
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
  useSupabaseSnapshotSync();

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
      <header className='sticky top-0 z-10 border-b border-white/10 bg-slate-950/90 text-white shadow-xl backdrop-blur-md'>
        <div className='mx-auto flex w-full max-w-6xl flex-wrap items-center gap-3 px-4 py-3'>
          <div>
            <p className='text-xs uppercase tracking-[0.24em] text-white/60'>
              Baseball Stories
            </p>
            <h1 className='text-2xl font-bold leading-tight'>{title}</h1>
          </div>
          <div className='ml-auto flex items-center gap-3'>
            <div className='rounded-full border border-white/15 bg-white/10 px-3 py-1 text-sm font-semibold text-white'>
              {team ? `${team.name} (${team.season})` : 'Maak eerst een team'}
            </div>
            <div className='flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white'>
              <span
                className={`h-2.5 w-2.5 rounded-full ${syncColor[indicator]}`}
              />
              <span>{syncLabel[indicator]}</span>
            </div>
          </div>
          <nav className='flex w-full flex-wrap gap-2 text-sm font-medium'>
            <Link
              className='rounded-full border border-white/15 bg-white/10 px-3 py-1.5 font-semibold text-white hover:-translate-y-0.5 hover:bg-white/20'
              href='/'
            >
              Dashboard
            </Link>
            <Link
              className='rounded-full border border-white/15 bg-white/10 px-3 py-1.5 font-semibold text-white hover:-translate-y-0.5 hover:bg-white/20'
              href='/spelers'
            >
              Spelers
            </Link>
            <Link
              className='rounded-full border border-white/15 bg-white/10 px-3 py-1.5 font-semibold text-white hover:-translate-y-0.5 hover:bg-white/20'
              href='/agenda'
            >
              Agenda
            </Link>
            <Link
              className='rounded-full border border-white/15 bg-white/10 px-3 py-1.5 font-semibold text-white hover:-translate-y-0.5 hover:bg-white/20'
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
