'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { getLineupForGame } from '@/lib/selectors';
import { useAppStore } from '@/stores/useAppStore';
import type { PlayResult } from '@/types/models';

const buttons: PlayResult[] = ['1B', '2B', '3B', 'HR', 'BB', 'K', 'OUT', 'E'];

export default function ScorePage() {
  const params = useParams<{ id: string }>();
  const gameId = params.id;

  const games = useAppStore((state) => state.games);
  const events = useAppStore((state) => state.events);
  const players = useAppStore((state) => state.players);
  const lineups = useAppStore((state) => state.lineups);
  const plays = useAppStore((state) => state.plays);
  const gameProgress = useAppStore((state) => state.gameProgress[gameId]);
  const recordPlay = useAppStore((state) => state.recordPlay);
  const recordRunnerAction = useAppStore((state) => state.recordRunnerAction);
  const undoLastPlay = useAppStore((state) => state.undoLastPlay);

  const game = games.find((entry) => entry.id === gameId);
  const event = events.find((entry) => entry.id === game?.eventId);
  const lineup = getLineupForGame({ lineups }, gameId);

  const [pitcherId, setPitcherId] = useState('');

  const currentBatter = useMemo(() => {
    if (!lineup.length || !gameProgress) return undefined;
    const idx = gameProgress.battingIndex % lineup.length;
    const current = lineup[idx];
    return players.find((player) => player.id === current.playerId);
  }, [gameProgress, lineup, players]);

  const pendingCount = plays.filter(
    (play) => play.gameId === gameId && !play.voided,
  ).length;

  if (!game || !event) {
    return (
      <AppShell title='Live scoresheet'>
        <p>Wedstrijd niet gevonden.</p>
      </AppShell>
    );
  }

  if (!lineup.length) {
    return (
      <AppShell title='Live scoresheet'>
        <p className='mb-3'>Maak eerst een line-up.</p>
        <Link
          className='rounded-lg bg-accent px-3 py-2 font-semibold text-white'
          href={`/wedstrijd/${gameId}/lineup`}
        >
          Naar line-up builder
        </Link>
      </AppShell>
    );
  }

  return (
    <AppShell title='Live scoresheet'>
      <section className='grid gap-4 lg:grid-cols-[1fr_360px]'>
        <article className='rounded-2xl border border-black/10 bg-card p-4'>
          <div className='grid gap-2 sm:grid-cols-4'>
            <div className='rounded-lg bg-white p-3'>
              <p className='text-xs uppercase text-black/60'>Inning</p>
              <p className='text-xl font-bold'>
                {gameProgress?.inning ?? 1} · {gameProgress?.half ?? 'top'}
              </p>
            </div>
            <div className='rounded-lg bg-white p-3'>
              <p className='text-xs uppercase text-black/60'>Score</p>
              <p className='text-xl font-bold'>
                {gameProgress?.scoreFor ?? 0} -{' '}
                {gameProgress?.scoreAgainst ?? 0}
              </p>
            </div>
            <div className='rounded-lg bg-white p-3'>
              <p className='text-xs uppercase text-black/60'>Outs</p>
              <p className='text-xl font-bold'>{gameProgress?.outs ?? 0}</p>
            </div>
            <div className='rounded-lg bg-white p-3'>
              <p className='text-xs uppercase text-black/60'>Plays</p>
              <p className='text-xl font-bold'>{pendingCount}</p>
            </div>
          </div>

          <div className='mt-4 rounded-xl bg-white p-4'>
            <p className='text-xs uppercase text-black/60'>Huidige slagman</p>
            <p className='text-2xl font-bold'>{currentBatter?.name ?? '-'}</p>
          </div>

          <div className='mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4'>
            {buttons.map((result) => (
              <button
                key={result}
                className='rounded-xl border border-black/10 bg-accent px-4 py-4 text-lg font-bold text-white hover:opacity-90'
                onClick={() =>
                  recordPlay({
                    gameId,
                    result,
                    pitcherId: pitcherId || undefined,
                  })
                }
                type='button'
              >
                {result}
              </button>
            ))}
          </div>

          <div className='mt-4 flex flex-wrap gap-2'>
            <button
              className='rounded-lg border border-black/15 bg-white px-3 py-2 text-sm font-semibold'
              onClick={() => undoLastPlay(gameId)}
              type='button'
            >
              Undo laatste play
            </button>
            <Link
              className='rounded-lg border border-black/15 bg-white px-3 py-2 text-sm font-semibold'
              href={`/wedstrijd/${gameId}/boxscore`}
            >
              Box score
            </Link>
          </div>
        </article>

        <aside className='space-y-4'>
          <article className='rounded-2xl border border-black/10 bg-card p-4'>
            <h3 className='text-lg font-bold'>Basessituatie</h3>
            <div className='mt-3 grid gap-2 text-sm'>
              {(
                [
                  ['1B', gameProgress?.bases.first, 1],
                  ['2B', gameProgress?.bases.second, 2],
                  ['3B', gameProgress?.bases.third, 3],
                ] as const
              ).map(([baseLabel, runnerId, base]) => (
                <div key={baseLabel} className='rounded-lg bg-white p-3'>
                  <p className='font-semibold'>{baseLabel}</p>
                  <p className='text-black/70'>
                    {runnerId
                      ? (players.find((player) => player.id === runnerId)
                          ?.name ?? 'Onbekend')
                      : 'Leeg'}
                  </p>
                  {runnerId ? (
                    <div className='mt-2 flex gap-2'>
                      <button
                        className='rounded border border-black/15 px-2 py-1 text-xs'
                        onClick={() =>
                          recordRunnerAction({
                            gameId,
                            base: base as 1 | 2 | 3,
                            type: 'SB',
                          })
                        }
                        type='button'
                      >
                        SB
                      </button>
                      <button
                        className='rounded border border-black/15 px-2 py-1 text-xs'
                        onClick={() =>
                          recordRunnerAction({
                            gameId,
                            base: base as 1 | 2 | 3,
                            type: 'CS',
                          })
                        }
                        type='button'
                      >
                        CS
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </article>

          <article className='rounded-2xl border border-black/10 bg-card p-4'>
            <h3 className='text-lg font-bold'>Pitcher</h3>
            <select
              className='mt-2 w-full rounded-lg border border-black/15 bg-white px-3 py-2'
              value={pitcherId}
              onChange={(event) => setPitcherId(event.target.value)}
            >
              <option value=''>Niet geselecteerd</option>
              {players.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name}
                </option>
              ))}
            </select>
          </article>
        </aside>
      </section>
    </AppShell>
  );
}
