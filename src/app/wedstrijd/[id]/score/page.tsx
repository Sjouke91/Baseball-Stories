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

type DefensivePosition =
  | 'P'
  | 'C'
  | '1B'
  | '2B'
  | '3B'
  | 'SS'
  | 'LF'
  | 'CF'
  | 'RF';

type OutPlayType =
  | 'ground_out'
  | 'fly_out'
  | 'line_out'
  | 'pop_out'
  | 'force_out'
  | 'tag_out'
  | 'double_play';

type FieldingFlow = 'none' | 'out' | 'error' | 'fc';

interface FieldingSelection {
  type: FieldingFlow;
  outType: OutPlayType;
  fielders: string[];
  fcRunnerOutBase: Base | null;
}

interface DefensiveSpot {
  x: number;
  y: number;
}

interface FieldingMeta {
  kind: 'out' | 'error' | 'fc';
  outType?: OutPlayType;
  sequence: string[];
  runnerOutBase?: Base | null;
  outsOnPlay: number;
}

const compactScoringButtons: Array<{
  result: PlayResult;
  label: string;
  group: 'pitch' | 'plate';
  hint?: string;
}> = [
  { result: 'STRIKE', label: 'Strike', group: 'pitch' },
  { result: 'BALL', label: 'Ball', group: 'pitch' },
  { result: 'K', label: 'Strikeout', group: 'pitch' },
  { result: 'BB', label: 'Walk (BB)', group: 'pitch' },
  { result: 'HBP', label: 'HBP', group: 'pitch', hint: 'Hit by pitch' },
  { result: '1B', label: 'Single', group: 'plate' },
  { result: '2B', label: 'Double', group: 'plate' },
  { result: '3B', label: 'Triple', group: 'plate' },
  { result: 'HR', label: 'Home run', group: 'plate' },
  { result: 'OUT', label: 'Out', group: 'plate' },
  { result: 'E', label: 'Reached on Error', group: 'plate' },
  { result: 'FC', label: "Fielder's choice", group: 'plate' },
];

const defensivePositions: DefensivePosition[] = [
  'P',
  'C',
  '1B',
  '2B',
  '3B',
  'SS',
  'LF',
  'CF',
  'RF',
];

const positionNumber: Record<DefensivePosition, string> = {
  P: '1',
  C: '2',
  '1B': '3',
  '2B': '4',
  '3B': '5',
  SS: '6',
  LF: '7',
  CF: '8',
  RF: '9',
};

const fieldLayout: Record<DefensivePosition, DefensiveSpot> = {
  P: { x: 50, y: 56 },
  C: { x: 50, y: 79 },
  '1B': { x: 74, y: 54 },
  '2B': { x: 58, y: 39 },
  '3B': { x: 26, y: 54 },
  SS: { x: 42, y: 41 },
  LF: { x: 20, y: 22 },
  CF: { x: 50, y: 14 },
  RF: { x: 80, y: 22 },
};

const outPlayLabels: Array<{ value: OutPlayType; label: string }> = [
  { value: 'ground_out', label: 'Ground out' },
  { value: 'fly_out', label: 'Fly out' },
  { value: 'line_out', label: 'Line out' },
  { value: 'pop_out', label: 'Pop out' },
  { value: 'force_out', label: 'Force out' },
  { value: 'tag_out', label: 'Tag out' },
  { value: 'double_play', label: 'Double play' },
];

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

const defaultFieldingSelection = (): FieldingSelection => ({
  type: 'none',
  outType: 'ground_out',
  fielders: [],
  fcRunnerOutBase: null,
});

const getRequiredFielders = (flow: FieldingSelection): number => {
  if (flow.type === 'error') return 1;
  if (flow.type === 'fc') return 2;
  if (flow.type === 'out') {
    if (flow.outType === 'double_play') return 3;
    if (
      flow.outType === 'fly_out' ||
      flow.outType === 'line_out' ||
      flow.outType === 'pop_out'
    ) {
      return 1;
    }
    return 2;
  }
  return 0;
};

const toFieldingMeta = (value?: string): FieldingMeta | undefined => {
  if (!value) return undefined;
  try {
    return JSON.parse(value) as FieldingMeta;
  } catch {
    return undefined;
  }
};

const outTypeLabel = (type: OutPlayType): string => {
  return outPlayLabels.find((entry) => entry.value === type)?.label ?? 'Out';
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
  const [fieldingSelection, setFieldingSelection] = useState<FieldingSelection>(
    defaultFieldingSelection,
  );
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

  const defensiveLineup = useMemo(() => {
    const byPosition: Partial<
      Record<DefensivePosition, (typeof players)[number]>
    > = {};

    for (const entry of lineup) {
      const pos = entry.startingPosition as DefensivePosition;
      if (!defensivePositions.includes(pos)) continue;
      const player = players.find(
        (candidate) => candidate.id === entry.playerId,
      );
      if (!player) continue;
      byPosition[pos] = player;
    }

    return byPosition;
  }, [lineup, players]);

  const activePlays = useMemo(
    () => plays.filter((play) => play.gameId === gameId && !play.voided),
    [gameId, plays],
  );

  const lastPlay = activePlays[activePlays.length - 1];

  const gameFieldingStats = useMemo(() => {
    const stats: Record<
      string,
      { po: number; a: number; e: number; dp: number; tc: number }
    > = {};

    for (const play of activePlays) {
      const meta = toFieldingMeta(play.fieldingPlay);
      if (!meta) continue;

      if (meta.kind === 'error') {
        const errorFielder = meta.sequence[0];
        if (!errorFielder) continue;
        stats[errorFielder] = stats[errorFielder] ?? {
          po: 0,
          a: 0,
          e: 0,
          dp: 0,
          tc: 0,
        };
        stats[errorFielder].e += 1;
        continue;
      }

      if (meta.sequence.length === 0) continue;

      if (meta.kind === 'out') {
        const putoutFielder = meta.sequence[meta.sequence.length - 1];
        stats[putoutFielder] = stats[putoutFielder] ?? {
          po: 0,
          a: 0,
          e: 0,
          dp: 0,
          tc: 0,
        };
        stats[putoutFielder].po += 1;

        for (const fielderId of meta.sequence.slice(0, -1)) {
          stats[fielderId] = stats[fielderId] ?? {
            po: 0,
            a: 0,
            e: 0,
            dp: 0,
            tc: 0,
          };
          stats[fielderId].a += 1;
        }

        if (meta.outType === 'double_play') {
          for (const fielderId of meta.sequence) {
            stats[fielderId] = stats[fielderId] ?? {
              po: 0,
              a: 0,
              e: 0,
              dp: 0,
              tc: 0,
            };
            stats[fielderId].dp += 1;
          }
        }
      }

      if (meta.kind === 'fc') {
        const putoutFielder = meta.sequence[meta.sequence.length - 1];
        const assistFielder = meta.sequence[0];

        if (meta.runnerOutBase) {
          stats[putoutFielder] = stats[putoutFielder] ?? {
            po: 0,
            a: 0,
            e: 0,
            dp: 0,
            tc: 0,
          };
          stats[putoutFielder].po += 1;

          if (assistFielder && assistFielder !== putoutFielder) {
            stats[assistFielder] = stats[assistFielder] ?? {
              po: 0,
              a: 0,
              e: 0,
              dp: 0,
              tc: 0,
            };
            stats[assistFielder].a += 1;
          }
        }
      }
    }

    for (const entry of Object.values(stats)) {
      entry.tc = entry.po + entry.a + entry.e;
    }

    return stats;
  }, [activePlays]);

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
    fieldingPlay?: string,
  ) => {
    if (isFinished) return;
    recordPlay({
      gameId,
      result,
      outsOnPlay,
      notes: inputNotes,
      fieldingPlay,
      pitcherId: pitcherId || undefined,
    });
  };

  const beginFieldingFlow = (type: FieldingFlow) => {
    if (isFinished) return;
    if (type === 'none') {
      setFieldingSelection(defaultFieldingSelection());
      return;
    }
    setFieldingSelection({
      ...defaultFieldingSelection(),
      type,
      fcRunnerOutBase: gameProgress?.bases.first
        ? 1
        : gameProgress?.bases.second
          ? 2
          : gameProgress?.bases.third
            ? 3
            : null,
    });
  };

  const handleCompactAction = (result: PlayResult) => {
    if (result === 'OUT') {
      if (mode !== 'fielding') {
        pushPlay('OUT', 'Out');
        return;
      }
      beginFieldingFlow('out');
      return;
    }
    if (result === 'E') {
      if (mode !== 'fielding') {
        pushPlay('E', 'Reached on Error');
        return;
      }
      beginFieldingFlow('error');
      return;
    }
    if (result === 'FC') {
      if (mode !== 'fielding') {
        pushPlay('FC', "Fielder's choice");
        return;
      }
      beginFieldingFlow('fc');
      return;
    }

    setFieldingSelection(defaultFieldingSelection());
    const descriptor = compactScoringButtons.find(
      (button) => button.result === result,
    );
    pushPlay(result, descriptor?.label);
  };

  const handleFielderTap = (fielderId: string) => {
    if (isFinished || fieldingSelection.type === 'none') return;

    setFieldingSelection((previous) => {
      const isSelected = previous.fielders.includes(fielderId);
      if (isSelected) {
        return {
          ...previous,
          fielders: previous.fielders.filter((id) => id !== fielderId),
        };
      }

      const required = getRequiredFielders(previous);
      if (previous.fielders.length >= required) {
        return {
          ...previous,
          fielders: [...previous.fielders.slice(1), fielderId],
        };
      }

      return {
        ...previous,
        fielders: [...previous.fielders, fielderId],
      };
    });
  };

  const confirmFieldingSelection = () => {
    if (fieldingSelection.type === 'none') return;

    const requiredFielders = getRequiredFielders(fieldingSelection);
    if (fieldingSelection.fielders.length < requiredFielders) {
      window.alert('Selecteer eerst de betrokken veldspelers op het veld.');
      return;
    }

    const selectedPositions = fieldingSelection.fielders.map((fielderId) => {
      const item = Object.entries(defensiveLineup).find(
        ([, player]) => player?.id === fielderId,
      );
      return (item?.[0] as DefensivePosition | undefined) ?? 'P';
    });

    const sequenceText = selectedPositions
      .map((position) => positionNumber[position])
      .join('-');

    if (fieldingSelection.type === 'out') {
      const outsOnPlay = fieldingSelection.outType === 'double_play' ? 2 : 1;
      const label = outTypeLabel(fieldingSelection.outType);
      const message = `Record as ${label.toLowerCase()} ${sequenceText}?`;
      if (!window.confirm(message)) return;

      const metadata: FieldingMeta = {
        kind: 'out',
        outType: fieldingSelection.outType,
        sequence: fieldingSelection.fielders,
        outsOnPlay,
      };

      pushPlay(
        'OUT',
        `${label} ${sequenceText}`,
        outsOnPlay,
        JSON.stringify(metadata),
      );
      setFieldingSelection(defaultFieldingSelection());
      return;
    }

    if (fieldingSelection.type === 'error') {
      const message = `Record error on ${selectedPositions[0]}?`;
      if (!window.confirm(message)) return;

      const metadata: FieldingMeta = {
        kind: 'error',
        sequence: [fieldingSelection.fielders[0]],
        outsOnPlay: 0,
      };

      pushPlay(
        'E',
        `Error on ${selectedPositions[0]}`,
        0,
        JSON.stringify(metadata),
      );
      setFieldingSelection(defaultFieldingSelection());
      return;
    }

    if (fieldingSelection.type === 'fc') {
      const outBase = fieldingSelection.fcRunnerOutBase;

      const message = outBase
        ? `Record fielder's choice ${sequenceText}, runner out at ${outBase}B?`
        : `Record fielder's choice ${sequenceText} without runner out?`;

      if (!window.confirm(message)) return;

      if (outBase && runnerByBase[outBase]) {
        moveRunner({ gameId, fromBase: outBase, toBase: 0 });
      }

      const metadata: FieldingMeta = {
        kind: 'fc',
        sequence: fieldingSelection.fielders,
        runnerOutBase: outBase,
        outsOnPlay: outBase ? 1 : 0,
      };

      pushPlay(
        'FC',
        outBase
          ? `Fielder's choice ${sequenceText}, runner out ${outBase}B`
          : `Fielder's choice ${sequenceText}`,
        0,
        JSON.stringify(metadata),
      );
      setFieldingSelection(defaultFieldingSelection());
    }
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
    setFieldingSelection(defaultFieldingSelection());
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
    setFieldingSelection(defaultFieldingSelection());
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

          <div className='rounded-xl border border-emerald-200 bg-emerald-50/70 p-3'>
            <h3 className='text-sm font-semibold uppercase text-emerald-900'>
              Interactive field
            </h3>
            <div className='relative mt-3 h-107.5 w-full overflow-hidden rounded-xl border border-emerald-200 bg-linear-to-b from-emerald-200 via-emerald-300 to-emerald-500'>
              <div className='absolute left-1/2 top-[18%] h-[48%] w-[48%] -translate-x-1/2 rotate-45 border-4 border-white/70' />
              <div className='absolute left-1/2 top-[53%] h-8 w-8 -translate-x-1/2 rotate-45 rounded-sm border-2 border-amber-100 bg-amber-100/80' />
              <div className='absolute left-1/2 top-[62%] h-5 w-5 -translate-x-1/2 rounded-full border border-red-200 bg-red-100/90' />

              {([1, 2, 3] as Base[]).map((base) => {
                const hasRunner = Boolean(runnerByBase[base]);
                const basePosition =
                  base === 1
                    ? 'right-[21%] top-[43%]'
                    : base === 2
                      ? 'left-1/2 top-[21%] -translate-x-1/2'
                      : 'left-[21%] top-[43%]';

                return (
                  <button
                    key={base}
                    aria-label={`${base}B ${hasRunner ? `bezet door ${runnerNameAtBase(base)}` : 'leeg'}`}
                    className={`absolute ${basePosition} h-16 w-16 rotate-45 rounded-md border-2 shadow ${
                      hasRunner
                        ? 'border-orange-300 bg-orange-100'
                        : 'border-slate-200 bg-white/85'
                    } ${selectedBase === base ? 'ring-2 ring-blue-500' : ''}`}
                    onClick={() => handleDiamondBaseTap(base)}
                    type='button'
                  >
                    <span className='absolute inset-0 grid place-items-center -rotate-45 text-[11px] font-bold text-black/80'>
                      {base}B
                    </span>
                    {hasRunner ? (
                      <span className='absolute -bottom-9 left-1/2 w-24 -translate-x-1/2 rounded-full border border-orange-200 bg-white px-2 py-1 text-[10px] font-semibold text-black/90'>
                        {runnerNameAtBase(base)}
                      </span>
                    ) : null}
                  </button>
                );
              })}

              <div className='absolute bottom-[7%] left-1/2 h-10 w-10 -translate-x-1/2 rotate-45 rounded border-2 border-slate-200 bg-white/90'>
                <span className='absolute inset-0 grid place-items-center -rotate-45 text-[10px] font-bold'>
                  Home
                </span>
              </div>

              {defensivePositions.map((position) => {
                const player = defensiveLineup[position];
                const spot = fieldLayout[position];
                const isSelected = fieldingSelection.fielders.includes(
                  player?.id ?? '',
                );

                return (
                  <button
                    key={position}
                    className={`absolute w-27 -translate-x-1/2 -translate-y-1/2 rounded-lg border px-2 py-1 text-left shadow-sm ${
                      isSelected
                        ? 'border-blue-600 bg-blue-100'
                        : 'border-black/10 bg-white/90'
                    }`}
                    disabled={!player || mode !== 'fielding'}
                    onClick={() => {
                      if (!player) return;
                      handleFielderTap(player.id);
                    }}
                    style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
                    type='button'
                  >
                    <p className='truncate text-xs font-bold'>{position}</p>
                    <p className='truncate text-[11px] text-black/80'>
                      {player?.name ?? 'Open positie'}
                    </p>
                  </button>
                );
              })}
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
              Tap een loper om te selecteren. Tap daarna een base om te
              verplaatsen, of gebruik de runner acties.
            </p>
          </div>

          <div className='space-y-3 rounded-xl border border-blue-200 bg-blue-50/70 p-3'>
            <h3 className='text-sm font-semibold uppercase text-blue-900'>
              Pitch / count actions
            </h3>
            <div className='grid grid-cols-2 gap-2 sm:grid-cols-3'>
              {compactScoringButtons
                .filter((button) => button.group === 'pitch')
                .map((button) => (
                  <button
                    key={button.label}
                    className='rounded-lg bg-blue-700 px-3 py-4 text-left text-white'
                    onClick={() => handleCompactAction(button.result)}
                    type='button'
                  >
                    <p className='text-base font-bold'>{button.label}</p>
                    {button.hint ? (
                      <p className='text-xs text-blue-100'>{button.hint}</p>
                    ) : null}
                  </button>
                ))}
            </div>

            <h3 className='text-sm font-semibold uppercase text-blue-900'>
              Plate appearance outcomes
            </h3>
            <div className='grid grid-cols-2 gap-2 sm:grid-cols-3'>
              {compactScoringButtons
                .filter((button) => button.group === 'plate')
                .map((button) => (
                  <button
                    key={button.label}
                    className='rounded-lg border border-blue-300 bg-white px-3 py-4 text-left'
                    onClick={() => handleCompactAction(button.result)}
                    type='button'
                  >
                    <p className='text-base font-bold'>{button.label}</p>
                    {button.hint ? (
                      <p className='text-xs text-black/60'>{button.hint}</p>
                    ) : null}
                  </button>
                ))}
            </div>

            {fieldingSelection.type !== 'none' ? (
              <div className='space-y-2 rounded-lg border border-blue-300 bg-white p-3'>
                <p className='text-xs font-semibold uppercase text-blue-900'>
                  Fielding attribution
                </p>

                {fieldingSelection.type === 'out' ? (
                  <div className='grid grid-cols-2 gap-2 sm:grid-cols-4'>
                    {outPlayLabels.map((option) => (
                      <button
                        key={option.value}
                        className={`rounded-lg border px-2 py-2 text-xs font-semibold ${
                          fieldingSelection.outType === option.value
                            ? 'border-blue-600 bg-blue-600 text-white'
                            : 'border-blue-200 bg-white'
                        }`}
                        onClick={() =>
                          setFieldingSelection((previous) => ({
                            ...previous,
                            outType: option.value,
                            fielders: [],
                          }))
                        }
                        type='button'
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                ) : null}

                {fieldingSelection.type === 'fc' ? (
                  <div className='grid grid-cols-2 gap-2 text-xs sm:grid-cols-4'>
                    <button
                      className={`rounded-lg border px-2 py-2 font-semibold ${
                        fieldingSelection.fcRunnerOutBase === null
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-blue-200 bg-white'
                      }`}
                      onClick={() =>
                        setFieldingSelection((previous) => ({
                          ...previous,
                          fcRunnerOutBase: null,
                        }))
                      }
                      type='button'
                    >
                      No out
                    </button>
                    {([1, 2, 3] as Base[]).map((base) => (
                      <button
                        key={base}
                        className={`rounded-lg border px-2 py-2 font-semibold ${
                          fieldingSelection.fcRunnerOutBase === base
                            ? 'border-blue-600 bg-blue-600 text-white'
                            : 'border-blue-200 bg-white'
                        }`}
                        onClick={() =>
                          setFieldingSelection((previous) => ({
                            ...previous,
                            fcRunnerOutBase: base,
                          }))
                        }
                        type='button'
                      >
                        Out at {base}B
                      </button>
                    ))}
                  </div>
                ) : null}

                <p className='text-xs text-black/70'>
                  Tap verdedigers op het veld (
                  {fieldingSelection.fielders.length}/
                  {getRequiredFielders(fieldingSelection)} geselecteerd).
                </p>

                <div className='flex gap-2'>
                  <button
                    className='rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white'
                    onClick={confirmFieldingSelection}
                    type='button'
                  >
                    Confirm play
                  </button>
                  <button
                    className='rounded-lg border border-black/20 bg-white px-3 py-2 text-sm font-semibold'
                    onClick={() =>
                      setFieldingSelection(defaultFieldingSelection())
                    }
                    type='button'
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}

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

          <div className='rounded-xl bg-white p-3'>
            <h3 className='text-sm font-semibold uppercase text-black/60'>
              Defensive stats (game)
            </h3>
            <div className='mt-2 grid gap-2 text-xs sm:grid-cols-2'>
              {defensivePositions.map((position) => {
                const player = defensiveLineup[position];
                if (!player) return null;

                const stat = gameFieldingStats[player.id] ?? {
                  po: 0,
                  a: 0,
                  e: 0,
                  dp: 0,
                  tc: 0,
                };

                const fld =
                  stat.tc === 0
                    ? '0.000'
                    : ((stat.po + stat.a) / stat.tc).toFixed(3);

                return (
                  <div
                    key={player.id}
                    className='rounded-lg border border-black/10 bg-slate-50 p-2'
                  >
                    <p className='font-semibold'>
                      {player.name} ({position})
                    </p>
                    <p className='text-black/70'>
                      PO {stat.po} | A {stat.a} | E {stat.e} | DP {stat.dp} | TC{' '}
                      {stat.tc} | FLD% {fld}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

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
