'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { GameTabs } from '@/components/GameTabs';
import { getLineupForGame } from '@/lib/selectors';
import { useAppStore } from '@/stores/useAppStore';

export default function GameOverviewPage() {
  const params = useParams<{ id: string }>();
  const gameId = params.id;

  const snapshot = useAppStore();
  const game = snapshot.games.find((entry) => entry.id === gameId);
  const event = snapshot.events.find((entry) => entry.id === game?.eventId);
  const progress = snapshot.gameProgress[gameId];
  const lineup = getLineupForGame(snapshot, gameId);

  const gamePlays = useMemo(
    () =>
      snapshot.plays
        .filter((play) => play.gameId === gameId && !play.voided)
        .sort((a, b) => a.sequence - b.sequence),
    [gameId, snapshot.plays],
  );

  const rows = useMemo(
    () =>
      lineup.map((entry) => {
        const player = snapshot.players.find(
          (item) => item.id === entry.playerId,
        );
        const playerPlays = gamePlays.filter(
          (play) => play.batterId === entry.playerId,
        );
        const ab = playerPlays.filter((play) =>
          ['1B', '2B', '3B', 'HR', 'K', 'OUT', 'E', 'FC'].includes(play.result),
        ).length;
        const h = playerPlays.filter((play) =>
          ['1B', '2B', '3B', 'HR'].includes(play.result),
        ).length;
        const bb = playerPlays.filter((play) => play.result === 'BB').length;
        const rbi = playerPlays.reduce((sum, play) => sum + play.rbi, 0);
        const r = snapshot.runnerEvents.filter((runnerEvent) => {
          if (runnerEvent.playerId !== entry.playerId || !runnerEvent.runScored)
            return false;
          const linkedPlay = snapshot.plays.find(
            (play) => play.id === runnerEvent.playId,
          );
          return linkedPlay?.gameId === gameId && !linkedPlay.voided;
        }).length;

        return {
          id: entry.id,
          name: player?.name ?? 'Onbekende speler',
          position: entry.startingPosition,
          ab,
          h,
          bb,
          rbi,
          r,
        };
      }),
    [
      gameId,
      gamePlays,
      lineup,
      snapshot.players,
      snapshot.plays,
      snapshot.runnerEvents,
    ],
  );

  const inningRuns = useMemo(() => {
    const runsByInning = new Map<number, number>();
    for (const play of gamePlays) {
      if (!play.runsScored) continue;
      const existing = runsByInning.get(play.inning) ?? 0;
      runsByInning.set(play.inning, existing + play.runsScored);
    }

    return Array.from(runsByInning.entries()).sort((a, b) => a[0] - b[0]);
  }, [gamePlays]);

  const opponentInningRuns = useMemo(() => {
    const runsByInning = new Map<number, number>();

    for (const play of gamePlays) {
      if (play.result !== 'OPP_RUNS') continue;

      const fromField = play.opponentRuns ?? 0;
      const fromNotes = Number(play.notes?.match(/(\d+)/)?.[1] ?? 0);
      const runs = fromField || fromNotes || 0;
      if (!runs) continue;

      const existing = runsByInning.get(play.inning) ?? 0;
      runsByInning.set(play.inning, existing + runs);
    }

    return Array.from(runsByInning.entries()).sort((a, b) => a[0] - b[0]);
  }, [gamePlays]);

  const scorecard = useMemo(() => {
    const innings = Array.from({ length: 7 }).map((_, index) => {
      return inningRuns.find(([inning]) => inning === index + 1)?.[1] ?? 0;
    });

    const opponentInnings = Array.from({ length: 7 }).map((_, index) => {
      return (
        opponentInningRuns.find(([inning]) => inning === index + 1)?.[1] ?? 0
      );
    });

    const hits = gamePlays.filter((play) =>
      ['1B', '2B', '3B', 'HR'].includes(play.result),
    ).length;
    const opponentHits = gamePlays.filter(
      (play) => play.result === 'OPP_HIT',
    ).length;
    const ownErrors = gamePlays.filter(
      (play) => play.result === 'OPP_ERROR',
    ).length;
    const opponentErrors = gamePlays.filter(
      (play) => play.result === 'E',
    ).length;

    return {
      innings,
      opponentInnings,
      runs: progress?.scoreFor ?? game?.finalScoreFor ?? 0,
      opponentRuns: progress?.scoreAgainst ?? game?.finalScoreAgainst ?? 0,
      hits,
      opponentHits,
      errors: ownErrors,
      opponentErrors,
    };
  }, [
    game?.finalScoreAgainst,
    game?.finalScoreFor,
    gamePlays,
    inningRuns,
    opponentInningRuns,
    progress?.scoreAgainst,
    progress?.scoreFor,
  ]);

  if (!game || !event) {
    return (
      <AppShell title='Wedstrijd overzicht'>
        <p>Wedstrijd niet gevonden.</p>
      </AppShell>
    );
  }

  return (
    <AppShell title='Wedstrijd overzicht'>
      <GameTabs gameId={gameId} current='overzicht' />

      <section className='rounded-2xl border border-black/10 bg-card p-4'>
        <h2 className='text-2xl font-bold'>
          {event.opponent ? `vs ${event.opponent}` : 'Wedstrijd'}
        </h2>
        <p className='mt-1 text-sm font-semibold text-black/70'>
          {game.homeAway === 'thuis' ? 'Thuiswedstrijd' : 'Uitwedstrijd'}
        </p>
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
            <p className='text-xs uppercase text-black/60'>Inning</p>
            <p className='text-lg font-semibold'>{progress?.inning ?? 1}</p>
          </div>
          <div className='rounded-xl bg-white p-3'>
            <p className='text-xs uppercase text-black/60'>Score</p>
            <p className='text-lg font-semibold'>
              {progress?.scoreFor ?? game.finalScoreFor ?? 0} -{' '}
              {progress?.scoreAgainst ?? game.finalScoreAgainst ?? 0}
            </p>
          </div>
        </div>
      </section>

      <section className='mt-4 rounded-2xl border border-black/10 bg-card p-4'>
        <h3 className='text-lg font-bold'>Runs per inning</h3>
        <div className='mt-3 flex flex-wrap gap-2'>
          {inningRuns.length ? (
            inningRuns.map(([inning, runs]) => (
              <div
                key={inning}
                className='rounded-lg bg-white px-3 py-2 text-sm'
              >
                Inning {inning}: <span className='font-semibold'>{runs}</span>
              </div>
            ))
          ) : (
            <p className='text-sm text-black/70'>Nog geen gescoorde runs.</p>
          )}
        </div>
      </section>

      <section className='mt-4 overflow-x-auto rounded-2xl border border-black/10 bg-card p-4'>
        <h3 className='text-lg font-bold'>Scorecard</h3>
        <table className='mt-3 w-full min-w-[560px] text-sm'>
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
              {scorecard.innings.map((value, index) => (
                <td key={index} className='px-2'>
                  {value}
                </td>
              ))}
              <td className='px-2 font-semibold'>{scorecard.runs}</td>
              <td className='px-2 font-semibold'>{scorecard.hits}</td>
              <td className='px-2 font-semibold'>{scorecard.errors}</td>
            </tr>
            <tr className='border-t border-black/10'>
              <td className='py-1 pr-2 font-semibold'>Tegenstander</td>
              {scorecard.opponentInnings.map((value, index) => (
                <td key={index} className='px-2'>
                  {value}
                </td>
              ))}
              <td className='px-2 font-semibold'>{scorecard.opponentRuns}</td>
              <td className='px-2 font-semibold'>{scorecard.opponentHits}</td>
              <td className='px-2 font-semibold'>{scorecard.opponentErrors}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className='mt-4 overflow-x-auto rounded-2xl border border-black/10 bg-card p-4'>
        <h3 className='mb-3 text-lg font-bold'>Statistieken per wedstrijd</h3>
        <table className='w-full min-w-[640px] text-sm'>
          <thead>
            <tr className='text-left'>
              <th className='py-2'>Speler</th>
              <th>Pos</th>
              <th>AB</th>
              <th>H</th>
              <th>R</th>
              <th>RBI</th>
              <th>BB</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className='border-t border-black/10'>
                <td className='py-2 font-medium'>{row.name}</td>
                <td>{row.position}</td>
                <td>{row.ab}</td>
                <td>{row.h}</td>
                <td>{row.r}</td>
                <td>{row.rbi}</td>
                <td>{row.bb}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </AppShell>
  );
}
