'use client';

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { toFixed2, toFixed3 } from '@/lib/format';
import {
  playerFieldingStats,
  playerHittingStats,
  playerPitchingStats,
} from '@/lib/selectors';
import { useAppStore } from '@/stores/useAppStore';

export default function PlayerProfilePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const players = useAppStore((state) => state.players);
  const attendance = useAppStore((state) => state.attendance);
  const updatePlayer = useAppStore((state) => state.updatePlayer);

  const player = players.find((entry) => entry.id === id);
  const [notes, setNotes] = useState(player?.notes ?? '');

  const allData = useAppStore();

  const attendanceCounts = useMemo(() => {
    const rows = attendance.filter((row) => row.playerId === id);
    return {
      aanwezig: rows.filter((row) => row.status === 'aanwezig').length,
      afwezig: rows.filter((row) => row.status === 'afwezig').length,
      misschien: rows.filter((row) => row.status === 'misschien').length,
      geen_reactie: rows.filter((row) => row.status === 'geen_reactie').length,
    };
  }, [attendance, id]);

  if (!player) {
    return (
      <AppShell title='Spelerprofiel'>
        <p>Speler niet gevonden.</p>
      </AppShell>
    );
  }

  const hitting = playerHittingStats(allData, player);
  const pitching = playerPitchingStats(allData, player);
  const fielding = playerFieldingStats(player);

  return (
    <AppShell title={`Speler: ${player.name}`}>
      <section className='grid gap-4 lg:grid-cols-3'>
        <article className='rounded-2xl border border-black/10 bg-card p-4'>
          <h2 className='text-lg font-bold'>Info</h2>
          <div className='mt-3 text-sm'>
            <p>Nummer: {player.number ?? '-'}</p>
            <p>Posities: {player.positions.join(', ') || '-'}</p>
            <p>Status: {player.active ? 'Actief' : 'Inactief'}</p>
          </div>
          <textarea
            className='mt-3 h-24 w-full rounded-lg border border-black/15 bg-white p-2'
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder='Notities'
          />
          <button
            className='mt-2 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white'
            onClick={() => updatePlayer(player.id, { notes })}
            type='button'
          >
            Opslaan
          </button>
        </article>

        <article className='rounded-2xl border border-black/10 bg-card p-4'>
          <h2 className='text-lg font-bold'>Hitting</h2>
          <div className='mt-3 grid grid-cols-2 gap-2 text-sm'>
            <p>AB: {hitting.ab}</p>
            <p>H: {hitting.h}</p>
            <p>BB: {hitting.bb}</p>
            <p>RBI: {hitting.rbi}</p>
            <p>AVG: {toFixed3(hitting.avg)}</p>
            <p>OBP: {toFixed3(hitting.obp)}</p>
            <p>SLG: {toFixed3(hitting.slg)}</p>
            <p>OPS: {toFixed3(hitting.ops)}</p>
          </div>
        </article>

        <article className='rounded-2xl border border-black/10 bg-card p-4'>
          <h2 className='text-lg font-bold'>Pitching + Fielding</h2>
          <div className='mt-3 grid grid-cols-2 gap-2 text-sm'>
            <p>IP: {pitching.ip.toFixed(1)}</p>
            <p>K: {pitching.k}</p>
            <p>ERA: {toFixed2(pitching.era)}</p>
            <p>WHIP: {toFixed2(pitching.whip)}</p>
            <p>PO: {player.po}</p>
            <p>A: {player.a}</p>
            <p>E: {player.e}</p>
            <p>FLD%: {toFixed3(fielding.fld)}</p>
          </div>

          <div className='mt-4 grid grid-cols-3 gap-2 text-sm'>
            <button
              className='rounded border border-black/15 bg-white px-2 py-1'
              onClick={() => updatePlayer(player.id, { po: player.po + 1 })}
              type='button'
            >
              +PO
            </button>
            <button
              className='rounded border border-black/15 bg-white px-2 py-1'
              onClick={() => updatePlayer(player.id, { a: player.a + 1 })}
              type='button'
            >
              +A
            </button>
            <button
              className='rounded border border-black/15 bg-white px-2 py-1'
              onClick={() => updatePlayer(player.id, { e: player.e + 1 })}
              type='button'
            >
              +E
            </button>
          </div>
        </article>
      </section>

      <section className='mt-4 rounded-2xl border border-black/10 bg-card p-4'>
        <h2 className='text-lg font-bold'>Aanwezigheid</h2>
        <div className='mt-3 flex flex-wrap gap-2 text-sm'>
          <span className='rounded-full bg-white px-3 py-1'>
            Aanwezig: {attendanceCounts.aanwezig}
          </span>
          <span className='rounded-full bg-white px-3 py-1'>
            Afwezig: {attendanceCounts.afwezig}
          </span>
          <span className='rounded-full bg-white px-3 py-1'>
            Misschien: {attendanceCounts.misschien}
          </span>
          <span className='rounded-full bg-white px-3 py-1'>
            Geen reactie: {attendanceCounts.geen_reactie}
          </span>
        </div>
      </section>
    </AppShell>
  );
}
