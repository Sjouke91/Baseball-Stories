'use client';

import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { Modal } from '@/components/Modal';
import { toFixed2, toFixed3 } from '@/lib/format';
import {
  playerFieldingStats,
  playerHittingStats,
  playerPitchingStats,
} from '@/lib/selectors';
import { useActiveTeam, useAppStore } from '@/stores/useAppStore';

export default function PlayersPage() {
  const team = useActiveTeam();
  const players = useAppStore((state) => state.players);
  const addPlayer = useAppStore((state) => state.addPlayer);
  const setPlayerActive = useAppStore((state) => state.setPlayerActive);
  const snapshot = useAppStore();

  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [positions, setPositions] = useState('');
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [showStatsTable, setShowStatsTable] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  const teamPlayers = players.filter((player) => player.teamId === team?.id);
  const statsByPlayer = useMemo(() => {
    const entries = teamPlayers.map((player) => {
      const hitting = playerHittingStats(snapshot, player);
      const pitching = playerPitchingStats(snapshot, player);
      const fielding = playerFieldingStats(player);
      return [player.id, { hitting, pitching, fielding }] as const;
    });

    return Object.fromEntries(entries);
  }, [snapshot, teamPlayers]);

  const selectedPlayer =
    teamPlayers.find((player) => player.id === selectedPlayerId) ?? null;
  const selectedPlayerStats =
    selectedPlayer && statsByPlayer[selectedPlayer.id]
      ? statsByPlayer[selectedPlayer.id]
      : null;

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
    setShowPlayerModal(false);
  };

  return (
    <AppShell title='Spelers'>
      <section className='mb-4 flex items-center justify-between gap-3 rounded-2xl border border-black/10 bg-card p-4'>
        <div>
          <h2 className='text-lg font-bold'>Spelerslijst</h2>
          <p className='text-sm text-black/70'>
            Beheer je spelers en voeg snel een nieuwe speler toe.
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <button
            className='inline-flex items-center gap-2 rounded-lg bg-accent px-3 py-2 font-semibold text-white'
            onClick={() => setShowPlayerModal(true)}
            type='button'
          >
            <span aria-hidden='true' className='text-lg leading-none'>
              +
            </span>
            <span>Nieuwe speler</span>
          </button>
        </div>
      </section>

      <section>
        <article className='rounded-2xl border border-black/10 bg-card p-4'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <h2 className='text-lg font-bold'>Alle spelers</h2>
            <label className='inline-flex cursor-pointer items-center gap-3 rounded-xl border border-black/15 bg-white px-3 py-2 text-sm shadow-sm'>
              <span
                className={`text-xs font-semibold uppercase tracking-wide ${
                  showStatsTable ? 'text-black/45' : 'text-black'
                }`}
              >
                Lijst
              </span>
              <span className='relative inline-flex h-6 w-11 items-center'>
                <input
                  checked={showStatsTable}
                  className='peer sr-only'
                  onChange={(event) => setShowStatsTable(event.target.checked)}
                  role='switch'
                  type='checkbox'
                />
                <span className='absolute inset-0 rounded-full bg-black/15 transition-colors peer-checked:bg-accent' />
                <span className='absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5' />
              </span>
              <span
                className={`text-xs font-semibold uppercase tracking-wide ${
                  showStatsTable ? 'text-accent' : 'text-black/60'
                }`}
              >
                Stats
              </span>
            </label>
          </div>

          <div className='mt-3 grid gap-2'>
            {teamPlayers.length === 0 ? (
              <p className='text-sm text-black/70'>
                Nog geen spelers toegevoegd.
              </p>
            ) : !showStatsTable ? (
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
                    <button
                      aria-label={`Bekijk stats van ${player.name}`}
                      className='rounded-md border border-black/15 px-2 py-1 text-sm hover:bg-muted'
                      onClick={() => setSelectedPlayerId(player.id)}
                      type='button'
                    >
                      <svg
                        aria-hidden='true'
                        className='h-4 w-4'
                        fill='none'
                        stroke='currentColor'
                        strokeWidth='1.75'
                        viewBox='0 0 24 24'
                      >
                        <path d='M4 20h16' />
                        <path d='M7 16v-4' />
                        <path d='M12 16V8' />
                        <path d='M17 16v-7' />
                      </svg>
                    </button>
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
            ) : (
              <div className='overflow-x-auto rounded-xl border border-black/10 bg-white p-3'>
                <table className='min-w-250 w-full text-sm'>
                  <thead>
                    <tr className='text-left'>
                      <th className='py-2'>Speler</th>
                      <th>AB</th>
                      <th>H</th>
                      <th>BB</th>
                      <th>AVG</th>
                      <th>OBP</th>
                      <th>SLG</th>
                      <th>OPS</th>
                      <th>IP</th>
                      <th>ERA</th>
                      <th>WHIP</th>
                      <th>PO</th>
                      <th>A</th>
                      <th>E</th>
                      <th>FLD%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamPlayers.map((player) => {
                      const stats = statsByPlayer[player.id];
                      if (!stats) return null;

                      return (
                        <tr key={player.id} className='border-t border-black/10'>
                          <td className='py-2 font-medium'>
                            <Link
                              className='underline decoration-dotted'
                              href={`/spelers/${player.id}`}
                            >
                              {player.name}
                            </Link>
                          </td>
                          <td>{stats.hitting.ab}</td>
                          <td>{stats.hitting.h}</td>
                          <td>{stats.hitting.bb}</td>
                          <td>{toFixed3(stats.hitting.avg)}</td>
                          <td>{toFixed3(stats.hitting.obp)}</td>
                          <td>{toFixed3(stats.hitting.slg)}</td>
                          <td>{toFixed3(stats.hitting.ops)}</td>
                          <td>{stats.pitching.ip.toFixed(1)}</td>
                          <td>{toFixed2(stats.pitching.era)}</td>
                          <td>{toFixed2(stats.pitching.whip)}</td>
                          <td>{player.po}</td>
                          <td>{player.a}</td>
                          <td>{player.e}</td>
                          <td>{toFixed3(stats.fielding.fld)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </article>
      </section>

      <Modal
        open={showPlayerModal}
        title='Speler toevoegen'
        onClose={() => setShowPlayerModal(false)}
      >
        <form className='grid gap-2' onSubmit={onSubmit}>
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
      </Modal>

      <Modal
        open={Boolean(selectedPlayer && selectedPlayerStats)}
        title={selectedPlayer ? `Stats: ${selectedPlayer.name}` : 'Spelerstats'}
        onClose={() => setSelectedPlayerId(null)}
      >
        {selectedPlayer && selectedPlayerStats ? (
          <div className='grid gap-3'>
            <div className='rounded-lg border border-black/10 bg-white p-3'>
              <p className='text-sm font-semibold'>Hitting</p>
              <p className='text-sm text-black/80'>
                AB {selectedPlayerStats.hitting.ab} · H {selectedPlayerStats.hitting.h} ·
                BB {selectedPlayerStats.hitting.bb}
              </p>
              <p className='text-sm text-black/80'>
                AVG {toFixed3(selectedPlayerStats.hitting.avg)} · OBP{' '}
                {toFixed3(selectedPlayerStats.hitting.obp)} · SLG{' '}
                {toFixed3(selectedPlayerStats.hitting.slg)} · OPS{' '}
                {toFixed3(selectedPlayerStats.hitting.ops)}
              </p>
            </div>

            <div className='rounded-lg border border-black/10 bg-white p-3'>
              <p className='text-sm font-semibold'>Pitching</p>
              <p className='text-sm text-black/80'>
                IP {selectedPlayerStats.pitching.ip.toFixed(1)} · K{' '}
                {selectedPlayerStats.pitching.k} · BB {selectedPlayerStats.pitching.bb}
              </p>
              <p className='text-sm text-black/80'>
                ERA {toFixed2(selectedPlayerStats.pitching.era)} · WHIP{' '}
                {toFixed2(selectedPlayerStats.pitching.whip)}
              </p>
            </div>

            <div className='rounded-lg border border-black/10 bg-white p-3'>
              <p className='text-sm font-semibold'>Fielding</p>
              <p className='text-sm text-black/80'>
                PO {selectedPlayer.po} · A {selectedPlayer.a} · E {selectedPlayer.e}
              </p>
              <p className='text-sm text-black/80'>
                TC {selectedPlayerStats.fielding.tc} · FLD%{' '}
                {toFixed3(selectedPlayerStats.fielding.fld)}
              </p>
            </div>
          </div>
        ) : null}
      </Modal>
    </AppShell>
  );
}
