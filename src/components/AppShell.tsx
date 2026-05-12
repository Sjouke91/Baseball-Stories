'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Modal } from '@/components/Modal';
import { useSupabaseSnapshotSync } from '@/hooks/useSupabaseSnapshotSync';
import { syncIndicator } from '@/lib/selectors';
import { useActiveTeam, useAppStore } from '@/stores/useAppStore';

const syncColor: Record<'synced' | 'pending' | 'offline', string> = {
  synced: 'bg-accent-2',
  pending: 'bg-warning',
  offline: 'bg-zinc-400',
};

const syncLabel: Record<'synced' | 'pending' | 'offline', string> = {
  synced: 'synced',
  pending: 'pending',
  offline: 'offline',
};

export function AppShell({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  useSupabaseSnapshotSync();

  const team = useActiveTeam();
  const teams = useAppStore((state) => state.teams);
  const activeTeamId = useAppStore((state) => state.activeTeamId);
  const setActiveTeam = useAppStore((state) => state.setActiveTeam);
  const updateTeam = useAppStore((state) => state.updateTeam);
  const players = useAppStore((state) => state.players);
  const events = useAppStore((state) => state.events);
  const online = useAppStore((state) => state.online);
  const setOnline = useAppStore((state) => state.setOnline);
  const flushPendingSync = useAppStore((state) => state.flushPendingSync);
  const plays = useAppStore((state) => state.plays);
  const indicator = syncIndicator(plays, online);
  const [showTeamSettings, setShowTeamSettings] = useState(false);
  const [settingsStatus, setSettingsStatus] = useState('');

  const activeTeamStats = useMemo(() => {
    if (!team) {
      return {
        playerCount: 0,
        eventCount: 0,
      };
    }

    return {
      playerCount: players.filter((player) => player.teamId === team.id).length,
      eventCount: events.filter((event) => event.teamId === team.id).length,
    };
  }, [events, players, team]);

  const handleSaveTeam = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!team) return;

    const formData = new FormData(event.currentTarget);
    const teamName = String(formData.get('teamName') ?? '').trim();
    const season = String(formData.get('season') ?? '').trim();
    if (!teamName || !season) return;

    updateTeam(team.id, {
      name: teamName,
      season,
    });
    setSettingsStatus('Teaminstellingen opgeslagen.');
  };

  useEffect(() => {
    const onOnline = () => {
      setOnline(true);
      flushPendingSync();
    };
    const onOffline = () => setOnline(false);

    setOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [flushPendingSync, setOnline]);

  return (
    <div className='min-h-screen'>
      <header className='sticky top-0 z-10 border-b border-white/15 bg-linear-to-r from-slate-950 via-slate-900 to-blue-950 text-white shadow-xl backdrop-blur-md'>
        <div className='mx-auto flex w-full max-w-6xl flex-wrap items-center gap-3 px-4 py-3'>
          <div>
            <p className='text-xs uppercase tracking-[0.24em] text-amber-200/80'>
              Baseball Stories
            </p>
            <h1 className='text-2xl font-bold leading-tight'>{title}</h1>
          </div>
          <div className='ml-auto flex items-center gap-3'>
            <button
              className='rounded-full border border-amber-100/35 bg-white/10 px-3 py-1 text-sm font-semibold text-white hover:-translate-y-0.5 hover:bg-white/20'
              onClick={() => {
                setShowTeamSettings(true);
                setSettingsStatus('');
              }}
              type='button'
            >
              {team ? `${team.name} (${team.season})` : 'Maak eerst een team'}
            </button>
            <div className='flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white'>
              <span
                className={`h-2.5 w-2.5 rounded-full ${syncColor[indicator]}`}
              />
              <span>{syncLabel[indicator]}</span>
            </div>
          </div>
          <nav className='flex w-full flex-wrap gap-2 text-sm font-medium'>
            <Link
              className='rounded-full border border-white/20 bg-white/10 px-3 py-1.5 font-semibold text-white hover:-translate-y-0.5 hover:bg-white/20'
              href='/'
            >
              Dashboard
            </Link>
            <Link
              className='rounded-full border border-white/20 bg-white/10 px-3 py-1.5 font-semibold text-white hover:-translate-y-0.5 hover:bg-white/20'
              href='/spelers'
            >
              Spelers
            </Link>
            <Link
              className='rounded-full border border-white/20 bg-white/10 px-3 py-1.5 font-semibold text-white hover:-translate-y-0.5 hover:bg-white/20'
              href='/agenda'
            >
              Agenda
            </Link>
          </nav>
        </div>
      </header>
      <main className='mx-auto w-full max-w-6xl px-4 py-6'>{children}</main>

      <Modal
        open={showTeamSettings}
        title='Team instellingen'
        onClose={() => setShowTeamSettings(false)}
      >
        <div className='grid gap-4'>
          <div className='grid gap-2'>
            <label
              className='text-sm font-semibold'
              htmlFor='team-settings-select'
            >
              Actief team
            </label>
            <select
              id='team-settings-select'
              className='rounded-lg border border-black/15 bg-white px-3 py-2'
              value={activeTeamId ?? ''}
              onChange={(event) => setActiveTeam(event.target.value)}
            >
              {teams.length === 0 ? (
                <option value=''>Geen teams beschikbaar</option>
              ) : null}
              {teams.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name} ({entry.season})
                </option>
              ))}
            </select>
          </div>

          {team ? (
            <form
              key={team.id}
              className='grid gap-2'
              onSubmit={handleSaveTeam}
            >
              <input
                className='rounded-lg border border-black/15 bg-white px-3 py-2'
                defaultValue={team.name}
                name='teamName'
                placeholder='Teamnaam'
              />
              <input
                className='rounded-lg border border-black/15 bg-white px-3 py-2'
                defaultValue={team.season}
                name='season'
                placeholder='Seizoen'
              />
              <button
                className='rounded-lg bg-accent px-3 py-2 font-semibold text-white'
                type='submit'
              >
                Team opslaan
              </button>
            </form>
          ) : (
            <p className='text-sm text-black/70'>Maak eerst een team aan.</p>
          )}

          <div className='rounded-lg border border-black/10 bg-muted p-3 text-sm text-black/70'>
            Spelers: {activeTeamStats.playerCount} · Activiteiten:{' '}
            {activeTeamStats.eventCount}
          </div>

          {settingsStatus ? (
            <p className='rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800'>
              {settingsStatus}
            </p>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}
