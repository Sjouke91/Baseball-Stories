'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { AppShell } from '@/components/AppShell';
import { Modal } from '@/components/Modal';
import {
  getEventGame,
  getLineupForGame,
  isMatchEventType,
  sortedEvents,
} from '@/lib/selectors';
import { useActiveTeam, useAppStore } from '@/stores/useAppStore';

export default function HomePage() {
  const team = useActiveTeam();
  const events = useAppStore((state) => state.events);
  const games = useAppStore((state) => state.games);
  const lineups = useAppStore((state) => state.lineups);
  const plays = useAppStore((state) => state.plays);
  const gameProgress = useAppStore((state) => state.gameProgress);
  const attendance = useAppStore((state) => state.attendance);
  const createTeam = useAppStore((state) => state.createTeam);

  const [name, setName] = useState('');
  const [season, setSeason] = useState(String(new Date().getFullYear()));
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [activitySlide, setActivitySlide] = useState(0);

  const upcomingActivities = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const list = sortedEvents({ events });
    return list.filter((event) => {
      if (event.teamId !== team?.id) return false;
      const isTraining = event.type === 'training';
      const isMatch = isMatchEventType(event.type);
      if (!isTraining && !isMatch) return false;

      if (isTraining) {
        return event.date >= today;
      }

      const game = getEventGame({ games }, event.id);
      return game?.status !== 'klaar';
    });
  }, [events, games, team?.id]);

  const teamGames = useMemo(() => {
    if (!team) return [];
    const teamEventIds = new Set(
      events
        .filter((event) => event.teamId === team.id)
        .map((event) => event.id),
    );
    return games.filter((game) => teamEventIds.has(game.eventId));
  }, [events, games, team]);

  const finishedGames = useMemo(
    () => teamGames.filter((game) => game.status === 'klaar'),
    [teamGames],
  );

  const seasonSummary = useMemo(() => {
    const wins = finishedGames.filter(
      (game) => (game.finalScoreFor ?? 0) > (game.finalScoreAgainst ?? 0),
    ).length;
    const losses = finishedGames.filter(
      (game) => (game.finalScoreFor ?? 0) < (game.finalScoreAgainst ?? 0),
    ).length;
    const ties = finishedGames.filter(
      (game) => (game.finalScoreFor ?? 0) === (game.finalScoreAgainst ?? 0),
    ).length;
    const runsFor = finishedGames.reduce(
      (sum, game) => sum + (game.finalScoreFor ?? 0),
      0,
    );
    const runsAgainst = finishedGames.reduce(
      (sum, game) => sum + (game.finalScoreAgainst ?? 0),
      0,
    );

    const teamGameIds = new Set(teamGames.map((game) => game.id));
    const activePlays = plays.filter(
      (play) => teamGameIds.has(play.gameId) && !play.voided,
    );

    const hits = activePlays.filter((play) =>
      ['1B', '2B', '3B', 'HR'].includes(play.result),
    ).length;
    const errors = activePlays.filter(
      (play) => play.result === 'OPP_ERROR',
    ).length;

    return {
      games: finishedGames.length,
      wins,
      losses,
      ties,
      runsFor,
      runsAgainst,
      hits,
      errors,
    };
  }, [finishedGames, teamGames, plays]);

  const nextGame = useMemo(() => {
    if (!team) return undefined;
    const nowDate = new Date().toISOString().slice(0, 10);

    return sortedEvents({ events })
      .filter(
        (event) => event.teamId === team.id && isMatchEventType(event.type),
      )
      .map((event) => {
        const game = getEventGame({ games }, event.id);
        return { event, game };
      })
      .filter(
        ({ event, game }) => event.date >= nowDate && game?.status !== 'klaar',
      )
      .at(0);
  }, [events, games, team]);

  const nextGameReadiness = useMemo(() => {
    if (!nextGame?.game) return undefined;
    const lineup = getLineupForGame({ lineups }, nextGame.game.id);

    const requiredPositions = new Set([
      'P',
      'C',
      '1B',
      '2B',
      '3B',
      'SS',
      'LF',
      'CF',
      'RF',
    ]);
    const presentPositions = new Set(
      lineup.map((entry) => entry.startingPosition.toUpperCase()),
    );
    const missingPositions = Array.from(requiredPositions).filter(
      (position) => !presentPositions.has(position),
    );

    const eventAttendance = attendance.filter(
      (entry) => entry.eventId === nextGame.event.id,
    );

    const presentCount = eventAttendance.filter(
      (entry) => entry.status === 'aanwezig',
    ).length;
    const absentCount = eventAttendance.filter(
      (entry) => entry.status === 'afwezig',
    ).length;
    const unknownCount = eventAttendance.filter(
      (entry) =>
        entry.status === 'geen_reactie' || entry.status === 'misschien',
    ).length;

    return {
      lineupCount: lineup.length,
      missingPositions,
      presentCount,
      absentCount,
      unknownCount,
    };
  }, [nextGame, lineups, attendance]);

  const activeGame = useMemo(() => {
    const game = teamGames.find((entry) => entry.status === 'bezig');
    if (!game) return undefined;
    const event = events.find((entry) => entry.id === game.eventId);
    if (!event) return undefined;
    return { game, event };
  }, [teamGames, events]);

  const activeGameState = useMemo(() => {
    if (!activeGame) return undefined;

    const progress = gameProgress[activeGame.game.id];
    const lastPlay = plays
      .filter((play) => play.gameId === activeGame.game.id && !play.voided)
      .at(-1);

    return {
      progress,
      lastPlay,
    };
  }, [activeGame, gameProgress, plays]);

  const alerts = useMemo(() => {
    const items: string[] = [];
    if (!team) {
      items.push(
        'Maak eerst een team aan om wedstrijden en stats bij te houden.',
      );
      return items;
    }

    if (!nextGame) {
      items.push('Geen aankomende wedstrijd gepland.');
    }

    if (nextGame && nextGameReadiness) {
      if (nextGameReadiness.lineupCount < 9) {
        items.push('Line-up voor de volgende wedstrijd is nog niet compleet.');
      }
      if (nextGameReadiness.missingPositions.length > 0) {
        items.push(
          `Verdedigende posities missen: ${nextGameReadiness.missingPositions.join(', ')}.`,
        );
      }
      if (nextGameReadiness.presentCount < 9) {
        items.push(
          'Minder dan 9 spelers staan op aanwezig voor de volgende wedstrijd.',
        );
      }
    }

    if (activeGame && !activeGameState?.lastPlay) {
      items.push(
        'Wedstrijd staat op bezig, maar er zijn nog geen plays gescoord.',
      );
    }

    return items;
  }, [
    team,
    nextGame,
    nextGameReadiness,
    activeGame,
    activeGameState?.lastPlay,
  ]);

  const activityTilesPerSlide = 3;
  const activityPages = useMemo(() => {
    const pages: (typeof upcomingActivities)[] = [];
    for (
      let index = 0;
      index < upcomingActivities.length;
      index += activityTilesPerSlide
    ) {
      pages.push(
        upcomingActivities.slice(index, index + activityTilesPerSlide),
      );
    }
    return pages;
  }, [upcomingActivities]);

  const totalActivityPages = activityPages.length;
  const safeActivitySlide =
    totalActivityPages === 0
      ? 0
      : Math.min(activitySlide, totalActivityPages - 1);

  return (
    <AppShell title='Dashboard'>
      <section className='mb-4 flex items-center justify-between gap-3 rounded-2xl border border-black/10 bg-card p-4'>
        <div>
          <h2 className='text-lg font-bold'>Team overzicht</h2>
          <p className='text-sm text-black/70'>
            Bekijk je actieve team en beheer de activiteiten van dit seizoen.
          </p>
        </div>
        <div className='ml-auto rounded-xl bg-muted px-3 py-2 text-sm'>
          {team ? (
            <p>
              <span className='font-semibold'>{team.name}</span> · seizoen{' '}
              {team.season}
            </p>
          ) : (
            <p className='text-black/70'>Nog geen team aangemaakt</p>
          )}
        </div>
        {!team ? (
          <button
            className='inline-flex items-center gap-2 rounded-lg bg-accent px-3 py-2 font-semibold text-white'
            onClick={() => setShowTeamModal(true)}
            type='button'
          >
            <span aria-hidden='true' className='text-lg leading-none'>
              +
            </span>
            <span>Team aanmaken</span>
          </button>
        ) : null}
      </section>

      <section>
        <div className='mb-4 grid gap-4 lg:grid-cols-2'>
          <article className='rounded-2xl border border-black/10 bg-card p-5 shadow-sm'>
            <h2 className='text-xl font-bold'>Live status</h2>
            {activeGame && activeGameState?.progress ? (
              <div className='mt-3 space-y-2'>
                <p className='text-sm text-black/70'>
                  {activeGame.event.opponent
                    ? `vs ${activeGame.event.opponent}`
                    : 'Tegenstander onbekend'}
                </p>
                <p className='text-lg font-semibold'>
                  Inning {activeGameState.progress.inning} (
                  {activeGameState.progress.half}) · Outs{' '}
                  {activeGameState.progress.outs}
                </p>
                <p className='text-sm text-black/70'>
                  Score {activeGameState.progress.scoreFor} -{' '}
                  {activeGameState.progress.scoreAgainst} · Count{' '}
                  {activeGameState.progress.balls}-
                  {activeGameState.progress.strikes}
                </p>
                <p className='text-sm text-black/70'>
                  Laatste play:{' '}
                  {activeGameState.lastPlay?.result ?? 'Nog geen plays'}
                  {activeGameState.lastPlay?.notes
                    ? ` (${activeGameState.lastPlay.notes})`
                    : ''}
                </p>
                <Link
                  className='inline-flex rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white'
                  href={`/wedstrijd/${activeGame.game.id}/score`}
                >
                  Hervat live scoring
                </Link>
              </div>
            ) : (
              <p className='mt-3 text-sm text-black/70'>
                Er is nu geen wedstrijd bezig.
              </p>
            )}
          </article>

          <article className='rounded-2xl border border-black/10 bg-card p-5 shadow-sm'>
            <h2 className='text-xl font-bold'>Volgende wedstrijd</h2>
            {nextGame ? (
              <div className='mt-3 space-y-2'>
                <p className='text-lg font-semibold'>
                  {format(new Date(nextGame.event.date), 'EEEE d MMMM', {
                    locale: nl,
                  })}
                </p>
                <p className='text-sm text-black/70'>
                  {nextGame.event.time ?? 'Tijd onbekend'} ·{' '}
                  {nextGame.event.location ?? 'Locatie onbekend'}
                </p>
                <p className='text-sm text-black/70'>
                  {nextGame.event.opponent
                    ? `vs ${nextGame.event.opponent}`
                    : 'Tegenstander onbekend'}
                </p>

                {nextGameReadiness ? (
                  <div className='rounded-xl bg-white p-3 text-sm'>
                    <p className='font-semibold'>Readiness</p>
                    <p className='text-black/70'>
                      Line-up: {nextGameReadiness.lineupCount}/9
                    </p>
                    <p className='text-black/70'>
                      Aanwezig: {nextGameReadiness.presentCount} · Afwezig:{' '}
                      {nextGameReadiness.absentCount} · Onzeker:{' '}
                      {nextGameReadiness.unknownCount}
                    </p>
                    <p className='text-black/70'>
                      {nextGameReadiness.missingPositions.length
                        ? `Missende posities: ${nextGameReadiness.missingPositions.join(', ')}`
                        : 'Alle verdedigde posities ingevuld'}
                    </p>
                  </div>
                ) : null}

                {nextGame.game ? (
                  <div className='flex flex-wrap gap-2'>
                    <Link
                      className='rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white'
                      href={`/wedstrijd/${nextGame.game.id}`}
                    >
                      Open wedstrijd
                    </Link>
                    <Link
                      className='rounded-lg border border-black/15 px-3 py-2 text-sm font-semibold'
                      href={`/wedstrijd/${nextGame.game.id}/lineup`}
                    >
                      Open line-up
                    </Link>
                    <Link
                      className='rounded-lg border border-black/15 px-3 py-2 text-sm font-semibold'
                      href={`/wedstrijd/${nextGame.game.id}/score`}
                    >
                      Live scoresheet
                    </Link>
                  </div>
                ) : (
                  <Link
                    className='inline-flex rounded-lg border border-black/15 px-3 py-2 text-sm font-semibold'
                    href={`/agenda/${nextGame.event.id}`}
                  >
                    Open activiteit
                  </Link>
                )}

                <div className='rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm'>
                  <p className='font-semibold text-amber-900'>Aandacht</p>
                  {alerts.length ? (
                    <ul className='mt-1 grid gap-1 text-amber-950'>
                      {alerts.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className='mt-1 text-amber-900'>
                      Geen directe actie nodig. Je bent game-ready.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className='mt-3 space-y-3'>
                <p className='text-sm text-black/70'>
                  Geen aankomende wedstrijd gevonden.
                </p>
                <div className='rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm'>
                  <p className='font-semibold text-amber-900'>Aandacht</p>
                  {alerts.length ? (
                    <ul className='mt-1 grid gap-1 text-amber-950'>
                      {alerts.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className='mt-1 text-amber-900'>
                      Geen directe actie nodig. Je bent game-ready.
                    </p>
                  )}
                </div>
              </div>
            )}
          </article>
        </div>

        <article className='mb-4 rounded-2xl border border-black/10 bg-card p-5 shadow-sm'>
          <div className='flex items-center justify-between gap-3'>
            <div>
              <h2 className='text-xl font-bold'>Activiteiten tijdlijn</h2>
              <p className='mt-1 text-sm text-black/70'>
                Aankomende trainingen en wedstrijden die nog niet gespeeld zijn.
              </p>
            </div>

            {totalActivityPages > 1 ? (
              <div className='flex items-center gap-2'>
                <button
                  aria-label='Vorige activiteit'
                  className='inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/15 bg-white text-lg font-bold disabled:opacity-40'
                  disabled={safeActivitySlide === 0}
                  onClick={() =>
                    setActivitySlide((current) => Math.max(0, current - 1))
                  }
                  type='button'
                >
                  ‹
                </button>
                <button
                  aria-label='Volgende activiteit'
                  className='inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/15 bg-white text-lg font-bold disabled:opacity-40'
                  disabled={safeActivitySlide >= totalActivityPages - 1}
                  onClick={() =>
                    setActivitySlide((current) =>
                      Math.min(totalActivityPages - 1, current + 1),
                    )
                  }
                  type='button'
                >
                  ›
                </button>
              </div>
            ) : null}
          </div>

          {activityPages.length ? (
            <div className='mt-4'>
              <div className='overflow-hidden'>
                <div
                  className='flex transition-transform duration-500 ease-out'
                  style={{
                    transform: `translateX(-${safeActivitySlide * 100}%)`,
                  }}
                >
                  {activityPages.map((page, pageIndex) => (
                    <div key={pageIndex} className='w-full flex-none'>
                      <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-3'>
                        {page.map((activity) => {
                          const game = getEventGame({ games }, activity.id);
                          const presentCount = attendance.filter(
                            (entry) =>
                              entry.eventId === activity.id &&
                              entry.status === 'aanwezig',
                          ).length;
                          const absentCount = attendance.filter(
                            (entry) =>
                              entry.eventId === activity.id &&
                              entry.status === 'afwezig',
                          ).length;

                          return (
                            <div
                              key={activity.id}
                              className='rounded-xl border border-black/10 bg-white p-4'
                            >
                              <p className='text-xs uppercase tracking-wide text-black/60'>
                                {activity.type}
                              </p>
                              <p className='text-lg font-semibold'>
                                {format(
                                  new Date(activity.date),
                                  'EEEE d MMMM',
                                  {
                                    locale: nl,
                                  },
                                )}
                              </p>
                              <p className='text-sm text-black/70'>
                                {activity.time ?? 'Tijd onbekend'} ·{' '}
                                {activity.location ?? 'Locatie onbekend'}
                              </p>
                              <p className='mt-1 text-sm text-black/70'>
                                {activity.opponent
                                  ? `vs ${activity.opponent}`
                                  : 'Tegenstander onbekend'}
                              </p>
                              <p className='mt-1 text-sm text-black/70'>
                                Aanwezig: {presentCount} · Afwezig:{' '}
                                {absentCount}
                              </p>
                              <div className='mt-3 flex flex-wrap gap-2'>
                                <Link
                                  className='rounded-lg border border-black/15 px-3 py-1.5 text-sm font-semibold hover:bg-muted'
                                  href={`/agenda/${activity.id}`}
                                >
                                  Open in agenda
                                </Link>
                                {game ? (
                                  <Link
                                    className='rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white'
                                    href={`/wedstrijd/${game.id}`}
                                  >
                                    Open wedstrijd
                                  </Link>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {totalActivityPages > 1 ? (
                <div className='mt-3 flex items-center justify-center gap-2'>
                  {activityPages.map((_, index) => (
                    <button
                      key={index}
                      aria-label={`Ga naar activiteit pagina ${index + 1}`}
                      className={`h-2.5 w-2.5 rounded-full ${
                        safeActivitySlide === index
                          ? 'bg-accent'
                          : 'bg-black/20'
                      }`}
                      onClick={() => setActivitySlide(index)}
                      type='button'
                    />
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <p className='mt-4 text-sm text-black/70'>
              Geen openstaande trainingen of wedstrijden in de tijdlijn.
            </p>
          )}
        </article>

        <div className='mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
          <article className='rounded-2xl border border-black/10 bg-card p-4'>
            <p className='text-xs uppercase text-black/60'>Record</p>
            <p className='mt-1 text-2xl font-bold'>
              {seasonSummary.wins}-{seasonSummary.losses}-{seasonSummary.ties}
            </p>
            <p className='text-sm text-black/70'>
              {seasonSummary.games} gespeeld
            </p>
          </article>
          <article className='rounded-2xl border border-black/10 bg-card p-4'>
            <p className='text-xs uppercase text-black/60'>Runs</p>
            <p className='mt-1 text-2xl font-bold'>
              {seasonSummary.runsFor} - {seasonSummary.runsAgainst}
            </p>
            <p className='text-sm text-black/70'>For - Against</p>
          </article>
          <article className='rounded-2xl border border-black/10 bg-card p-4'>
            <p className='text-xs uppercase text-black/60'>Team hits</p>
            <p className='mt-1 text-2xl font-bold'>{seasonSummary.hits}</p>
            <p className='text-sm text-black/70'>Alle actieve plays</p>
          </article>
          <article className='rounded-2xl border border-black/10 bg-card p-4'>
            <p className='text-xs uppercase text-black/60'>Defensive errors</p>
            <p className='mt-1 text-2xl font-bold'>{seasonSummary.errors}</p>
            <p className='text-sm text-black/70'>Team fielding</p>
          </article>
        </div>
      </section>

      <Modal
        open={showTeamModal}
        title='Team aanmaken'
        onClose={() => setShowTeamModal(false)}
      >
        <form
          className='grid gap-3'
          onSubmit={(event) => {
            event.preventDefault();
            if (!name.trim() || !season.trim()) return;
            createTeam(name.trim(), season.trim());
            setName('');
            setShowTeamModal(false);
          }}
        >
          <input
            className='rounded-xl border border-black/15 bg-white px-3 py-2'
            placeholder='Teamnaam'
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <input
            className='rounded-xl border border-black/15 bg-white px-3 py-2'
            placeholder='Seizoen'
            value={season}
            onChange={(event) => setSeason(event.target.value)}
          />
          <button
            className='rounded-xl bg-accent px-4 py-2 font-semibold text-white hover:opacity-90'
            type='submit'
          >
            Opslaan
          </button>
        </form>
      </Modal>
    </AppShell>
  );
}
