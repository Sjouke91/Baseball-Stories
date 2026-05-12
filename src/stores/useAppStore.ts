'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { uid } from '@/lib/format';
import type {
  AppData,
  Attendance,
  AttendanceStatus,
  EventType,
  Game,
  HalfInning,
  LineupEntry,
  LiveGameProgress,
  Play,
  PlayResult,
  Player,
  RunnerEvent,
  Team,
  TeamEvent,
} from '@/types/models';

const blankProgress = (
  startingHalf: HalfInning = 'bottom',
): LiveGameProgress => ({
  inning: 1,
  half: startingHalf,
  outs: 0,
  balls: 0,
  strikes: 0,
  battingIndex: 0,
  scoreFor: 0,
  scoreAgainst: 0,
  bases: {},
  history: [],
});

const cloneSnapshot = (
  progress: LiveGameProgress,
): Omit<LiveGameProgress, 'history'> => ({
  inning: progress.inning,
  half: progress.half,
  outs: progress.outs,
  balls: progress.balls,
  strikes: progress.strikes,
  battingIndex: progress.battingIndex,
  scoreFor: progress.scoreFor,
  scoreAgainst: progress.scoreAgainst,
  bases: { ...progress.bases },
  lastPitcherId: progress.lastPitcherId,
});

const applyThreeOutRule = (progress: LiveGameProgress): LiveGameProgress => {
  if (progress.outs < 3) return progress;

  const nextHalf: HalfInning = progress.half === 'top' ? 'bottom' : 'top';
  const nextInning =
    progress.half === 'top' ? progress.inning : progress.inning + 1;

  return {
    ...progress,
    inning: nextInning,
    half: nextHalf,
    outs: 0,
    balls: 0,
    strikes: 0,
    bases: {},
  };
};

const advanceForcedOneBase = (progress: LiveGameProgress, batterId: string) => {
  const events: RunnerEvent[] = [];
  let runs = 0;
  const nextBases: LiveGameProgress['bases'] = { ...progress.bases };

  if (nextBases.first) {
    const firstRunner = nextBases.first;
    delete nextBases.first;

    if (nextBases.second) {
      const secondRunner = nextBases.second;
      delete nextBases.second;

      if (nextBases.third) {
        const thirdRunner = nextBases.third;
        delete nextBases.third;
        runs += 1;
        events.push({
          id: uid(),
          playId: '',
          playerId: thirdRunner,
          fromBase: 3,
          toBase: 4,
          result: 'run_scored',
          runScored: true,
        });
      }

      nextBases.third = secondRunner;
      events.push({
        id: uid(),
        playId: '',
        playerId: secondRunner,
        fromBase: 2,
        toBase: 3,
        result: 'advance',
        runScored: false,
      });
    }

    nextBases.second = firstRunner;
    events.push({
      id: uid(),
      playId: '',
      playerId: firstRunner,
      fromBase: 1,
      toBase: 2,
      result: 'advance',
      runScored: false,
    });
  }

  nextBases.first = batterId;
  events.push({
    id: uid(),
    playId: '',
    playerId: batterId,
    fromBase: 0,
    toBase: 1,
    result: 'advance',
    runScored: false,
  });

  return {
    runs,
    bases: nextBases,
    events,
  };
};

const advanceBases = (
  progress: LiveGameProgress,
  batterId: string,
  basesToAdvance: 1 | 2 | 3 | 4,
) => {
  const events: RunnerEvent[] = [];
  let runs = 0;
  const nextBases: LiveGameProgress['bases'] = {};
  const pushRunner = (
    playerId: string,
    fromBase: 0 | 1 | 2 | 3,
    target: number,
    result: RunnerEvent['result'] = 'advance',
  ) => {
    if (target >= 4) {
      runs += 1;
      events.push({
        id: uid(),
        playId: '',
        playerId,
        fromBase,
        toBase: 4,
        result: result === 'advance' ? 'run_scored' : result,
        runScored: true,
      });
      return;
    }

    const toBase = target as 1 | 2 | 3;
    events.push({
      id: uid(),
      playId: '',
      playerId,
      fromBase,
      toBase,
      result,
      runScored: false,
    });
    if (toBase === 1) nextBases.first = playerId;
    if (toBase === 2) nextBases.second = playerId;
    if (toBase === 3) nextBases.third = playerId;
  };

  const occupied = [
    { player: progress.bases.third, base: 3 },
    { player: progress.bases.second, base: 2 },
    { player: progress.bases.first, base: 1 },
  ] as const;

  for (const spot of occupied) {
    if (!spot.player) continue;
    pushRunner(spot.player, spot.base as 1 | 2 | 3, spot.base + basesToAdvance);
  }

  if (basesToAdvance < 4) {
    pushRunner(batterId, 0, basesToAdvance, 'advance');
  } else {
    pushRunner(batterId, 0, 4, 'run_scored');
  }

  return {
    runs,
    bases: nextBases,
    events,
  };
};

interface AppState extends AppData {
  online: boolean;
  applyRemoteSnapshot: (snapshot: Partial<AppData>) => void;
  createTeam: (name: string, season: string) => void;
  updateTeam: (
    id: string,
    patch: Partial<Pick<Team, 'name' | 'season'>>,
  ) => void;
  setActiveTeam: (teamId: string) => void;
  addPlayer: (input: {
    name: string;
    number?: number;
    positions: string[];
  }) => void;
  updatePlayer: (
    id: string,
    patch: Partial<
      Pick<Player, 'name' | 'number' | 'positions' | 'notes' | 'po' | 'a' | 'e'>
    >,
  ) => void;
  setPlayerActive: (id: string, active: boolean) => void;
  addEvent: (input: {
    type: EventType;
    date: string;
    time?: string;
    location?: string;
    opponent?: string;
    notes?: string;
  }) => void;
  deleteMatch: (eventId: string) => void;
  ensureGameForEvent: (eventId: string, homeAway: Game['homeAway']) => string;
  setGameHomeAway: (gameId: string, homeAway: Game['homeAway']) => void;
  setAttendanceStatus: (
    eventId: string,
    playerId: string,
    status: AttendanceStatus,
  ) => void;
  setLineup: (
    gameId: string,
    entries: { playerId: string; startingPosition: string }[],
  ) => void;
  recordPlay: (input: {
    gameId: string;
    result: PlayResult;
    pitcherId?: string;
    outsOnPlay?: number;
    rbi?: number;
    notes?: string;
    fieldingPlay?: string;
  }) => void;
  recordRunnerAction: (input: {
    gameId: string;
    base: 1 | 2 | 3;
    type: 'SB' | 'CS';
  }) => void;
  moveRunner: (input: {
    gameId: string;
    fromBase: 1 | 2 | 3;
    toBase: 0 | 1 | 2 | 3 | 4;
  }) => void;
  placeRunnerOnBase: (input: { gameId: string; base: 1 | 2 | 3 }) => void;
  recordPickoff: (input: { gameId: string; base: 1 | 2 | 3 }) => void;
  nextBatter: (gameId: string) => void;
  advanceInning: (gameId: string) => void;
  recordOpponentRuns: (input: { gameId: string; runs: number }) => void;
  recordOpponentHit: (gameId: string) => void;
  recordOpponentError: (gameId: string) => void;
  finishGame: (gameId: string) => void;
  undoLastPlay: (gameId: string) => void;
  setOnline: (online: boolean) => void;
  flushPendingSync: () => void;
}

const initialState: AppData = {
  teams: [],
  players: [],
  events: [],
  attendance: [],
  games: [],
  lineups: [],
  plays: [],
  runnerEvents: [],
  gameProgress: {},
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialState,
      online: true,
      applyRemoteSnapshot: (snapshot) => {
        set((state) => {
          const teams = Array.isArray(snapshot.teams)
            ? snapshot.teams
            : state.teams;
          const teamIds = new Set(teams.map((team) => team.id));
          const snapshotActiveTeamId =
            snapshot.activeTeamId && teamIds.has(snapshot.activeTeamId)
              ? snapshot.activeTeamId
              : teams[0]?.id;

          return {
            teams,
            players: Array.isArray(snapshot.players)
              ? snapshot.players
              : state.players,
            events: Array.isArray(snapshot.events)
              ? snapshot.events
              : state.events,
            attendance: Array.isArray(snapshot.attendance)
              ? snapshot.attendance
              : state.attendance,
            games: Array.isArray(snapshot.games) ? snapshot.games : state.games,
            lineups: Array.isArray(snapshot.lineups)
              ? snapshot.lineups
              : state.lineups,
            plays: Array.isArray(snapshot.plays) ? snapshot.plays : state.plays,
            runnerEvents: Array.isArray(snapshot.runnerEvents)
              ? snapshot.runnerEvents
              : state.runnerEvents,
            gameProgress:
              snapshot.gameProgress && typeof snapshot.gameProgress === 'object'
                ? snapshot.gameProgress
                : state.gameProgress,
            activeTeamId: snapshotActiveTeamId,
          };
        });
      },
      createTeam: (name, season) => {
        const team: Team = {
          id: uid(),
          name,
          season,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          teams: [...state.teams, team],
          activeTeamId: state.activeTeamId ?? team.id,
        }));
      },
      updateTeam: (id, patch) => {
        set((state) => ({
          teams: state.teams.map((team) =>
            team.id === id ? { ...team, ...patch } : team,
          ),
        }));
      },
      setActiveTeam: (teamId) => {
        set((state) => {
          const exists = state.teams.some((team) => team.id === teamId);
          if (!exists) return {};
          return {
            activeTeamId: teamId,
          };
        });
      },
      addPlayer: ({ name, number, positions }) => {
        const { activeTeamId, teams } = get();
        const teamId = activeTeamId ?? teams[0]?.id;
        if (!teamId) return;
        const player: Player = {
          id: uid(),
          teamId,
          name,
          number,
          positions,
          active: true,
          po: 0,
          a: 0,
          e: 0,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ players: [...state.players, player] }));
      },
      updatePlayer: (id, patch) => {
        set((state) => ({
          players: state.players.map((player) =>
            player.id === id ? { ...player, ...patch } : player,
          ),
        }));
      },
      setPlayerActive: (id, active) => {
        set((state) => ({
          players: state.players.map((player) =>
            player.id === id ? { ...player, active } : player,
          ),
        }));
      },
      addEvent: ({ type, date, time, location, opponent, notes }) => {
        const { activeTeamId } = get();
        if (!activeTeamId) return;
        const event: TeamEvent = {
          id: uid(),
          teamId: activeTeamId,
          type,
          date,
          time,
          location,
          opponent,
          notes,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({ events: [...state.events, event] }));
      },
      deleteMatch: (eventId) => {
        set((state) => {
          const gameIdsToRemove = new Set(
            state.games
              .filter((game) => game.eventId === eventId)
              .map((game) => game.id),
          );
          const playIdsToRemove = new Set(
            state.plays
              .filter((play) => gameIdsToRemove.has(play.gameId))
              .map((play) => play.id),
          );
          const nextGameProgress = Object.fromEntries(
            Object.entries(state.gameProgress).filter(
              ([gameId]) => !gameIdsToRemove.has(gameId),
            ),
          );

          return {
            events: state.events.filter((event) => event.id !== eventId),
            attendance: state.attendance.filter(
              (entry) => entry.eventId !== eventId,
            ),
            games: state.games.filter((game) => game.eventId !== eventId),
            lineups: state.lineups.filter(
              (entry) => !gameIdsToRemove.has(entry.gameId),
            ),
            plays: state.plays.filter(
              (play) => !gameIdsToRemove.has(play.gameId),
            ),
            runnerEvents: state.runnerEvents.filter(
              (entry) => !playIdsToRemove.has(entry.playId),
            ),
            gameProgress: nextGameProgress,
          };
        });
      },
      ensureGameForEvent: (eventId, homeAway) => {
        const existing = get().games.find((game) => game.eventId === eventId);
        if (existing) return existing.id;

        const game: Game = {
          id: uid(),
          eventId,
          homeAway,
          innings: 7,
          status: 'gepland',
        };

        set((state) => ({
          games: [...state.games, game],
          gameProgress: {
            ...state.gameProgress,
            [game.id]: blankProgress(homeAway === 'thuis' ? 'top' : 'bottom'),
          },
        }));

        return game.id;
      },
      setGameHomeAway: (gameId, homeAway) => {
        set((state) => {
          const game = state.games.find((entry) => entry.id === gameId);
          if (!game || game.homeAway === homeAway) {
            return {};
          }

          const progress = state.gameProgress[gameId] ?? blankProgress();
          const shouldResetHalf = progress.inning === 1 && progress.outs === 0;

          return {
            games: state.games.map((entry) =>
              entry.id === gameId ? { ...entry, homeAway } : entry,
            ),
            gameProgress: {
              ...state.gameProgress,
              [gameId]: shouldResetHalf
                ? {
                    ...progress,
                    half: homeAway === 'thuis' ? 'top' : 'bottom',
                  }
                : progress,
            },
          };
        });
      },
      setAttendanceStatus: (eventId, playerId, status) => {
        const existing = get().attendance.find(
          (entry) => entry.eventId === eventId && entry.playerId === playerId,
        );
        if (existing) {
          set((state) => ({
            attendance: state.attendance.map((entry) =>
              entry.id === existing.id ? { ...entry, status } : entry,
            ),
          }));
          return;
        }

        const row: Attendance = {
          id: uid(),
          eventId,
          playerId,
          status,
        };
        set((state) => ({ attendance: [...state.attendance, row] }));
      },
      setLineup: (gameId, entries) => {
        const nextRows: LineupEntry[] = entries.map((entry, index) => ({
          id: uid(),
          gameId,
          playerId: entry.playerId,
          battingOrder: index + 1,
          startingPosition: entry.startingPosition,
          isStarter: true,
        }));

        set((state) => {
          const previousLineup = state.lineups
            .filter((entry) => entry.gameId === gameId)
            .sort((a, b) => a.battingOrder - b.battingOrder);
          const progress = state.gameProgress[gameId];

          let nextBattingIndex = progress?.battingIndex ?? 0;

          if (progress && previousLineup.length > 0 && nextRows.length > 0) {
            const currentIndex = progress.battingIndex % previousLineup.length;
            const currentBatterId = previousLineup[currentIndex]?.playerId;
            const movedToIndex = nextRows.findIndex(
              (entry) => entry.playerId === currentBatterId,
            );

            nextBattingIndex = movedToIndex >= 0 ? movedToIndex : 0;
          }

          return {
            lineups: [
              ...state.lineups.filter((entry) => entry.gameId !== gameId),
              ...nextRows,
            ],
            gameProgress: progress
              ? {
                  ...state.gameProgress,
                  [gameId]: {
                    ...progress,
                    battingIndex: nextBattingIndex,
                  },
                }
              : state.gameProgress,
          };
        });
      },
      recordPlay: ({
        gameId,
        result,
        pitcherId,
        outsOnPlay,
        rbi,
        notes,
        fieldingPlay,
      }) => {
        const state = get();
        const lineup = state.lineups
          .filter((entry) => entry.gameId === gameId)
          .sort((a, b) => a.battingOrder - b.battingOrder);
        if (lineup.length === 0) return;

        const progress = state.gameProgress[gameId] ?? blankProgress();
        const batter = lineup[progress.battingIndex % lineup.length];
        const playId = uid();
        const sequence =
          state.plays.filter((play) => play.gameId === gameId).length + 1;
        const runnerEvents: RunnerEvent[] = [];
        let nextProgress: LiveGameProgress = {
          ...progress,
          battingIndex: progress.battingIndex,
          history: [
            ...progress.history,
            {
              playId,
              snapshot: cloneSnapshot(progress),
            },
          ],
          lastPitcherId: pitcherId ?? progress.lastPitcherId,
        };

        let runsScored = 0;
        let outs = outsOnPlay ?? 0;
        let calculatedRbi = rbi ?? 0;
        let shouldAdvanceBatter = false;
        let resetCount = false;

        if (result === 'STRIKE') {
          nextProgress.strikes = Math.min(2, progress.strikes + 1);
        } else if (result === 'BALL') {
          nextProgress.balls = Math.min(3, progress.balls + 1);
        } else if (result === 'IN_PLAY') {
          nextProgress.strikes = 0;
          nextProgress.balls = 0;
        } else if (result === '1B') {
          const movement = advanceForcedOneBase(progress, batter.playerId);
          runsScored = movement.runs;
          calculatedRbi = calculatedRbi || movement.runs;
          nextProgress.bases = movement.bases;
          runnerEvents.push(...movement.events);
          shouldAdvanceBatter = true;
          resetCount = true;
        } else if (result === '2B') {
          const movement = advanceBases(progress, batter.playerId, 2);
          runsScored = movement.runs;
          calculatedRbi = calculatedRbi || movement.runs;
          nextProgress.bases = movement.bases;
          runnerEvents.push(...movement.events);
          shouldAdvanceBatter = true;
          resetCount = true;
        } else if (result === '3B') {
          const movement = advanceBases(progress, batter.playerId, 3);
          runsScored = movement.runs;
          calculatedRbi = calculatedRbi || movement.runs;
          nextProgress.bases = movement.bases;
          runnerEvents.push(...movement.events);
          shouldAdvanceBatter = true;
          resetCount = true;
        } else if (result === 'HR') {
          const movement = advanceBases(progress, batter.playerId, 4);
          runsScored = movement.runs;
          calculatedRbi = calculatedRbi || movement.runs;
          nextProgress.bases = {};
          runnerEvents.push(...movement.events);
          shouldAdvanceBatter = true;
          resetCount = true;
        } else if (result === 'BB' || result === 'HBP') {
          const movement = advanceForcedOneBase(progress, batter.playerId);
          runsScored = movement.runs;
          calculatedRbi = calculatedRbi || movement.runs;
          nextProgress.bases = movement.bases;
          runnerEvents.push(...movement.events);
          shouldAdvanceBatter = true;
          resetCount = true;
        } else if (result === 'E' || result === 'FC') {
          const movement = advanceBases(progress, batter.playerId, 1);
          runsScored = movement.runs;
          nextProgress.bases = movement.bases;
          runnerEvents.push(...movement.events);
          shouldAdvanceBatter = true;
          resetCount = true;
        } else if (result === 'K' || result === 'OUT' || result === 'SAC') {
          outs = outsOnPlay ?? 1;
          shouldAdvanceBatter = true;
          resetCount = true;
        } else if (result === 'PICKOFF') {
          outs = outsOnPlay ?? 1;
        } else if (result === 'NEXT_BATTER') {
          shouldAdvanceBatter = true;
          resetCount = true;
        }

        if (shouldAdvanceBatter) {
          nextProgress.battingIndex = progress.battingIndex + 1;
        }
        if (resetCount) {
          nextProgress.balls = 0;
          nextProgress.strikes = 0;
        }

        if (result === 'STRIKE' && progress.strikes >= 2) {
          outs = 1;
          nextProgress.balls = 0;
          nextProgress.strikes = 0;
          nextProgress.battingIndex = progress.battingIndex + 1;
        }

        if (result === 'BALL' && progress.balls >= 3) {
          const movement = advanceForcedOneBase(progress, batter.playerId);
          runsScored = movement.runs;
          calculatedRbi = calculatedRbi || movement.runs;
          nextProgress.bases = movement.bases;
          runnerEvents.push(...movement.events);
          nextProgress.balls = 0;
          nextProgress.strikes = 0;
          nextProgress.battingIndex = progress.battingIndex + 1;
        }

        nextProgress.outs += outs;
        nextProgress.scoreFor += runsScored;

        nextProgress = applyThreeOutRule(nextProgress);

        const play: Play = {
          id: playId,
          gameId,
          inning: progress.inning,
          half: progress.half,
          sequence,
          batterId: batter.playerId,
          pitcherId: pitcherId ?? progress.lastPitcherId,
          result,
          rbi: calculatedRbi,
          runsScored,
          outsOnPlay: outs,
          fieldingPlay,
          notes,
          voided: false,
          syncStatus: 'pending',
          createdAt: new Date().toISOString(),
        };

        const linkedRunnerEvents = runnerEvents.map((event) => ({
          ...event,
          playId,
        }));

        set((current) => ({
          plays: [...current.plays, play],
          runnerEvents: [...current.runnerEvents, ...linkedRunnerEvents],
          gameProgress: {
            ...current.gameProgress,
            [gameId]: nextProgress,
          },
          games: current.games.map((game) =>
            game.id === gameId && game.status === 'gepland'
              ? { ...game, status: 'bezig' }
              : game,
          ),
        }));
      },
      recordRunnerAction: ({ gameId, base, type }) => {
        const state = get();
        const progress = state.gameProgress[gameId] ?? blankProgress();
        const runner =
          base === 1
            ? progress.bases.first
            : base === 2
              ? progress.bases.second
              : progress.bases.third;
        if (!runner) return;

        const playId = uid();
        const sequence =
          state.plays.filter((play) => play.gameId === gameId).length + 1;
        const nextProgress: LiveGameProgress = {
          ...progress,
          history: [
            ...progress.history,
            {
              playId,
              snapshot: cloneSnapshot(progress),
            },
          ],
        };

        let outsOnPlay = 0;
        let runsScored = 0;

        if (base === 1) delete nextProgress.bases.first;
        if (base === 2) delete nextProgress.bases.second;
        if (base === 3) delete nextProgress.bases.third;

        const runnerEvent: RunnerEvent = {
          id: uid(),
          playId,
          playerId: runner,
          fromBase: base,
          toBase:
            type === 'SB' ? (base === 3 ? 4 : ((base + 1) as 2 | 3 | 4)) : base,
          result: type,
          runScored: false,
        };

        if (type === 'SB') {
          if (base === 3) {
            runsScored = 1;
            runnerEvent.toBase = 4;
            runnerEvent.runScored = true;
            runnerEvent.result = 'run_scored';
          } else if (base === 1) {
            nextProgress.bases.second = runner;
          } else if (base === 2) {
            nextProgress.bases.third = runner;
          }
        } else {
          outsOnPlay = 1;
          runnerEvent.result = 'CS';
          runnerEvent.toBase = base;
          runnerEvent.runScored = false;
          nextProgress.outs += 1;
          Object.assign(nextProgress, applyThreeOutRule(nextProgress));
        }

        nextProgress.scoreFor += runsScored;

        const play: Play = {
          id: playId,
          gameId,
          inning: progress.inning,
          half: progress.half,
          sequence,
          result: type,
          runsScored,
          rbi: 0,
          outsOnPlay,
          voided: false,
          syncStatus: 'pending',
          createdAt: new Date().toISOString(),
        };

        set((current) => ({
          plays: [...current.plays, play],
          runnerEvents: [...current.runnerEvents, runnerEvent],
          gameProgress: {
            ...current.gameProgress,
            [gameId]: nextProgress,
          },
        }));
      },
      recordPickoff: ({ gameId, base }) => {
        const state = get();
        const progress = state.gameProgress[gameId] ?? blankProgress();
        const runner =
          base === 1
            ? progress.bases.first
            : base === 2
              ? progress.bases.second
              : progress.bases.third;
        if (!runner) return;

        const playId = uid();
        const sequence =
          state.plays.filter((play) => play.gameId === gameId).length + 1;
        const nextProgress: LiveGameProgress = {
          ...progress,
          history: [
            ...progress.history,
            {
              playId,
              snapshot: cloneSnapshot(progress),
            },
          ],
        };

        if (base === 1) delete nextProgress.bases.first;
        if (base === 2) delete nextProgress.bases.second;
        if (base === 3) delete nextProgress.bases.third;
        nextProgress.outs += 1;
        Object.assign(nextProgress, applyThreeOutRule(nextProgress));

        const play: Play = {
          id: playId,
          gameId,
          inning: progress.inning,
          half: progress.half,
          sequence,
          result: 'PICKOFF',
          runsScored: 0,
          rbi: 0,
          outsOnPlay: 1,
          notes: `Pickoff op ${base}B`,
          voided: false,
          syncStatus: 'pending',
          createdAt: new Date().toISOString(),
        };

        const runnerEvent: RunnerEvent = {
          id: uid(),
          playId,
          playerId: runner,
          fromBase: base,
          toBase: base,
          result: 'pickoff',
          runScored: false,
        };

        set((current) => ({
          plays: [...current.plays, play],
          runnerEvents: [...current.runnerEvents, runnerEvent],
          gameProgress: {
            ...current.gameProgress,
            [gameId]: nextProgress,
          },
        }));
      },
      moveRunner: ({ gameId, fromBase, toBase }) => {
        const state = get();
        const progress = state.gameProgress[gameId] ?? blankProgress();
        const runner =
          fromBase === 1
            ? progress.bases.first
            : fromBase === 2
              ? progress.bases.second
              : progress.bases.third;
        if (!runner) return;
        if (toBase === fromBase) return;

        if (
          toBase !== 0 &&
          toBase !== 4 &&
          ((toBase === 1 && progress.bases.first) ||
            (toBase === 2 && progress.bases.second) ||
            (toBase === 3 && progress.bases.third))
        ) {
          return;
        }

        const playId = uid();
        const sequence =
          state.plays.filter((play) => play.gameId === gameId).length + 1;
        const nextProgress: LiveGameProgress = {
          ...progress,
          history: [
            ...progress.history,
            {
              playId,
              snapshot: cloneSnapshot(progress),
            },
          ],
        };

        if (fromBase === 1) delete nextProgress.bases.first;
        if (fromBase === 2) delete nextProgress.bases.second;
        if (fromBase === 3) delete nextProgress.bases.third;

        let outsOnPlay = 0;
        let runsScored = 0;
        let result: PlayResult = 'FC';
        let runnerResult: RunnerEvent['result'] = 'advance';

        if (toBase === 0) {
          outsOnPlay = 1;
          result = 'OUT';
          runnerResult = 'out_on_base';
          nextProgress.outs += 1;
          Object.assign(nextProgress, applyThreeOutRule(nextProgress));
        } else if (toBase === 4) {
          runsScored = 1;
          runnerResult = 'run_scored';
          nextProgress.scoreFor += 1;
        } else if (toBase === 1) {
          nextProgress.bases.first = runner;
        } else if (toBase === 2) {
          nextProgress.bases.second = runner;
        } else {
          nextProgress.bases.third = runner;
        }

        const play: Play = {
          id: playId,
          gameId,
          inning: progress.inning,
          half: progress.half,
          sequence,
          result,
          runsScored,
          rbi: 0,
          outsOnPlay,
          notes: `Runner handmatig verplaatst van ${fromBase}B naar ${
            toBase === 0 ? 'uit' : toBase === 4 ? 'home' : `${toBase}B`
          }`,
          voided: false,
          syncStatus: 'pending',
          createdAt: new Date().toISOString(),
        };

        const runnerEvent: RunnerEvent = {
          id: uid(),
          playId,
          playerId: runner,
          fromBase,
          toBase: toBase === 0 ? fromBase : (toBase as 1 | 2 | 3 | 4),
          result: runnerResult,
          runScored: toBase === 4,
        };

        set((current) => ({
          plays: [...current.plays, play],
          runnerEvents: [...current.runnerEvents, runnerEvent],
          gameProgress: {
            ...current.gameProgress,
            [gameId]: nextProgress,
          },
        }));
      },
      placeRunnerOnBase: ({ gameId, base }) => {
        const state = get();
        const lineup = state.lineups
          .filter((entry) => entry.gameId === gameId)
          .sort((a, b) => a.battingOrder - b.battingOrder);
        if (lineup.length === 0) return;

        const progress = state.gameProgress[gameId] ?? blankProgress();
        const occupied =
          (base === 1 && progress.bases.first) ||
          (base === 2 && progress.bases.second) ||
          (base === 3 && progress.bases.third);
        if (occupied) return;

        const batter = lineup[progress.battingIndex % lineup.length];
        const playId = uid();
        const sequence =
          state.plays.filter((play) => play.gameId === gameId).length + 1;

        const nextProgress: LiveGameProgress = {
          ...progress,
          history: [
            ...progress.history,
            {
              playId,
              snapshot: cloneSnapshot(progress),
            },
          ],
        };

        if (base === 1) nextProgress.bases.first = batter.playerId;
        if (base === 2) nextProgress.bases.second = batter.playerId;
        if (base === 3) nextProgress.bases.third = batter.playerId;

        const play: Play = {
          id: playId,
          gameId,
          inning: progress.inning,
          half: progress.half,
          sequence,
          batterId: batter.playerId,
          result: 'IN_PLAY',
          runsScored: 0,
          rbi: 0,
          outsOnPlay: 0,
          notes: `Handmatig loper geplaatst op ${base}B`,
          voided: false,
          syncStatus: 'pending',
          createdAt: new Date().toISOString(),
        };

        const runnerEvent: RunnerEvent = {
          id: uid(),
          playId,
          playerId: batter.playerId,
          fromBase: 0,
          toBase: base,
          result: 'advance',
          runScored: false,
        };

        set((current) => ({
          plays: [...current.plays, play],
          runnerEvents: [...current.runnerEvents, runnerEvent],
          gameProgress: {
            ...current.gameProgress,
            [gameId]: nextProgress,
          },
        }));
      },
      advanceInning: (gameId) => {
        const state = get();
        const progress = state.gameProgress[gameId] ?? blankProgress();
        const playId = uid();
        const sequence =
          state.plays.filter((play) => play.gameId === gameId).length + 1;

        const nextHalf: HalfInning = progress.half === 'top' ? 'bottom' : 'top';
        const nextInning =
          progress.half === 'top' ? progress.inning : progress.inning + 1;

        const nextProgress: LiveGameProgress = {
          ...progress,
          inning: nextInning,
          half: nextHalf,
          outs: 0,
          balls: 0,
          strikes: 0,
          bases: {},
          history: [
            ...progress.history,
            {
              playId,
              snapshot: cloneSnapshot(progress),
            },
          ],
        };

        const play: Play = {
          id: playId,
          gameId,
          inning: progress.inning,
          half: progress.half,
          sequence,
          result: 'INNING_ADVANCE',
          runsScored: 0,
          rbi: 0,
          outsOnPlay: 0,
          notes: 'Handmatig naar volgende inning',
          voided: false,
          syncStatus: 'pending',
          createdAt: new Date().toISOString(),
        };

        set((current) => ({
          plays: [...current.plays, play],
          gameProgress: {
            ...current.gameProgress,
            [gameId]: nextProgress,
          },
          games: current.games.map((game) =>
            game.id === gameId && game.status === 'gepland'
              ? { ...game, status: 'bezig' }
              : game,
          ),
        }));
      },
      nextBatter: (gameId) => {
        const state = get();
        const progress = state.gameProgress[gameId] ?? blankProgress();
        const playId = uid();
        const sequence =
          state.plays.filter((play) => play.gameId === gameId).length + 1;

        const nextProgress: LiveGameProgress = {
          ...progress,
          battingIndex: progress.battingIndex + 1,
          balls: 0,
          strikes: 0,
          history: [
            ...progress.history,
            {
              playId,
              snapshot: cloneSnapshot(progress),
            },
          ],
        };

        const play: Play = {
          id: playId,
          gameId,
          inning: progress.inning,
          half: progress.half,
          sequence,
          result: 'NEXT_BATTER',
          runsScored: 0,
          rbi: 0,
          outsOnPlay: 0,
          notes: 'Handmatig volgende slagman',
          voided: false,
          syncStatus: 'pending',
          createdAt: new Date().toISOString(),
        };

        set((current) => ({
          plays: [...current.plays, play],
          gameProgress: {
            ...current.gameProgress,
            [gameId]: nextProgress,
          },
          games: current.games.map((game) =>
            game.id === gameId && game.status === 'gepland'
              ? { ...game, status: 'bezig' }
              : game,
          ),
        }));
      },
      recordOpponentRuns: ({ gameId, runs }) => {
        if (!Number.isFinite(runs) || runs <= 0) return;

        const state = get();
        const progress = state.gameProgress[gameId] ?? blankProgress();
        const playId = uid();
        const sequence =
          state.plays.filter((play) => play.gameId === gameId).length + 1;

        const nextProgress: LiveGameProgress = {
          ...progress,
          scoreAgainst: progress.scoreAgainst + Math.trunc(runs),
          history: [
            ...progress.history,
            {
              playId,
              snapshot: cloneSnapshot(progress),
            },
          ],
        };

        const play: Play = {
          id: playId,
          gameId,
          inning: progress.inning,
          half: progress.half,
          sequence,
          result: 'OPP_RUNS',
          runsScored: 0,
          opponentRuns: Math.trunc(runs),
          rbi: 0,
          outsOnPlay: 0,
          notes: `Tegenstander scoort ${Math.trunc(runs)} run(s)`,
          voided: false,
          syncStatus: 'pending',
          createdAt: new Date().toISOString(),
        };

        set((current) => ({
          plays: [...current.plays, play],
          gameProgress: {
            ...current.gameProgress,
            [gameId]: nextProgress,
          },
          games: current.games.map((game) =>
            game.id === gameId && game.status === 'gepland'
              ? { ...game, status: 'bezig' }
              : game,
          ),
        }));
      },
      recordOpponentHit: (gameId) => {
        const state = get();
        const progress = state.gameProgress[gameId] ?? blankProgress();
        const play: Play = {
          id: uid(),
          gameId,
          inning: progress.inning,
          half: progress.half,
          sequence:
            state.plays.filter((entry) => entry.gameId === gameId).length + 1,
          result: 'OPP_HIT',
          runsScored: 0,
          rbi: 0,
          outsOnPlay: 0,
          notes: 'Tegenstander hit',
          voided: false,
          syncStatus: 'pending',
          createdAt: new Date().toISOString(),
        };

        set((current) => ({
          plays: [...current.plays, play],
          games: current.games.map((entry) =>
            entry.id === gameId && entry.status === 'gepland'
              ? { ...entry, status: 'bezig' }
              : entry,
          ),
        }));
      },
      recordOpponentError: (gameId) => {
        const state = get();
        const progress = state.gameProgress[gameId] ?? blankProgress();
        const play: Play = {
          id: uid(),
          gameId,
          inning: progress.inning,
          half: progress.half,
          sequence:
            state.plays.filter((entry) => entry.gameId === gameId).length + 1,
          result: 'OPP_ERROR',
          runsScored: 0,
          rbi: 0,
          outsOnPlay: 0,
          notes: 'Fout tegenstander',
          voided: false,
          syncStatus: 'pending',
          createdAt: new Date().toISOString(),
        };

        set((current) => ({
          plays: [...current.plays, play],
          games: current.games.map((entry) =>
            entry.id === gameId && entry.status === 'gepland'
              ? { ...entry, status: 'bezig' }
              : entry,
          ),
        }));
      },
      finishGame: (gameId) => {
        const progress = get().gameProgress[gameId] ?? blankProgress();
        set((state) => ({
          games: state.games.map((game) =>
            game.id === gameId
              ? {
                  ...game,
                  status: 'klaar',
                  finalScoreFor: progress.scoreFor,
                  finalScoreAgainst: progress.scoreAgainst,
                }
              : game,
          ),
        }));
      },
      undoLastPlay: (gameId) => {
        const state = get();
        const progress = state.gameProgress[gameId];
        if (!progress || progress.history.length === 0) return;

        const latest = progress.history[progress.history.length - 1];
        set((current) => ({
          plays: current.plays.map((play) =>
            play.id === latest.playId
              ? { ...play, voided: true, syncStatus: 'pending' }
              : play,
          ),
          gameProgress: {
            ...current.gameProgress,
            [gameId]: {
              ...latest.snapshot,
              history: progress.history.slice(0, -1),
            },
          },
        }));
      },
      setOnline: (online) => set({ online }),
      flushPendingSync: () => {
        const { online } = get();
        if (!online) return;
        set((state) => ({
          plays: state.plays.map((play) =>
            play.syncStatus === 'pending'
              ? { ...play, syncStatus: 'synced' }
              : play,
          ),
        }));
      },
    }),
    {
      name: 'baseball-mvp-store-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        teams: state.teams,
        players: state.players,
        events: state.events,
        attendance: state.attendance,
        games: state.games,
        lineups: state.lineups,
        plays: state.plays,
        runnerEvents: state.runnerEvents,
        gameProgress: state.gameProgress,
        activeTeamId: state.activeTeamId,
      }),
      merge: (persistedState, currentState) => {
        const merged = {
          ...currentState,
          ...(persistedState as Partial<AppState>),
          online: true,
        };

        const teamIds = new Set((merged.teams ?? []).map((team) => team.id));
        const validActiveTeamId =
          merged.activeTeamId && teamIds.has(merged.activeTeamId)
            ? merged.activeTeamId
            : merged.teams?.[0]?.id;

        return {
          ...merged,
          activeTeamId: validActiveTeamId,
        };
      },
    },
  ),
);

export const useActiveTeam = () => {
  return useAppStore((state) => {
    const active = state.teams.find((team) => team.id === state.activeTeamId);
    return active ?? state.teams[0];
  });
};
