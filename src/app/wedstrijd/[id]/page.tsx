'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { useAppStore } from '@/stores/useAppStore';

export default function GameDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const games = useAppStore((state) => state.games);
  const events = useAppStore((state) => state.events);
  const lineups = useAppStore((state) => state.lineups);
  const gameProgress = useAppStore((state) => state.gameProgress);

  const game = games.find((entry) => entry.id === id);
  const event = events.find((entry) => entry.id === game?.eventId);
  const lineupSize = lineups.filter((entry) => entry.gameId === id).length;
  const progress = gameProgress[id];

  const score = useMemo(() => {
    if (!progress) return '0 - 0';
    return `${progress.scoreFor} - ${progress.scoreAgainst}`;
  }, [progress]);

  if (!game || !event) {
    return (
      <AppShell title='Wedstrijd-detail'>
        <p>Wedstrijd niet gevonden.</p>
      </AppShell>
    );
  }

  return (
    <AppShell title='Wedstrijd-detail'>
      <section className='rounded-2xl border border-black/10 bg-card p-5'>
        <p className='text-xs uppercase tracking-wide text-black/60'>
          {game.homeAway}
        </p>
        <h2 className='text-2xl font-bold'>
          {event.opponent ? `vs ${event.opponent}` : 'Wedstrijd'}
        </h2>
        <p className='mt-1 text-sm text-black/70'>
          {event.date} {event.time ? `· ${event.time}` : ''}{' '}
          {event.location ? `· ${event.location}` : ''}
        </p>
        <div className='mt-4 grid gap-3 sm:grid-cols-3'>
          <div className='rounded-xl bg-white p-3'>
            <p className='text-xs uppercase text-black/60'>Status</p>
            <p className='text-lg font-semibold'>{game.status}</p>
          </div>
          <div className='rounded-xl bg-white p-3'>
            <p className='text-xs uppercase text-black/60'>Line-up spelers</p>
            <p className='text-lg font-semibold'>{lineupSize}</p>
          </div>
          <div className='rounded-xl bg-white p-3'>
            <p className='text-xs uppercase text-black/60'>Score</p>
            <p className='text-lg font-semibold'>{score}</p>
          </div>
        </div>
        <div className='mt-4 flex flex-wrap gap-2'>
          <Link
            className='rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white'
            href={`/wedstrijd/${id}/lineup`}
          >
            Line-up builder
          </Link>
          <Link
            className='rounded-lg bg-accent-2 px-3 py-2 text-sm font-semibold text-white'
            href={`/wedstrijd/${id}/score`}
          >
            Start scoresheet
          </Link>
          <Link
            className='rounded-lg border border-black/15 bg-white px-3 py-2 text-sm font-semibold'
            href={`/wedstrijd/${id}/boxscore`}
          >
            Box score
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
