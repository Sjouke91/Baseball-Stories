'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { AppShell } from '@/components/AppShell';
import { Modal } from '@/components/Modal';
import { getEventGame, isMatchEventType, sortedEvents } from '@/lib/selectors';
import { useActiveTeam, useAppStore } from '@/stores/useAppStore';
import type { EventType } from '@/types/models';

const eventTypes: EventType[] = [
  'training',
  'wedstrijd',
  'oefenwedstrijd',
  'toernooi',
  'teamactiviteit',
];

export default function AgendaPage() {
  const team = useActiveTeam();
  const events = useAppStore((state) => state.events);
  const games = useAppStore((state) => state.games);
  const addEvent = useAppStore((state) => state.addEvent);
  const deleteMatch = useAppStore((state) => state.deleteMatch);

  const [type, setType] = useState<EventType>('training');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [opponent, setOpponent] = useState('');
  const [notes, setNotes] = useState('');
  const [activityTypeFilter, setActivityTypeFilter] = useState<
    'all' | 'matches' | 'trainings'
  >('all');
  const [matchFilter, setMatchFilter] = useState<
    'all' | 'played' | 'not-played'
  >('all');
  const [toastMessage, setToastMessage] = useState('');
  const [showEventModal, setShowEventModal] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!toastMessage) return;

    const timeoutId = window.setTimeout(() => {
      setToastMessage('');
    }, 2500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [toastMessage]);

  const ordered = useMemo(() => sortedEvents({ events }), [events]);
  const activityTimeline = useMemo(() => {
    return ordered
      .filter((event) => event.teamId === team?.id)
      .filter(
        (event) => isMatchEventType(event.type) || event.type === 'training',
      )
      .map((event) => {
        const game = getEventGame({ games }, event.id);
        const isMatch = isMatchEventType(event.type);
        return {
          event,
          game,
          isMatch,
          played: isMatch ? game?.status === 'klaar' : false,
        };
      });
  }, [games, ordered, team?.id]);

  const filteredActivityTimeline = useMemo(() => {
    const filteredByType = activityTimeline.filter((entry) => {
      if (activityTypeFilter === 'matches') return entry.isMatch;
      if (activityTypeFilter === 'trainings') return !entry.isMatch;
      return true;
    });

    if (matchFilter === 'played') {
      return filteredByType.filter((entry) => entry.isMatch && entry.played);
    }
    if (matchFilter === 'not-played') {
      return filteredByType.filter((entry) => entry.isMatch && !entry.played);
    }
    return filteredByType;
  }, [activityTypeFilter, matchFilter, activityTimeline]);

  const pageSize = 5;
  const totalItems = filteredActivityTimeline.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);

  const paginatedActivities = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    const end = start + pageSize;
    return filteredActivityTimeline.slice(start, end);
  }, [filteredActivityTimeline, safePage]);

  const matchStatusFilterDisabled = activityTypeFilter === 'trainings';

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!team || !date) return;
    addEvent({
      type,
      date,
      time: time || undefined,
      location: location || undefined,
      opponent: opponent || undefined,
      notes: notes || undefined,
    });
    setDate('');
    setTime('');
    setLocation('');
    setOpponent('');
    setNotes('');
    setShowEventModal(false);
  };

  return (
    <AppShell title='Agenda'>
      {toastMessage ? (
        <div className='mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800'>
          {toastMessage}
        </div>
      ) : null}
      <section className='mb-4 flex items-center justify-between gap-3 rounded-2xl border border-black/10 bg-card p-4'>
        <div>
          <h2 className='text-lg font-bold'>Activiteiten</h2>
          <p className='text-sm text-black/70'>
            Beheer de tijdlijn en voeg snel een nieuwe activiteit toe.
          </p>
        </div>
        <button
          className='inline-flex items-center gap-2 rounded-lg bg-accent px-3 py-2 font-semibold text-white'
          onClick={() => setShowEventModal(true)}
          type='button'
        >
          <span aria-hidden='true' className='text-lg leading-none'>
            +
          </span>
          <span>Nieuwe activiteit</span>
        </button>
      </section>

      <section>
        <article className='rounded-2xl border border-black/10 bg-card p-4'>
          <div className='flex flex-wrap items-end justify-between gap-3'>
            <h2 className='text-lg font-bold'>Activiteiten tijdlijn</h2>
            <div className='flex items-end gap-2'>
              <div className='grid gap-1'>
                <label
                  className='text-xs font-semibold uppercase tracking-wide text-black/60'
                  htmlFor='activity-type-filter'
                >
                  Type
                </label>
                <select
                  id='activity-type-filter'
                  className='h-9 w-40 rounded-lg border border-black/15 bg-white px-2 py-1 text-sm font-semibold'
                  value={activityTypeFilter}
                  onChange={(event) => {
                    const next = event.target.value as
                      | 'all'
                      | 'matches'
                      | 'trainings';
                    setActivityTypeFilter(next);
                    setPage(1);
                    if (next === 'trainings') {
                      setMatchFilter('all');
                    }
                  }}
                >
                  <option value='all'>Alles</option>
                  <option value='matches'>Wedstrijden</option>
                  <option value='trainings'>Trainingen</option>
                </select>
              </div>

              <div className='grid gap-1'>
                <label
                  className='text-xs font-semibold uppercase tracking-wide text-black/60'
                  htmlFor='match-status-filter'
                >
                  Status
                </label>
                <select
                  id='match-status-filter'
                  className={`h-9 w-40 rounded-lg border border-black/15 bg-white px-2 py-1 text-sm font-semibold ${
                    matchStatusFilterDisabled
                      ? 'cursor-not-allowed opacity-50'
                      : ''
                  }`}
                  disabled={matchStatusFilterDisabled}
                  value={matchFilter}
                  onChange={(event) => {
                    setMatchFilter(
                      event.target.value as 'all' | 'played' | 'not-played',
                    );
                    setPage(1);
                  }}
                >
                  <option value='all'>Alles</option>
                  <option value='not-played'>Niet gespeeld</option>
                  <option value='played'>Gespeeld</option>
                </select>
              </div>
            </div>
          </div>
          {matchStatusFilterDisabled ? (
            <p className='mt-2 text-xs text-black/60'>
              Statusfilter is alleen van toepassing op wedstrijden.
            </p>
          ) : null}

          {totalItems > 0 ? (
            <div className='mt-2 flex items-center justify-between text-xs text-black/60'>
              <p>
                Toon {(safePage - 1) * pageSize + 1}-
                {Math.min(safePage * pageSize, totalItems)} van {totalItems}
              </p>
              <p>
                Pagina {safePage} / {totalPages}
              </p>
            </div>
          ) : null}

          <div className='mt-3 grid gap-2'>
            {totalItems === 0 ? (
              <p className='text-sm text-black/70'>
                Geen activiteiten voor dit filter.
              </p>
            ) : (
              paginatedActivities.map(({ event, game, played, isMatch }) => (
                <div
                  key={event.id}
                  className='rounded-lg border border-black/10 bg-white p-3'
                >
                  <div className='flex items-start justify-between gap-3'>
                    <div>
                      <p className='text-xs uppercase tracking-wide text-black/60'>
                        {event.type}
                      </p>
                      <p className='font-semibold'>
                        {format(new Date(event.date), 'EEEE d MMMM', {
                          locale: nl,
                        })}
                      </p>
                      <p className='text-sm text-black/70'>
                        {event.time ?? 'Tijd onbekend'} ·{' '}
                        {event.location ?? 'Locatie onbekend'}
                      </p>
                      <p className='mt-1 text-sm text-black/70'>
                        {event.opponent
                          ? `vs ${event.opponent}`
                          : 'Tegenstander onbekend'}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        played
                          ? 'bg-black/10 text-black/70'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {isMatch
                        ? played
                          ? 'gespeeld'
                          : 'niet gespeeld'
                        : 'training'}
                    </span>
                  </div>
                  <div className='mt-3 flex flex-wrap gap-2'>
                    <Link
                      className='rounded-lg border border-black/15 px-3 py-1.5 text-sm font-semibold hover:bg-muted'
                      href={`/agenda/${event.id}`}
                    >
                      Open activiteit
                    </Link>
                    {game ? (
                      <Link
                        className='rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white'
                        href={`/wedstrijd/${game.id}`}
                      >
                        Open wedstrijd
                      </Link>
                    ) : null}
                    <button
                      className='rounded-lg border border-red-300 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50'
                      onClick={() => {
                        if (
                          typeof window !== 'undefined' &&
                          !window.confirm(
                            'Weet je zeker dat je deze activiteit wilt verwijderen?',
                          )
                        ) {
                          return;
                        }
                        deleteMatch(event.id);
                        setToastMessage('Activiteit verwijderd.');
                      }}
                      type='button'
                    >
                      Verwijderen
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {totalItems > pageSize ? (
            <div className='mt-4 flex items-center justify-end gap-2'>
              <button
                className='rounded-lg border border-black/15 bg-white px-3 py-1.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50'
                disabled={safePage <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                type='button'
              >
                Vorige
              </button>
              {Array.from({ length: totalPages }).map((_, index) => {
                const pageNumber = index + 1;
                return (
                  <button
                    key={pageNumber}
                    className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                      safePage === pageNumber
                        ? 'bg-accent text-white'
                        : 'border border-black/15 bg-white'
                    }`}
                    onClick={() => setPage(pageNumber)}
                    type='button'
                  >
                    {pageNumber}
                  </button>
                );
              })}
              <button
                className='rounded-lg border border-black/15 bg-white px-3 py-1.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50'
                disabled={safePage >= totalPages}
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
                type='button'
              >
                Volgende
              </button>
            </div>
          ) : null}
        </article>
      </section>

      <Modal
        open={showEventModal}
        title='Activiteit toevoegen'
        onClose={() => setShowEventModal(false)}
      >
        <form className='grid gap-2' onSubmit={onSubmit}>
          <select
            className='rounded-lg border border-black/15 bg-white px-3 py-2'
            value={type}
            onChange={(event) => setType(event.target.value as EventType)}
          >
            {eventTypes.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
          <input
            className='rounded-lg border border-black/15 bg-white px-3 py-2'
            type='date'
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
          <input
            className='rounded-lg border border-black/15 bg-white px-3 py-2'
            type='time'
            value={time}
            onChange={(event) => setTime(event.target.value)}
          />
          <input
            className='rounded-lg border border-black/15 bg-white px-3 py-2'
            placeholder='Locatie'
            value={location}
            onChange={(event) => setLocation(event.target.value)}
          />
          <input
            className='rounded-lg border border-black/15 bg-white px-3 py-2'
            placeholder='Tegenstander (bij wedstrijd)'
            value={opponent}
            onChange={(event) => setOpponent(event.target.value)}
          />
          <textarea
            className='rounded-lg border border-black/15 bg-white px-3 py-2'
            placeholder='Notities'
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
          <button
            className='rounded-lg bg-accent px-3 py-2 font-semibold text-white'
            type='submit'
          >
            Toevoegen
          </button>
        </form>
      </Modal>
    </AppShell>
  );
}
