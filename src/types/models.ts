export type AttendanceStatus =
  | 'aanwezig'
  | 'afwezig'
  | 'misschien'
  | 'geen_reactie';

export type EventType =
  | 'training'
  | 'wedstrijd'
  | 'oefenwedstrijd'
  | 'toernooi'
  | 'teamactiviteit';

export type PlayResult =
  | '1B'
  | '2B'
  | '3B'
  | 'HR'
  | 'BB'
  | 'K'
  | 'OUT'
  | 'E'
  | 'HBP'
  | 'FC'
  | 'SAC'
  | 'SB'
  | 'CS';

export type HalfInning = 'top' | 'bottom';

export type SyncStatus = 'synced' | 'pending';

export interface Team {
  id: string;
  name: string;
  season: string;
  createdAt: string;
}

export interface Player {
  id: string;
  teamId: string;
  name: string;
  number?: number;
  positions: string[];
  bats?: 'R' | 'L' | 'S';
  throws?: 'R' | 'L';
  active: boolean;
  notes?: string;
  po: number;
  a: number;
  e: number;
  createdAt: string;
}

export interface TeamEvent {
  id: string;
  teamId: string;
  type: EventType;
  date: string;
  time?: string;
  location?: string;
  opponent?: string;
  notes?: string;
  createdAt: string;
}

export interface Attendance {
  id: string;
  eventId: string;
  playerId: string;
  status: AttendanceStatus;
  comment?: string;
}

export interface Game {
  id: string;
  eventId: string;
  homeAway: 'thuis' | 'uit';
  innings: number;
  status: 'gepland' | 'bezig' | 'klaar';
  finalScoreFor?: number;
  finalScoreAgainst?: number;
}

export interface LineupEntry {
  id: string;
  gameId: string;
  playerId: string;
  battingOrder: number;
  startingPosition: string;
  isStarter: boolean;
}

export interface RunnerEvent {
  id: string;
  playId: string;
  playerId: string;
  fromBase: 0 | 1 | 2 | 3;
  toBase: 1 | 2 | 3 | 4;
  result: 'advance' | 'SB' | 'CS' | 'pickoff' | 'out_on_base' | 'run_scored';
  runScored: boolean;
}

export interface Play {
  id: string;
  gameId: string;
  inning: number;
  half: HalfInning;
  sequence: number;
  batterId?: string;
  pitcherId?: string;
  result: PlayResult;
  rbi: number;
  runsScored: number;
  outsOnPlay: number;
  fieldingPlay?: string;
  notes?: string;
  voided: boolean;
  syncStatus: SyncStatus;
  createdAt: string;
}

export interface LiveGameProgress {
  inning: number;
  half: HalfInning;
  outs: number;
  battingIndex: number;
  scoreFor: number;
  scoreAgainst: number;
  bases: {
    first?: string;
    second?: string;
    third?: string;
  };
  lastPitcherId?: string;
  history: {
    playId: string;
    snapshot: Omit<LiveGameProgress, 'history'>;
  }[];
}

export interface AppData {
  teams: Team[];
  players: Player[];
  events: TeamEvent[];
  attendance: Attendance[];
  games: Game[];
  lineups: LineupEntry[];
  plays: Play[];
  runnerEvents: RunnerEvent[];
  gameProgress: Record<string, LiveGameProgress>;
  activeTeamId?: string;
}
