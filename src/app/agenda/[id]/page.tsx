'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { useAppStore } from '@/stores/useAppStore';
import type { AttendanceStatus } from '@/types/models';

const statuses: AttendanceStatus[] = [
  'aanwezig',
  'afwezig',
  'misschien',
  'geen_reactie',
];

export default function AgendaDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const events = useAppStore((state) => state.events);
  const players = useAppStore((state) => state.players);
  const attendance = useAppStore((state) => state.attendance);
  const games = useAppStore((state) => state.games);
  const setAttendanceStatus = useAppStore((state) => state.setAttendanceStatus);
  const ensureGameForEvent = useAppStore((state) => state.ensureGameForEvent);

  const event = events.find((entry) => entry.id === id);

  const gameId = useMemo(() => {
    if (!event || !event.type.includes('wedstrijd')) return undefined;
    const existing = games.find((game) => game.eventId === event.id);
    return existing?.id ?? ensureGameForEvent(event.id, 'thuis');
  }, [ensureGameForEvent, event, games]);

  if (!event) {
    return (
      <AppShell title='Activiteit-detail'>
        <p>Activiteit niet gevonden.</p>
      </AppShell>
    );
  }

  const teamPlayers = players.filter(
    (player) => player.teamId === event.teamId,
  );

  return (
    <AppShell title='Activiteit-detail'>
      <section className='rounded-2xl border border-black/10 bg-card p-4'>
        <p className='text-xs uppercase tracking-wide text-black/60'>
          {event.type}
        </p>
        <h2 className='text-2xl font-bold'>
          {event.opponent ? `vs ${event.opponent}` : 'Team activiteit'}
        </h2>
        <p className='mt-1 text-sm text-black/70'>
          {event.date} {event.time ? `· ${event.time}` : ''}{' '}
          {event.location ? `· ${event.location}` : ''}
        </p>
        {gameId ? (
          <div className='mt-3 flex flex-wrap gap-2'>
            <Link
              className='rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white'
              href={`/wedstrijd/${gameId}`}
            >
              Naar wedstrijd-detail
            </Link>
            <Link
              className='rounded-lg border border-black/15 bg-white px-3 py-2 text-sm font-semibold'
              href={`/wedstrijd/${gameId}/lineup`}
            >
              Line-up
            </Link>
            <Link
              className='rounded-lg border border-black/15 bg-white px-3 py-2 text-sm font-semibold'
              href={`/wedstrijd/${gameId}/score`}
            >
              Live scoresheet
            </Link>
          </div>
        ) : null}
      </section>

      <section className='mt-4 rounded-2xl border border-black/10 bg-card p-4'>
        <h3 className='text-lg font-bold'>Aanwezigheid invullen</h3>
        <div className='mt-3 grid gap-2'>
          {teamPlayers.map((player) => {
            const status =
              attendance.find(
                (row) => row.playerId === player.id && row.eventId === event.id,
              )?.status ?? 'geen_reactie';
            return (
              <div
                key={player.id}
                className='flex flex-wrap items-center gap-2 rounded-lg bg-white p-3'
              >
                <p className='font-medium'>{player.name}</p>
                <div className='ml-auto flex flex-wrap gap-1'>
                  {statuses.map((candidate) => (
                    <button
                      key={candidate}
                      className={`rounded-md px-2 py-1 text-xs font-semibold ${
                        candidate === status
                          ? 'bg-accent text-white'
                          : 'border border-black/15'
                      }`}
                      onClick={() =>
                        setAttendanceStatus(event.id, player.id, candidate)
                      }
                      type='button'
                    >
                      {candidate}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </AppShell>
  );
}
