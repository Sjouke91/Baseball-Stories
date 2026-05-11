'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { useActiveTeam, useAppStore } from '@/stores/useAppStore';

export default function PlayersPage() {
  const team = useActiveTeam();
  const players = useAppStore((state) => state.players);
  const addPlayer = useAppStore((state) => state.addPlayer);
  const setPlayerActive = useAppStore((state) => state.setPlayerActive);

  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [positions, setPositions] = useState('');

  const teamPlayers = players.filter((player) => player.teamId === team?.id);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!team || !name.trim()) return;
    addPlayer({
      name: name.trim(),
      number: number ? Number(number) : undefined,
      positions: positions
        .split(',')
        .map((entry) => entry.trim().toUpperCase())
        .filter(Boolean),
    });
    setName('');
    setNumber('');
    setPositions('');
  };

  return (
    <AppShell title='Spelers'>
      <section className='grid gap-4 md:grid-cols-[320px_1fr]'>
        <article className='rounded-2xl border border-black/10 bg-card p-4'>
          <h2 className='text-lg font-bold'>Speler toevoegen</h2>
          <form className='mt-3 grid gap-2' onSubmit={onSubmit}>
            <input
              className='rounded-lg border border-black/15 bg-white px-3 py-2'
              placeholder='Naam'
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <input
              className='rounded-lg border border-black/15 bg-white px-3 py-2'
              placeholder='Nummer'
              type='number'
              value={number}
              onChange={(event) => setNumber(event.target.value)}
            />
            <input
              className='rounded-lg border border-black/15 bg-white px-3 py-2'
              placeholder='Posities (SS,2B,CF)'
              value={positions}
              onChange={(event) => setPositions(event.target.value)}
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
          <h2 className='text-lg font-bold'>Spelerslijst</h2>
          <div className='mt-3 grid gap-2'>
            {teamPlayers.length === 0 ? (
              <p className='text-sm text-black/70'>
                Nog geen spelers toegevoegd.
              </p>
            ) : (
              teamPlayers.map((player) => (
                <div
                  key={player.id}
                  className='flex flex-wrap items-center gap-2 rounded-lg border border-black/10 bg-white p-3'
                >
                  <div>
                    <p className='font-semibold'>
                      {player.number ? `#${player.number} ` : ''}
                      {player.name}
                    </p>
                    <p className='text-xs text-black/70'>
                      {player.positions.join(', ') || 'Geen posities'}
                    </p>
                  </div>
                  <div className='ml-auto flex gap-2'>
                    <Link
                      className='rounded-md border border-black/15 px-2 py-1 text-sm'
                      href={`/spelers/${player.id}`}
                    >
                      Profiel
                    </Link>
                    <button
                      className='rounded-md border border-black/15 px-2 py-1 text-sm'
                      onClick={() => setPlayerActive(player.id, !player.active)}
                      type='button'
                    >
                      {player.active ? 'Inactief' : 'Actief'}
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
