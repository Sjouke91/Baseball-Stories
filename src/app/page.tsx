'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { AppShell } from '@/components/AppShell';
import { getEventGame, isMatchEventType, sortedEvents } from '@/lib/selectors';
import { useActiveTeam, useAppStore } from '@/stores/useAppStore';

export default function HomePage() {
  const team = useActiveTeam();
  const events = useAppStore((state) => state.events);
  const games = useAppStore((state) => state.games);
  const createTeam = useAppStore((state) => state.createTeam);

  const [name, setName] = useState('');
  const [season, setSeason] = useState(String(new Date().getFullYear()));

  const upcomingMatches = useMemo(() => {
    const list = sortedEvents({ events });
    return list.filter((event) => {
      if (event.teamId !== team?.id) return false;
      if (!isMatchEventType(event.type)) return false;
      const game = getEventGame({ games }, event.id);
      return game?.status !== 'klaar';
    });
  }, [events, games, team?.id]);

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
          <h2 className='text-xl font-bold'>Wedstrijd tijdlijn</h2>
          <p className='mt-1 text-sm text-black/70'>
            Alleen wedstrijden die nog niet gespeeld zijn.
          </p>
          {upcomingMatches.length ? (
            <div className='mt-4 grid gap-2'>
              {upcomingMatches.map((event) => {
                const game = getEventGame({ games }, event.id);

                return (
                  <div
                    key={event.id}
                    className='rounded-xl border border-black/10 bg-white p-4'
                  >
                    <p className='text-xs uppercase tracking-wide text-black/60'>
                      {event.type}
                    </p>
                    <p className='text-lg font-semibold'>
                      {format(new Date(event.date), 'EEEE d MMMM', {
                        locale: nl,
                      })}
                    </p>
                    <p className='text-sm text-black/70'>
                      {event.time ?? 'Tijd onbekend'} ·{' '}
                      {event.location ?? 'Locatie onbekend'}
                    </p>
                    <p className='mt-1 text-sm text-black/70'>
                      {event.opponent ? `vs ${event.opponent}` : 'Tegenstander onbekend'}
                    </p>
                    <div className='mt-3 flex flex-wrap gap-2'>
                      <Link
                        className='rounded-lg border border-black/15 px-3 py-1.5 text-sm font-semibold hover:bg-muted'
                        href={`/agenda/${event.id}`}
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
          ) : (
            <p className='mt-4 text-sm text-black/70'>
              Geen openstaande wedstrijden in de tijdlijn.
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
