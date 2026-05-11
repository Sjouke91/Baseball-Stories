'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { GameTabs } from '@/components/GameTabs';
import { getLineupForGame } from '@/lib/selectors';
import { useAppStore } from '@/stores/useAppStore';

const positions = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'];

export default function LineupPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const gameId = params.id;

  const players = useAppStore((state) => state.players);
  const games = useAppStore((state) => state.games);
  const lineups = useAppStore((state) => state.lineups);
  const setLineup = useAppStore((state) => state.setLineup);

  const game = games.find((entry) => entry.id === gameId);
  const existing = useMemo(
    () => getLineupForGame({ lineups }, gameId),
    [gameId, lineups],
  );

  const activePlayers = useMemo(() => {
    if (!game) return [];
    return players.filter((player) => player.active);
  }, [game, players]);

  const [entries, setEntries] = useState(
    Array.from({ length: 9 }).map((_, index) => ({
      playerId: existing[index]?.playerId ?? '',
      startingPosition:
        existing[index]?.startingPosition ?? positions[index] ?? 'DH',
    })),
  );
  const [message, setMessage] = useState('');

  if (!game) {
    return (
      <AppShell title='Line-up builder'>
        <p>Wedstrijd niet gevonden.</p>
      </AppShell>
    );
  }

  return (
    <AppShell title='Line-up builder'>
      <GameTabs gameId={gameId} current='lineup' />

      <div className='mb-4'>
        <Link
          className='rounded-lg border border-black/15 bg-white px-3 py-2 text-sm font-semibold'
          href={`/wedstrijd/${gameId}`}
        >
          Terug naar wedstrijd
        </Link>
      </div>

      <section className='rounded-2xl border border-black/10 bg-card p-4'>
        <p className='text-sm text-black/70'>
          Stel batting order en startposities in.
        </p>
        <div className='mt-3 grid gap-2'>
          {entries.map((entry, index) => (
            <div
              key={index}
              className='grid grid-cols-[56px_1fr_100px] gap-2 rounded-lg bg-white p-2'
            >
              <div className='flex items-center justify-center rounded bg-muted font-semibold'>
                {index + 1}
              </div>
              <select
                className='rounded border border-black/15 px-2 py-2'
                value={entry.playerId}
                onChange={(event) => {
                  const next = [...entries];
                  next[index] = {
                    ...next[index],
                    playerId: event.target.value,
                  };
                  setEntries(next);
                }}
              >
                <option value=''>Selecteer speler</option>
                {activePlayers.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.name}
                  </option>
                ))}
              </select>
              <select
                className='rounded border border-black/15 px-2 py-2'
                value={entry.startingPosition}
                onChange={(event) => {
                  const next = [...entries];
                  next[index] = {
                    ...next[index],
                    startingPosition: event.target.value,
                  };
                  setEntries(next);
                }}
              >
                {positions.map((position) => (
                  <option key={position} value={position}>
                    {position}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <button
          className='mt-4 rounded-lg bg-accent px-3 py-2 font-semibold text-white'
          onClick={() => {
            const selected = entries.filter((entry) => entry.playerId);
            const unique = new Set(selected.map((entry) => entry.playerId));

            if (!selected.length) {
              setMessage('Kies minimaal 1 speler om op te slaan.');
              return;
            }

            if (unique.size !== selected.length) {
              setMessage('Elke speler mag maar 1 keer in de line-up staan.');
              return;
            }

            setLineup(gameId, selected);
            setMessage('Line-up opgeslagen.');
            router.push(`/wedstrijd/${gameId}/score`);
          }}
          type='button'
        >
          Line-up opslaan
        </button>
        {message ? (
          <p className='mt-2 text-sm text-black/70'>{message}</p>
        ) : null}
      </section>
    </AppShell>
  );
}
