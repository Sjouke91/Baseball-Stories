'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { GameTabs } from '@/components/GameTabs';
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
  const moveRunner = useAppStore((state) => state.moveRunner);
  const advanceInning = useAppStore((state) => state.advanceInning);
  const recordOpponentRuns = useAppStore((state) => state.recordOpponentRuns);
  const finishGame = useAppStore((state) => state.finishGame);
  const undoLastPlay = useAppStore((state) => state.undoLastPlay);

  const game = games.find((entry) => entry.id === gameId);
  const event = events.find((entry) => entry.id === game?.eventId);
  const lineup = getLineupForGame({ lineups }, gameId);
  const isFinished = game?.status === 'klaar';

  const [pitcherId, setPitcherId] = useState('');
  const [opponentRunsInput, setOpponentRunsInput] = useState('1');

  const currentBatter = useMemo(() => {
    if (!lineup.length || !gameProgress) return undefined;
    const idx = gameProgress.battingIndex % lineup.length;
    const current = lineup[idx];
    return players.find((player) => player.id === current.playerId);
  }, [gameProgress, lineup, players]);

  const pendingCount = plays.filter(
    (play) => play.gameId === gameId && !play.voided,
  ).length;

  const inningRuns = useMemo(() => {
    const runsByInning = new Map<number, number>();
    for (const play of plays) {
      if (play.gameId !== gameId || play.voided || !play.runsScored) continue;
      const existing = runsByInning.get(play.inning) ?? 0;
      runsByInning.set(play.inning, existing + play.runsScored);
    }
    return Array.from(runsByInning.entries()).sort((a, b) => a[0] - b[0]);
  }, [gameId, plays]);

  const opponentInningRuns = useMemo(() => {
    const runsByInning = new Map<number, number>();

    for (const play of plays) {
      if (play.gameId !== gameId || play.voided || play.result !== 'OPP_RUNS') {
        continue;
      }

      const fromField = play.opponentRuns ?? 0;
      const fromNotes = Number(play.notes?.match(/(\d+)/)?.[1] ?? 0);
      const runs = fromField || fromNotes || 0;
      if (!runs) continue;

      const existing = runsByInning.get(play.inning) ?? 0;
      runsByInning.set(play.inning, existing + runs);
    }

    return Array.from(runsByInning.entries()).sort((a, b) => a[0] - b[0]);
  }, [gameId, plays]);

  const inningValues = useMemo(() => {
    const ownValues = Array.from({ length: 7 }).map((_, index) => {
      return inningRuns.find(([inning]) => inning === index + 1)?.[1] ?? 0;
    });

    const opponentValues = Array.from({ length: 7 }).map((_, index) => {
      return (
        opponentInningRuns.find(([inning]) => inning === index + 1)?.[1] ?? 0
      );
    });

    const gamePlays = plays.filter(
      (play) => play.gameId === gameId && !play.voided,
    );
    const hits = gamePlays.filter((play) =>
      ['1B', '2B', '3B', 'HR'].includes(play.result),
    ).length;
    const opponentErrors = gamePlays.filter(
      (play) => play.result === 'E',
    ).length;

    return {
      innings: ownValues,
      opponentInnings: opponentValues,
      runs: gameProgress?.scoreFor ?? 0,
      opponentRuns: gameProgress?.scoreAgainst ?? 0,
      hits,
      errors: opponentErrors,
    };
  }, [
    gameId,
    gameProgress?.scoreAgainst,
    gameProgress?.scoreFor,
    inningRuns,
    opponentInningRuns,
    plays,
  ]);

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
      <GameTabs gameId={gameId} current='score' />

      <div className='mb-4 flex flex-wrap gap-2'>
        <Link
          className='rounded-lg border border-black/15 bg-white px-3 py-2 text-sm font-semibold'
          href={`/wedstrijd/${gameId}`}
        >
          Terug naar wedstrijd
        </Link>
        <button
          className='rounded-lg bg-accent-2 px-3 py-2 text-sm font-semibold text-white'
          onClick={() => {
            const confirmed = window.confirm(
              'Weet je zeker dat je deze wedstrijd wilt beeindigen?',
            );
            if (!confirmed) return;
            finishGame(gameId);
          }}
          disabled={isFinished}
          type='button'
        >
          {isFinished ? 'Wedstrijd afgesloten' : 'Wedstrijd beeindigen'}
        </button>
      </div>

      <section className='grid gap-4 lg:grid-cols-[1fr_360px]'>
        <article className='rounded-2xl border border-black/10 bg-card p-4'>
          <div className='grid gap-2 sm:grid-cols-4'>
            <div className='rounded-lg bg-white p-3'>
              <p className='text-xs uppercase text-black/60'>Inning</p>
              <p className='text-xl font-bold'>{gameProgress?.inning ?? 1}</p>
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
                disabled={isFinished}
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
              disabled={isFinished}
              onClick={() => {
                if (
                  (gameProgress?.outs ?? 0) > 0 ||
                  gameProgress?.bases.first ||
                  gameProgress?.bases.second ||
                  gameProgress?.bases.third
                ) {
                  const confirmed = window.confirm(
                    'Er zijn nog outs/lopers actief. Toch handmatig naar de volgende inning?',
                  );
                  if (!confirmed) return;
                }
                advanceInning(gameId);
              }}
              type='button'
            >
              Volgende inning
            </button>
            <button
              className='rounded-lg border border-black/15 bg-white px-3 py-2 text-sm font-semibold'
              disabled={isFinished}
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

          <div className='mt-4 rounded-xl bg-white p-4'>
            <h3 className='text-sm font-semibold uppercase text-black/60'>
              Runs per inning
            </h3>
            <div className='mt-2 flex flex-wrap gap-2 text-sm'>
              {inningRuns.length ? (
                inningRuns.map(([inning, runs]) => (
                  <div
                    key={inning}
                    className='rounded border border-black/10 px-2 py-1'
                  >
                    {inning}: {runs}
                  </div>
                ))
              ) : (
                <p className='text-black/70'>
                  Nog geen runs in deze wedstrijd.
                </p>
              )}
            </div>
          </div>

          <div className='mt-4 overflow-x-auto rounded-xl bg-white p-4'>
            <h3 className='text-sm font-semibold uppercase text-black/60'>
              Scorecard
            </h3>
            <table className='mt-2 w-full min-w-[560px] text-sm'>
              <thead>
                <tr className='text-left'>
                  <th className='py-1 pr-2'>Team</th>
                  <th className='px-2'>1</th>
                  <th className='px-2'>2</th>
                  <th className='px-2'>3</th>
                  <th className='px-2'>4</th>
                  <th className='px-2'>5</th>
                  <th className='px-2'>6</th>
                  <th className='px-2'>7</th>
                  <th className='px-2'>R</th>
                  <th className='px-2'>H</th>
                  <th className='px-2'>E</th>
                </tr>
              </thead>
              <tbody>
                <tr className='border-t border-black/10'>
                  <td className='py-1 pr-2 font-semibold'>Ons team</td>
                  {inningValues.innings.map((value, index) => (
                    <td key={index} className='px-2'>
                      {value}
                    </td>
                  ))}
                  <td className='px-2 font-semibold'>{inningValues.runs}</td>
                  <td className='px-2 font-semibold'>{inningValues.hits}</td>
                  <td className='px-2 font-semibold'>{inningValues.errors}</td>
                </tr>
                <tr className='border-t border-black/10'>
                  <td className='py-1 pr-2 font-semibold'>Tegenstander</td>
                  {inningValues.opponentInnings.map((value, index) => (
                    <td key={index} className='px-2'>
                      {value}
                    </td>
                  ))}
                  <td className='px-2 font-semibold'>
                    {inningValues.opponentRuns}
                  </td>
                  <td className='px-2 font-semibold'>0</td>
                  <td className='px-2 font-semibold'>0</td>
                </tr>
              </tbody>
            </table>
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
                        disabled={isFinished}
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
                        disabled={isFinished}
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

                  {runnerId ? (
                    <div className='mt-2 flex flex-wrap gap-2'>
                      {[1, 2, 3, 4, 0]
                        .filter((target) => target !== base)
                        .map((target) => (
                          <button
                            key={target}
                            className='rounded border border-black/15 px-2 py-1 text-xs'
                            disabled={isFinished}
                            onClick={() =>
                              moveRunner({
                                gameId,
                                fromBase: base as 1 | 2 | 3,
                                toBase: target as 0 | 1 | 2 | 3 | 4,
                              })
                            }
                            type='button'
                          >
                            {target === 4
                              ? 'Naar home'
                              : target === 0
                                ? 'Uit'
                                : `Naar ${target}B`}
                          </button>
                        ))}
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

          <article className='rounded-2xl border border-black/10 bg-card p-4'>
            <h3 className='text-lg font-bold'>Tegenstander score</h3>
            <p className='mt-1 text-sm text-black/70'>
              Voeg runs van de tegenstander handmatig toe voor deze inning.
            </p>
            <div className='mt-3 flex gap-2'>
              <input
                className='w-24 rounded border border-black/15 px-2 py-2'
                disabled={isFinished}
                inputMode='numeric'
                min={1}
                onChange={(event) => setOpponentRunsInput(event.target.value)}
                value={opponentRunsInput}
              />
              <button
                className='rounded-lg border border-black/15 bg-white px-3 py-2 text-sm font-semibold'
                disabled={isFinished}
                onClick={() => {
                  const runs = Math.max(
                    1,
                    Math.trunc(Number(opponentRunsInput) || 1),
                  );
                  recordOpponentRuns({ gameId, runs });
                  setOpponentRunsInput('1');
                }}
                type='button'
              >
                + Tegenstander runs
              </button>
            </div>
          </article>
        </aside>
      </section>
    </AppShell>
  );
}
