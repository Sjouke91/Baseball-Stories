'use client';

import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { AppShell } from '@/components/AppShell';
import { sortedEvents } from '@/lib/selectors';
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
  const addEvent = useAppStore((state) => state.addEvent);

  const [type, setType] = useState<EventType>('training');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [opponent, setOpponent] = useState('');
  const [notes, setNotes] = useState('');

  const ordered = useMemo(() => sortedEvents({ events }), [events]);
  const teamEvents = ordered.filter((event) => event.teamId === team?.id);

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
          <h2 className='text-lg font-bold'>Tijdlijn</h2>
          <div className='mt-3 grid gap-2'>
            {teamEvents.length === 0 ? (
              <p className='text-sm text-black/70'>
                Nog geen activiteiten gepland.
              </p>
            ) : (
              teamEvents.map((event) => (
                <Link
                  key={event.id}
                  className='rounded-lg border border-black/10 bg-white p-3 hover:bg-muted'
                  href={`/agenda/${event.id}`}
                >
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
                </Link>
              ))
            )}
          </div>
        </article>
      </section>
    </AppShell>
  );
}
