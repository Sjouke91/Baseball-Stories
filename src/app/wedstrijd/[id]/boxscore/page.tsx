'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { playerHittingStats } from '@/lib/selectors';
import { useAppStore } from '@/stores/useAppStore';

export default function BoxScorePage() {
  const params = useParams<{ id: string }>();
  const gameId = params.id;

  const snapshot = useAppStore();

  const game = snapshot.games.find((entry) => entry.id === gameId);
  const event = snapshot.events.find((entry) => entry.id === game?.eventId);
  const progress = snapshot.gameProgress[gameId];
  const rows = useMemo(
    () =>
      snapshot.players
        .filter((player) => player.active)
        .map((player) => ({
          player,
          hitting: playerHittingStats(snapshot, player),
        })),
    [snapshot],
  );

  if (!game || !event) {
    return (
      <AppShell title='Box score'>
        <p>Wedstrijd niet gevonden.</p>
      </AppShell>
    );
  }

  return (
    <AppShell title='Box score'>
      <section className='rounded-2xl border border-black/10 bg-card p-4'>
        <h2 className='text-2xl font-bold'>
          {event.opponent ? `vs ${event.opponent}` : 'Wedstrijd'}
        </h2>
        <p className='text-sm text-black/70'>
          Eindstand: {progress?.scoreFor ?? 0} - {progress?.scoreAgainst ?? 0}
        </p>
      </section>

      <section className='mt-4 overflow-x-auto rounded-2xl border border-black/10 bg-card p-4'>
        <table className='w-full min-w-[700px] text-sm'>
          <thead>
            <tr className='text-left'>
              <th className='py-2'>Speler</th>
              <th>AB</th>
              <th>H</th>
              <th>R</th>
              <th>RBI</th>
              <th>BB</th>
              <th>HR</th>
              <th>AVG</th>
              <th>OPS</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.player.id} className='border-t border-black/10'>
                <td className='py-2 font-medium'>{row.player.name}</td>
                <td>{row.hitting.ab}</td>
                <td>{row.hitting.h}</td>
                <td>{row.hitting.r}</td>
                <td>{row.hitting.rbi}</td>
                <td>{row.hitting.bb}</td>
                <td>{row.hitting.hr}</td>
                <td>{row.hitting.avg.toFixed(3)}</td>
                <td>{row.hitting.ops.toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className='mt-4 rounded-2xl border border-black/10 bg-card p-4'>
        <h3 className='text-lg font-bold'>Play log</h3>
        <div className='mt-3 grid gap-1 text-sm'>
          {snapshot.plays
            .filter((play) => play.gameId === gameId)
            .sort((a, b) => a.sequence - b.sequence)
            .map((play) => (
              <div key={play.id} className='rounded bg-white px-3 py-2'>
                #{play.sequence} · {play.inning} {play.half} · {play.result}
                {play.voided ? ' (voided)' : ''}
              </div>
            ))}
        </div>
      </section>
    </AppShell>
  );
}
