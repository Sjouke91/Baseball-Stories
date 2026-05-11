import { compareAsc, parseISO } from 'date-fns';
import { calculateFielding } from '@/lib/stats/fielding';
import { calculateHitting } from '@/lib/stats/hitting';
import { calculatePitching } from '@/lib/stats/pitching';
import type { AppData, Play, PlayResult, Player } from '@/types/models';

const hitResults: PlayResult[] = ['1B', '2B', '3B', 'HR'];
const abResults: PlayResult[] = ['1B', '2B', '3B', 'HR', 'K', 'OUT', 'E', 'FC'];

export const isMatchEventType = (type: AppData['events'][number]['type']) => {
  return type.includes('wedstrijd');
};

export const sortedEvents = (data: Pick<AppData, 'events'>) => {
  return [...data.events].sort((a, b) =>
    compareAsc(parseISO(a.date), parseISO(b.date)),
  );
};

export const getEventGame = (data: Pick<AppData, 'games'>, eventId: string) => {
  return data.games.find((game) => game.eventId === eventId);
};

export const getLineupForGame = (
  data: Pick<AppData, 'lineups'>,
  gameId: string,
) => {
  return data.lineups
    .filter((entry) => entry.gameId === gameId)
    .sort((a, b) => a.battingOrder - b.battingOrder);
};

export const syncIndicator = (
  plays: Play[],
  online: boolean,
): 'synced' | 'pending' | 'offline' => {
  if (!online) return 'offline';
  if (plays.some((play) => play.syncStatus === 'pending')) return 'pending';
  return 'synced';
};

export const playerHittingStats = (data: AppData, player: Player) => {
  const plays = data.plays.filter(
    (play) => play.batterId === player.id && !play.voided,
  );
  const singles = plays.filter((play) => play.result === '1B').length;
  const doubles = plays.filter((play) => play.result === '2B').length;
  const triples = plays.filter((play) => play.result === '3B').length;
  const hr = plays.filter((play) => play.result === 'HR').length;
  const h = plays.filter((play) => hitResults.includes(play.result)).length;
  const bb = plays.filter((play) => play.result === 'BB').length;
  const hbp = plays.filter((play) => play.result === 'HBP').length;
  const sf = plays.filter((play) => play.result === 'SAC').length;
  const ab = plays.filter((play) => abResults.includes(play.result)).length;
  const rbi = plays.reduce((sum, play) => sum + play.rbi, 0);
  const r = plays.reduce((sum, play) => sum + play.runsScored, 0);

  const rate = calculateHitting({
    ab,
    h,
    singles,
    doubles,
    triples,
    hr,
    bb,
    hbp,
    sf,
  });

  return {
    g: new Set(plays.map((play) => play.gameId)).size,
    ab,
    h,
    singles,
    doubles,
    triples,
    hr,
    bb,
    hbp,
    sf,
    rbi,
    r,
    ...rate,
  };
};

export const playerPitchingStats = (data: AppData, player: Player) => {
  const plays = data.plays.filter(
    (play) => play.pitcherId === player.id && !play.voided,
  );
  const h = plays.filter((play) => hitResults.includes(play.result)).length;
  const bb = plays.filter((play) => play.result === 'BB').length;
  const k = plays.filter((play) => play.result === 'K').length;
  const er = plays.reduce((sum, play) => sum + play.runsScored, 0);
  const outs = plays.reduce((sum, play) => sum + play.outsOnPlay, 0);
  const ip = Math.trunc(outs / 3) + (outs % 3) / 10;
  const rates = calculatePitching({ ip, h, bb, k, er });

  return {
    ip,
    h,
    bb,
    k,
    er,
    ...rates,
  };
};

export const playerFieldingStats = (player: Player) => {
  return calculateFielding({ po: player.po, a: player.a, e: player.e });
};
