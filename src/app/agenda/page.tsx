'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { AppShell } from '@/components/AppShell';
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
  const [matchFilter, setMatchFilter] = useState<
    'all' | 'played' | 'not-played'
  >('all');
  const [toastMessage, setToastMessage] = useState('');

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
  const matchTimeline = useMemo(() => {
    return ordered
      .filter((event) => event.teamId === team?.id)
      .filter((event) => isMatchEventType(event.type))
      .map((event) => {
        const game = getEventGame({ games }, event.id);
        return {
          event,
          game,
          played: game?.status === 'klaar',
        };
      });
  }, [games, ordered, team?.id]);

  const filteredMatchTimeline = useMemo(() => {
    if (matchFilter === 'played') {
      return matchTimeline.filter((entry) => entry.played);
    }
    if (matchFilter === 'not-played') {
      return matchTimeline.filter((entry) => !entry.played);
    }
    return matchTimeline;
  }, [matchFilter, matchTimeline]);

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
  };

  return (
    <AppShell title='Agenda'>
      {toastMessage ? (
        <div className='mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800'>
          {toastMessage}
        </div>
      ) : null}
      <section className='grid gap-4 md:grid-cols-[320px_1fr]'>
        <article className='rounded-2xl border border-black/10 bg-card p-4'>
          <h2 className='text-lg font-bold'>Activiteit toevoegen</h2>
          <form className='mt-3 grid gap-2' onSubmit={onSubmit}>
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
        </article>

        <article className='rounded-2xl border border-black/10 bg-card p-4'>
          <h2 className='text-lg font-bold'>Wedstrijd tijdlijn</h2>
          <div className='mt-3 flex flex-wrap gap-2'>
            <button
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                matchFilter === 'all'
                  ? 'bg-accent text-white'
                  : 'border border-black/15 bg-white'
              }`}
              onClick={() => setMatchFilter('all')}
              type='button'
            >
              Alles
            </button>
            <button
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                matchFilter === 'not-played'
                  ? 'bg-accent text-white'
                  : 'border border-black/15 bg-white'
              }`}
              onClick={() => setMatchFilter('not-played')}
              type='button'
            >
              Niet gespeeld
            </button>
            <button
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                matchFilter === 'played'
                  ? 'bg-accent text-white'
                  : 'border border-black/15 bg-white'
              }`}
              onClick={() => setMatchFilter('played')}
              type='button'
            >
              Gespeeld
            </button>
          </div>
          <div className='mt-3 grid gap-2'>
            {filteredMatchTimeline.length === 0 ? (
              <p className='text-sm text-black/70'>
                Geen wedstrijden voor dit filter.
              </p>
            ) : (
              filteredMatchTimeline.map(({ event, game, played }) => (
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
                      {played ? 'gespeeld' : 'niet gespeeld'}
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
                            'Weet je zeker dat je deze wedstrijd wilt verwijderen?',
                          )
                        ) {
                          return;
                        }
                        deleteMatch(event.id);
                        setToastMessage('Wedstrijd verwijderd.');
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
        </article>
      </section>
    </AppShell>
  );
}
