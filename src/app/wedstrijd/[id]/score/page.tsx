'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { GameTabs } from '@/components/GameTabs';
import { getLineupForGame } from '@/lib/selectors';
import { useAppStore } from '@/stores/useAppStore';
import type { PlayResult } from '@/types/models';

type ScoringMode = 'fielding' | 'batting';

type Base = 1 | 2 | 3;

const battingButtons: Array<{
  result: PlayResult;
  label: string;
  hint?: string;
}> = [
  { result: '1B', label: '1B', hint: 'Single' },
  { result: '2B', label: '2B', hint: 'Double' },
  { result: '3B', label: '3B', hint: 'Triple' },
  { result: 'HR', label: 'HR', hint: 'Home run' },
  { result: 'BB', label: 'BB', hint: 'Walk' },
  { result: 'HBP', label: 'HBP', hint: 'Hit by pitch' },
  { result: 'K', label: 'K', hint: 'Strikeout' },
  { result: 'OUT', label: 'Out' },
  { result: 'E', label: 'Reached on Error' },
  { result: 'FC', label: 'FC', hint: "Fielder's choice" },
];

const quickNotations = ['5-3', '6-3', '4-3', '6-4-3', 'F8', 'E6'];

const morePlays = [
  { label: 'Wild pitch (WP)', notes: 'WP' },
  { label: 'Passed ball (PB)', notes: 'PB' },
  { label: 'Balk (BK)', notes: 'BK' },
  { label: 'Defensive indifference', notes: 'Defensive indifference' },
  { label: 'Batter interference', notes: 'Batter interference' },
  { label: 'Runner interference', notes: 'Runner interference' },
  { label: 'Sacrifice bunt', notes: 'Sacrifice bunt' },
  { label: 'Sacrifice fly', notes: 'Sacrifice fly' },
  { label: 'Triple play', notes: 'Triple play' },
];

const parsePlayResult = (value: string): PlayResult | undefined => {
  const normalized = value.trim().toUpperCase();
  const map: Record<string, PlayResult> = {
    STRIKE: 'STRIKE',
    BALL: 'BALL',
    INPLAY: 'IN_PLAY',
    IN_PLAY: 'IN_PLAY',
    '1B': '1B',
    '2B': '2B',
    '3B': '3B',
    HR: 'HR',
    BB: 'BB',
    HBP: 'HBP',
    K: 'K',
    OUT: 'OUT',
    E: 'E',
    FC: 'FC',
    SAC: 'SAC',
  };
  return map[normalized];
};

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
  const placeRunnerOnBase = useAppStore((state) => state.placeRunnerOnBase);
  const recordPickoff = useAppStore((state) => state.recordPickoff);
  const nextBatter = useAppStore((state) => state.nextBatter);
  const advanceInning = useAppStore((state) => state.advanceInning);
  const finishGame = useAppStore((state) => state.finishGame);
  const undoLastPlay = useAppStore((state) => state.undoLastPlay);

  const game = games.find((entry) => entry.id === gameId);
  const event = events.find((entry) => entry.id === game?.eventId);
  const lineup = getLineupForGame({ lineups }, gameId);
  const isFinished = game?.status === 'klaar';

  const [pitcherId, setPitcherId] = useState('');
  const [mode, setMode] = useState<ScoringMode>('fielding');
  const [selectedBase, setSelectedBase] = useState<Base | null>(null);
  const [notation, setNotation] = useState('');
  const [showMore, setShowMore] = useState(false);

  const currentHalf =
    gameProgress?.half ?? (game?.homeAway === 'thuis' ? 'top' : 'bottom');
  const isBattingHalf =
    game?.homeAway === 'thuis'
      ? currentHalf === 'bottom'
      : currentHalf === 'top';

  const currentBatter = useMemo(() => {
    if (!lineup.length || !gameProgress) return undefined;
    const idx = gameProgress.battingIndex % lineup.length;
    const current = lineup[idx];
    return players.find((player) => player.id === current.playerId);
  }, [gameProgress, lineup, players]);

  const onDeckBatter = useMemo(() => {
    if (!lineup.length || !gameProgress) return undefined;
    const idx = (gameProgress.battingIndex + 1) % lineup.length;
    const current = lineup[idx];
    return players.find((player) => player.id === current.playerId);
  }, [gameProgress, lineup, players]);

  const currentPitcher = useMemo(() => {
    if (!gameProgress?.lastPitcherId && !pitcherId) return undefined;
    const id = pitcherId || gameProgress?.lastPitcherId;
    return players.find((player) => player.id === id);
  }, [gameProgress?.lastPitcherId, pitcherId, players]);

  const activePlays = useMemo(
    () => plays.filter((play) => play.gameId === gameId && !play.voided),
    [gameId, plays],
  );

  const lastPlay = activePlays[activePlays.length - 1];

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

    const hits = activePlays.filter((play) =>
      ['1B', '2B', '3B', 'HR'].includes(play.result),
    ).length;
    const opponentHits = activePlays.filter(
      (play) => play.result === 'OPP_HIT',
    ).length;
    const ownErrors = activePlays.filter(
      (play) => play.result === 'OPP_ERROR',
    ).length;
    const opponentErrors = activePlays.filter(
      (play) => play.result === 'E',
    ).length;

    return {
      innings: ownValues,
      opponentInnings: opponentValues,
      runs: gameProgress?.scoreFor ?? 0,
      opponentRuns: gameProgress?.scoreAgainst ?? 0,
      hits,
      opponentHits,
      errors: ownErrors,
      opponentErrors,
    };
  }, [
    activePlays,
    gameProgress?.scoreAgainst,
    gameProgress?.scoreFor,
    inningRuns,
    opponentInningRuns,
  ]);

  const runnerByBase: Record<Base, string | undefined> = {
    1: gameProgress?.bases.first,
    2: gameProgress?.bases.second,
    3: gameProgress?.bases.third,
  };

  const runnerNameAtBase = (base: Base) => {
    const id = runnerByBase[base];
    if (!id) return 'Leeg';
    return players.find((player) => player.id === id)?.name ?? 'Onbekend';
  };

  const selectedRunnerName = selectedBase
    ? runnerNameAtBase(selectedBase)
    : undefined;

  const pushPlay = (
    result: PlayResult,
    inputNotes?: string,
    outsOnPlay?: number,
  ) => {
    if (isFinished) return;
    recordPlay({
      gameId,
      result,
      outsOnPlay,
      notes: inputNotes,
      pitcherId: pitcherId || undefined,
    });
  };

  const handleRunnerAction = (
    type: 'SB' | 'CS' | 'pickoff' | 'advance1' | 'advance2' | 'score',
  ) => {
    if (!selectedBase || !runnerByBase[selectedBase] || isFinished) return;

    if (type === 'SB') {
      recordRunnerAction({ gameId, base: selectedBase, type: 'SB' });
      setSelectedBase(null);
      return;
    }
    if (type === 'CS') {
      recordRunnerAction({ gameId, base: selectedBase, type: 'CS' });
      setSelectedBase(null);
      return;
    }
    if (type === 'pickoff') {
      recordPickoff({ gameId, base: selectedBase });
      setSelectedBase(null);
      return;
    }
    if (type === 'score') {
      moveRunner({ gameId, fromBase: selectedBase, toBase: 4 });
      setSelectedBase(null);
      return;
    }

    const target = type === 'advance1' ? selectedBase + 1 : selectedBase + 2;
    if (target >= 4) {
      moveRunner({ gameId, fromBase: selectedBase, toBase: 4 });
      setSelectedBase(null);
      return;
    }
    moveRunner({ gameId, fromBase: selectedBase, toBase: target as 1 | 2 | 3 });
    setSelectedBase(target as Base);
  };

  const handleDiamondBaseTap = (base: Base) => {
    if (isFinished) return;
    const hasRunner = Boolean(runnerByBase[base]);

    if (selectedBase && runnerByBase[selectedBase]) {
      if (selectedBase === base) {
        setSelectedBase(null);
        return;
      }

      if (!hasRunner) {
        moveRunner({ gameId, fromBase: selectedBase, toBase: base });
        setSelectedBase(base);
      }
      return;
    }

    if (hasRunner) {
      setSelectedBase(base);
      return;
    }

    placeRunnerOnBase({ gameId, base });
    setSelectedBase(base);
  };

  const editLastPlay = () => {
    if (!lastPlay || isFinished) return;

    const input = window.prompt(
      'Vervang laatste play met: STRIKE, BALL, 1B, 2B, 3B, HR, BB, HBP, K, OUT, E, FC, SAC',
      lastPlay.result,
    );
    if (!input) return;

    const parsed = parsePlayResult(input);
    if (!parsed) {
      window.alert('Onbekende actie. Geen wijziging opgeslagen.');
      return;
    }

    undoLastPlay(gameId);
    pushPlay(
      parsed,
      `Bewerking laatste play (${lastPlay.result} -> ${parsed})`,
    );
  };

  const endHalfOrInning = () => {
    if (isFinished) return;
    if (
      (gameProgress?.outs ?? 0) > 0 ||
      gameProgress?.bases.first ||
      gameProgress?.bases.second ||
      gameProgress?.bases.third
    ) {
      const confirmed = window.confirm(
        'Er zijn nog outs/lopers actief. Toch de helft/inning afsluiten?',
      );
      if (!confirmed) return;
    }
    advanceInning(gameId);
    setSelectedBase(null);
  };

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
          className='rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white'
          disabled={isFinished}
          onClick={() => {
            const confirmed = window.confirm(
              'Weet je zeker dat je deze wedstrijd wilt beeindigen?',
            );
            if (!confirmed) return;
            finishGame(gameId);
          }}
          type='button'
        >
          {isFinished ? 'Wedstrijd afgesloten' : 'Wedstrijd beeindigen'}
        </button>
      </div>

      <section className='grid gap-4 lg:grid-cols-[1fr_340px]'>
        <article className='space-y-4 rounded-2xl border border-black/10 bg-card p-4 pb-28'>
          <div className='grid gap-2 sm:grid-cols-4'>
            <div className='rounded-lg bg-white p-3'>
              <p className='text-xs uppercase text-black/60'>Inning</p>
              <p className='text-xl font-bold'>
                {gameProgress?.inning ?? 1} ({currentHalf})
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
              <p className='text-xs uppercase text-black/60'>Count</p>
              <p className='text-xl font-bold'>
                {gameProgress?.balls ?? 0}-{gameProgress?.strikes ?? 0}
              </p>
            </div>
          </div>

          <div className='grid gap-2 rounded-xl bg-white p-3 sm:grid-cols-3'>
            <div>
              <p className='text-xs uppercase text-black/60'>Huidige slagman</p>
              <p className='text-lg font-bold'>{currentBatter?.name ?? '-'}</p>
            </div>
            <div>
              <p className='text-xs uppercase text-black/60'>On-deck</p>
              <p className='text-lg font-bold'>{onDeckBatter?.name ?? '-'}</p>
            </div>
            <div>
              <p className='text-xs uppercase text-black/60'>Pitcher</p>
              <p className='text-lg font-bold'>{currentPitcher?.name ?? '-'}</p>
            </div>
          </div>

          <div className='rounded-xl bg-white p-3'>
            <p className='text-xs uppercase text-black/60'>Scoring mode</p>
            <div className='mt-2 grid grid-cols-2 gap-2'>
              <button
                className={`rounded-lg px-3 py-3 text-sm font-semibold ${
                  mode === 'fielding'
                    ? 'bg-green-600 text-white'
                    : 'border border-black/15 bg-white'
                }`}
                onClick={() => setMode('fielding')}
                type='button'
              >
                Fielding & Pitching
              </button>
              <button
                className={`rounded-lg px-3 py-3 text-sm font-semibold ${
                  mode === 'batting'
                    ? 'bg-blue-600 text-white'
                    : 'border border-black/15 bg-white'
                }`}
                onClick={() => setMode('batting')}
                type='button'
              >
                Batting
              </button>
            </div>
          </div>

          <div className='rounded-xl bg-white p-3'>
            <h3 className='text-sm font-semibold uppercase text-black/60'>
              Diamond
            </h3>
            <div className='relative mx-auto mt-3 h-52 w-52'>
              <button
                className={`absolute left-1/2 top-2 h-12 w-12 -translate-x-1/2 rotate-45 rounded-md border-2 ${
                  selectedBase === 2
                    ? 'border-purple-600 bg-purple-100'
                    : 'border-black/15 bg-slate-100'
                }`}
                onClick={() => handleDiamondBaseTap(2)}
                type='button'
              >
                <span className='-rotate-45 text-xs font-bold'>2B</span>
              </button>
              <button
                className={`absolute right-4 top-1/2 h-12 w-12 -translate-y-1/2 rotate-45 rounded-md border-2 ${
                  selectedBase === 1
                    ? 'border-purple-600 bg-purple-100'
                    : 'border-black/15 bg-slate-100'
                }`}
                onClick={() => handleDiamondBaseTap(1)}
                type='button'
              >
                <span className='-rotate-45 text-xs font-bold'>1B</span>
              </button>
              <button
                className={`absolute left-4 top-1/2 h-12 w-12 -translate-y-1/2 rotate-45 rounded-md border-2 ${
                  selectedBase === 3
                    ? 'border-purple-600 bg-purple-100'
                    : 'border-black/15 bg-slate-100'
                }`}
                onClick={() => handleDiamondBaseTap(3)}
                type='button'
              >
                <span className='-rotate-45 text-xs font-bold'>3B</span>
              </button>
              <div className='absolute bottom-2 left-1/2 h-12 w-12 -translate-x-1/2 rotate-45 rounded-md border-2 border-black/15 bg-white'>
                <span className='absolute inset-0 grid place-items-center -rotate-45 text-xs font-bold'>
                  Home
                </span>
              </div>
            </div>
            <div className='mt-3 grid gap-2 text-xs sm:grid-cols-3'>
              <button
                className='rounded-lg border border-black/15 bg-white px-2 py-2 text-left'
                onClick={() => handleDiamondBaseTap(1)}
                type='button'
              >
                <p className='font-semibold'>1B</p>
                <p className='text-black/70'>{runnerNameAtBase(1)}</p>
              </button>
              <button
                className='rounded-lg border border-black/15 bg-white px-2 py-2 text-left'
                onClick={() => handleDiamondBaseTap(2)}
                type='button'
              >
                <p className='font-semibold'>2B</p>
                <p className='text-black/70'>{runnerNameAtBase(2)}</p>
              </button>
              <button
                className='rounded-lg border border-black/15 bg-white px-2 py-2 text-left'
                onClick={() => handleDiamondBaseTap(3)}
                type='button'
              >
                <p className='font-semibold'>3B</p>
                <p className='text-black/70'>{runnerNameAtBase(3)}</p>
              </button>
            </div>
            <p className='mt-2 text-xs text-black/70'>
              Tap lege base om loper te plaatsen. Tap loper om te selecteren en
              daarna een andere base om te verplaatsen.
            </p>
          </div>

          {mode === 'fielding' ? (
            <div className='space-y-3 rounded-xl border border-green-200 bg-green-50/70 p-3'>
              <h3 className='text-sm font-semibold uppercase text-green-900'>
                Pitching
              </h3>
              <div className='grid grid-cols-2 gap-2 sm:grid-cols-3'>
                <button
                  className='rounded-lg bg-green-600 px-3 py-4 font-bold text-white'
                  onClick={() => pushPlay('STRIKE')}
                  type='button'
                >
                  Strike
                </button>
                <button
                  className='rounded-lg bg-green-600 px-3 py-4 font-bold text-white'
                  onClick={() => pushPlay('BALL')}
                  type='button'
                >
                  Ball
                </button>
                <button
                  className='rounded-lg bg-green-700 px-3 py-4 font-bold text-white'
                  onClick={() => pushPlay('K', 'Strikeout')}
                  type='button'
                >
                  Strikeout
                </button>
                <button
                  className='rounded-lg bg-green-700 px-3 py-4 font-bold text-white'
                  onClick={() => pushPlay('BB', 'Walk (BB)')}
                  type='button'
                >
                  Walk (BB)
                </button>
                <button
                  className='rounded-lg bg-green-700 px-3 py-4 font-bold text-white'
                  onClick={() => pushPlay('HBP', 'Hit by pitch')}
                  type='button'
                >
                  HBP
                </button>
                <button
                  className='rounded-lg bg-green-700 px-3 py-4 font-bold text-white'
                  onClick={() => pushPlay('IN_PLAY', 'In play')}
                  type='button'
                >
                  In play
                </button>
              </div>

              <h3 className='text-sm font-semibold uppercase text-green-900'>
                Fielding
              </h3>
              <div className='grid grid-cols-2 gap-2 sm:grid-cols-3'>
                <button
                  className='rounded-lg border border-green-300 bg-white px-3 py-4 font-semibold'
                  onClick={() => pushPlay('OUT', notation || 'Out')}
                  type='button'
                >
                  Out
                </button>
                <button
                  className='rounded-lg border border-green-300 bg-white px-3 py-4 font-semibold'
                  onClick={() => pushPlay('OUT', notation || 'Catch')}
                  type='button'
                >
                  Catch
                </button>
                <button
                  className='rounded-lg border border-green-300 bg-white px-3 py-4 font-semibold'
                  onClick={() => pushPlay('OUT', notation || 'Ground out')}
                  type='button'
                >
                  Ground out
                </button>
                <button
                  className='rounded-lg border border-green-300 bg-white px-3 py-4 font-semibold'
                  onClick={() => pushPlay('OUT', notation || 'Fly out')}
                  type='button'
                >
                  Fly out
                </button>
                <button
                  className='rounded-lg border border-green-300 bg-white px-3 py-4 font-semibold'
                  onClick={() => pushPlay('OUT', notation || 'Line out')}
                  type='button'
                >
                  Line out
                </button>
                <button
                  className='rounded-lg border border-green-300 bg-white px-3 py-4 font-semibold'
                  onClick={() => pushPlay('OUT', notation || 'Pop out')}
                  type='button'
                >
                  Pop out
                </button>
                <button
                  className='rounded-lg border border-green-300 bg-white px-3 py-4 font-semibold'
                  onClick={() => pushPlay('OUT', notation || 'Force out')}
                  type='button'
                >
                  Force out
                </button>
                <button
                  className='rounded-lg border border-green-300 bg-white px-3 py-4 font-semibold'
                  onClick={() => pushPlay('OUT', notation || 'Tag out')}
                  type='button'
                >
                  Tag out
                </button>
                <button
                  className='rounded-lg border border-green-300 bg-white px-3 py-4 font-semibold'
                  onClick={() => pushPlay('OUT', notation || 'Double play', 2)}
                  type='button'
                >
                  Double play
                </button>
                <button
                  className='rounded-lg border border-green-300 bg-white px-3 py-4 font-semibold'
                  onClick={() => pushPlay('E', notation || 'Error')}
                  type='button'
                >
                  Error
                </button>
                <button
                  className='rounded-lg border border-green-300 bg-white px-3 py-4 font-semibold sm:col-span-2'
                  onClick={() => pushPlay('OUT', notation || 'Catch play made')}
                  type='button'
                >
                  Catch play made
                </button>
              </div>

              <div className='rounded-lg bg-white p-2'>
                <p className='text-xs uppercase text-black/60'>
                  Snelle notatie
                </p>
                <div className='mt-2 flex flex-wrap gap-2'>
                  {quickNotations.map((chip) => (
                    <button
                      key={chip}
                      className={`rounded-full border px-3 py-1 text-xs ${
                        notation === chip
                          ? 'border-green-700 bg-green-700 text-white'
                          : 'border-black/20 bg-white'
                      }`}
                      onClick={() => setNotation(chip)}
                      type='button'
                    >
                      {chip}
                    </button>
                  ))}
                  <button
                    className='rounded-full border border-black/20 bg-white px-3 py-1 text-xs'
                    onClick={() => {
                      const custom = window.prompt(
                        'Extra notatie (bijv. 5-4-3):',
                        notation,
                      );
                      if (!custom) return;
                      setNotation(custom);
                    }}
                    type='button'
                  >
                    More...
                  </button>
                </div>
              </div>

              <div className='rounded-lg border border-purple-200 bg-purple-50 p-2'>
                <p className='text-xs uppercase text-purple-900'>Baserunning</p>
                <p className='text-xs text-black/70'>
                  Geselecteerde loper: {selectedRunnerName ?? '-'}
                </p>
                <div className='mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5'>
                  <button
                    className='rounded-lg bg-purple-600 px-3 py-3 text-sm font-semibold text-white'
                    onClick={() => handleRunnerAction('SB')}
                    type='button'
                  >
                    SB
                  </button>
                  <button
                    className='rounded-lg bg-purple-600 px-3 py-3 text-sm font-semibold text-white'
                    onClick={() => handleRunnerAction('CS')}
                    type='button'
                  >
                    CS
                  </button>
                  <button
                    className='rounded-lg bg-purple-700 px-3 py-3 text-sm font-semibold text-white'
                    onClick={() => handleRunnerAction('pickoff')}
                    type='button'
                  >
                    Pickoff
                  </button>
                  <button
                    className='rounded-lg bg-purple-700 px-3 py-3 text-sm font-semibold text-white'
                    onClick={() => handleRunnerAction('advance1')}
                    type='button'
                  >
                    Advance runner
                  </button>
                  <button
                    className='rounded-lg bg-purple-800 px-3 py-3 text-sm font-semibold text-white'
                    onClick={() => handleRunnerAction('score')}
                    type='button'
                  >
                    Score run
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className='space-y-3 rounded-xl border border-blue-200 bg-blue-50/70 p-3'>
              <h3 className='text-sm font-semibold uppercase text-blue-900'>
                Batting
              </h3>
              <div className='grid grid-cols-2 gap-2 sm:grid-cols-3'>
                {battingButtons.map((btn) => (
                  <button
                    key={btn.label}
                    className='rounded-lg bg-blue-600 px-3 py-4 text-left text-white'
                    onClick={() =>
                      pushPlay(
                        btn.result,
                        btn.hint ? `${btn.label} - ${btn.hint}` : btn.label,
                      )
                    }
                    type='button'
                  >
                    <p className='text-base font-bold'>{btn.label}</p>
                    {btn.hint ? (
                      <p className='text-xs text-blue-100'>{btn.hint}</p>
                    ) : null}
                  </button>
                ))}
              </div>

              <div className='rounded-lg border border-purple-200 bg-purple-50 p-2'>
                <p className='text-xs uppercase text-purple-900'>Baserunning</p>
                <p className='text-xs text-black/70'>
                  Geselecteerde loper: {selectedRunnerName ?? '-'}
                </p>
                <div className='mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3'>
                  <button
                    className='rounded-lg bg-purple-600 px-3 py-3 text-sm font-semibold text-white'
                    onClick={() => handleRunnerAction('SB')}
                    type='button'
                  >
                    SB
                  </button>
                  <button
                    className='rounded-lg bg-purple-600 px-3 py-3 text-sm font-semibold text-white'
                    onClick={() => handleRunnerAction('CS')}
                    type='button'
                  >
                    CS
                  </button>
                  <button
                    className='rounded-lg bg-purple-700 px-3 py-3 text-sm font-semibold text-white'
                    onClick={() => handleRunnerAction('pickoff')}
                    type='button'
                  >
                    Pickoff
                  </button>
                  <button
                    className='rounded-lg bg-purple-700 px-3 py-3 text-sm font-semibold text-white'
                    onClick={() => handleRunnerAction('advance1')}
                    type='button'
                  >
                    Advance 1 base
                  </button>
                  <button
                    className='rounded-lg bg-purple-700 px-3 py-3 text-sm font-semibold text-white'
                    onClick={() => handleRunnerAction('advance2')}
                    type='button'
                  >
                    Advance 2 bases
                  </button>
                  <button
                    className='rounded-lg bg-purple-800 px-3 py-3 text-sm font-semibold text-white'
                    onClick={() => handleRunnerAction('score')}
                    type='button'
                  >
                    Score run
                  </button>
                </div>
              </div>

              <div className='rounded-lg bg-white p-2'>
                <p className='text-xs uppercase text-black/60'>Quick actions</p>
                <div className='mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4'>
                  <button
                    className='rounded-lg border border-blue-300 px-3 py-3 text-sm font-semibold'
                    onClick={() => pushPlay('IN_PLAY', 'RBI +1 handmatig', 0)}
                    type='button'
                  >
                    RBI +1
                  </button>
                  <button
                    className='rounded-lg border border-blue-300 px-3 py-3 text-sm font-semibold'
                    onClick={() => pushPlay('SAC', 'Sacrifice')}
                    type='button'
                  >
                    SAC
                  </button>
                  <button
                    className='rounded-lg border border-blue-300 px-3 py-3 text-sm font-semibold'
                    onClick={() => pushPlay('NEXT_BATTER', 'Pinch hitter')}
                    type='button'
                  >
                    Pinch hitter
                  </button>
                  <button
                    className='rounded-lg border border-blue-300 px-3 py-3 text-sm font-semibold'
                    onClick={() => pushPlay('IN_PLAY', 'Substitute runner')}
                    type='button'
                  >
                    Substitute runner
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className='rounded-xl bg-white p-3'>
            <button
              className='rounded-lg border border-black/15 bg-white px-3 py-2 text-sm font-semibold'
              onClick={() => setShowMore((prev) => !prev)}
              type='button'
            >
              More...
            </button>
            {showMore ? (
              <div className='mt-3 grid gap-2 sm:grid-cols-3'>
                {morePlays.map((play) => (
                  <button
                    key={play.label}
                    className='rounded-lg border border-black/15 bg-slate-50 px-3 py-3 text-left text-sm font-semibold'
                    onClick={() => {
                      if (play.notes === 'Triple play') {
                        pushPlay('OUT', play.notes, 3);
                        return;
                      }
                      if (
                        play.notes === 'Sacrifice bunt' ||
                        play.notes === 'Sacrifice fly'
                      ) {
                        pushPlay('SAC', play.notes, 1);
                        return;
                      }
                      pushPlay('IN_PLAY', play.notes);
                    }}
                    type='button'
                  >
                    {play.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className='overflow-x-auto rounded-xl bg-white p-4'>
            <h3 className='text-sm font-semibold uppercase text-black/60'>
              Scorecard
            </h3>
            <table className='mt-2 w-full min-w-140 text-sm'>
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
                  <td className='px-2 font-semibold'>
                    {inningValues.opponentHits}
                  </td>
                  <td className='px-2 font-semibold'>
                    {inningValues.opponentErrors}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>

        <aside className='space-y-4'>
          <article className='rounded-2xl border border-black/10 bg-card p-4'>
            <h3 className='text-lg font-bold'>Pitcher</h3>
            <select
              className='mt-2 w-full rounded-lg border border-black/15 bg-white px-3 py-2'
              disabled={isFinished}
              value={pitcherId}
              onChange={(entry) => setPitcherId(entry.target.value)}
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
            <h3 className='text-lg font-bold'>Laatste plays</h3>
            <div className='mt-2 space-y-2 text-sm'>
              {activePlays
                .slice(-8)
                .reverse()
                .map((play) => (
                  <div key={play.id} className='rounded-lg bg-white p-2'>
                    <p className='font-semibold'>
                      Inning {play.inning} {play.half} · {play.result}
                    </p>
                    {play.notes ? (
                      <p className='text-black/70'>{play.notes}</p>
                    ) : null}
                  </div>
                ))}
              {!activePlays.length ? (
                <p className='text-black/70'>Nog geen plays.</p>
              ) : null}
            </div>
          </article>

          <article className='rounded-2xl border border-black/10 bg-card p-4'>
            <h3 className='text-lg font-bold'>Runs per inning</h3>
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
          </article>
        </aside>
      </section>

      <div className='fixed inset-x-0 bottom-0 z-20 border-t border-black/10 bg-white/95 p-3 backdrop-blur'>
        <div className='mx-auto grid max-w-5xl grid-cols-2 gap-2 sm:grid-cols-4'>
          <button
            className='rounded-lg border border-black/20 bg-white px-3 py-3 text-sm font-semibold'
            disabled={isFinished}
            onClick={() => undoLastPlay(gameId)}
            type='button'
          >
            Undo
          </button>
          <button
            className='rounded-lg border border-black/20 bg-white px-3 py-3 text-sm font-semibold'
            disabled={isFinished || !lastPlay}
            onClick={editLastPlay}
            type='button'
          >
            Edit last play
          </button>
          <button
            className='rounded-lg border border-blue-300 bg-blue-600 px-3 py-3 text-sm font-semibold text-white'
            disabled={isFinished}
            onClick={() => nextBatter(gameId)}
            type='button'
          >
            Next batter
          </button>
          <button
            className='rounded-lg border border-red-300 bg-red-600 px-3 py-3 text-sm font-semibold text-white'
            disabled={isFinished}
            onClick={endHalfOrInning}
            type='button'
          >
            {currentHalf === 'top' ? 'End half inning' : 'End inning'}
          </button>
        </div>
      </div>

      <p className='mt-4 text-xs text-black/60'>
        Modus advies: {isBattingHalf ? 'Batting' : 'Fielding & Pitching'}
      </p>
    </AppShell>
  );
}
