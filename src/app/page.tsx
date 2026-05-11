'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { AppShell } from '@/components/AppShell';
import { sortedEvents } from '@/lib/selectors';
import { useActiveTeam, useAppStore } from '@/stores/useAppStore';

export default function HomePage() {
  const team = useActiveTeam();
  const events = useAppStore((state) => state.events);
  const createTeam = useAppStore((state) => state.createTeam);

  const [name, setName] = useState('');
  const [season, setSeason] = useState(String(new Date().getFullYear()));

  const upcoming = useMemo(() => {
    const list = sortedEvents({ events });
    return list.find((event) => new Date(event.date) >= new Date());
  }, [events]);

  return (
    <AppShell title='Dashboard'>
      <section className='grid gap-4 md:grid-cols-2'>
        <article className='rounded-2xl border border-black/10 bg-card p-5 shadow-sm'>
          <h2 className='text-xl font-bold'>Team setup</h2>
          <p className='mt-1 text-sm text-black/70'>
            Maak of beheer je actieve team. Dit MVP ondersteunt 1 team.
          </p>
          {team ? (
            <div className='mt-4 rounded-xl bg-muted p-4 text-sm'>
              <p className='font-semibold'>{team.name}</p>
              <p className='text-black/70'>Seizoen: {team.season}</p>
            </div>
          ) : (
            <form
              className='mt-4 grid gap-3'
              onSubmit={(event) => {
                event.preventDefault();
                if (!name.trim() || !season.trim()) return;
                createTeam(name.trim(), season.trim());
                setName('');
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
                Team aanmaken
              </button>
            </form>
          )}
        </article>

        <article className='rounded-2xl border border-black/10 bg-card p-5 shadow-sm'>
          <h2 className='text-xl font-bold'>Volgende activiteit</h2>
          {upcoming ? (
            <div className='mt-4 rounded-xl bg-white p-4'>
              <p className='text-sm uppercase tracking-wide text-black/60'>
                {upcoming.type}
              </p>
              <p className='text-lg font-semibold'>
                {format(new Date(upcoming.date), 'EEEE d MMMM', { locale: nl })}
              </p>
              <p className='text-sm text-black/70'>
                {upcoming.time ?? 'Tijd onbekend'} ·{' '}
                {upcoming.location ?? 'Locatie onbekend'}
              </p>
              <Link
                className='mt-3 inline-block rounded-lg border border-black/15 px-3 py-1.5 text-sm font-semibold hover:bg-muted'
                href={`/agenda/${upcoming.id}`}
              >
                Open activiteit
              </Link>
            </div>
          ) : (
            <p className='mt-4 text-sm text-black/70'>
              Nog geen activiteiten ingepland.
            </p>
          )}
          <div className='mt-4 flex flex-wrap gap-2'>
            <Link
              className='rounded-lg bg-accent-2 px-3 py-2 text-sm font-semibold text-white'
              href='/spelers'
            >
              Spelers beheren
            </Link>
            <Link
              className='rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white'
              href='/agenda'
            >
              Agenda bijwerken
            </Link>
          </div>
        </article>
      </section>
    </AppShell>
  );
}
