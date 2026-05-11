'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { AppShell } from '@/components/AppShell';
import { toFixed2, toFixed3 } from '@/lib/format';
import {
  playerFieldingStats,
  playerHittingStats,
  playerPitchingStats,
} from '@/lib/selectors';
import { useAppStore } from '@/stores/useAppStore';

export default function StatsPage() {
  const snapshot = useAppStore();

  const rows = useMemo(() => {
    return snapshot.players
      .filter((player) => player.active)
      .map((player) => {
        const hitting = playerHittingStats(snapshot, player);
        const pitching = playerPitchingStats(snapshot, player);
        const fielding = playerFieldingStats(player);
        return { player, hitting, pitching, fielding };
      });
  }, [snapshot]);

  return (
    <AppShell title='Stats'>
      <section className='rounded-2xl border border-black/10 bg-card p-4'>
        <h2 className='text-lg font-bold'>Spelerstatistieken</h2>
        <p className='text-sm text-black/70'>
          Automatisch berekend uit alle niet-voided plays.
        </p>
      </section>

      <section className='mt-4 overflow-x-auto rounded-2xl border border-black/10 bg-card p-4'>
        <table className='w-full min-w-[1000px] text-sm'>
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
            {rows.map((row) => (
              <tr key={row.player.id} className='border-t border-black/10'>
                <td className='py-2 font-medium'>
                  <Link
                    className='underline decoration-dotted'
                    href={`/spelers/${row.player.id}`}
                  >
                    {row.player.name}
                  </Link>
                </td>
                <td>{row.hitting.ab}</td>
                <td>{row.hitting.h}</td>
                <td>{row.hitting.bb}</td>
                <td>{toFixed3(row.hitting.avg)}</td>
                <td>{toFixed3(row.hitting.obp)}</td>
                <td>{toFixed3(row.hitting.slg)}</td>
                <td>{toFixed3(row.hitting.ops)}</td>
                <td>{row.pitching.ip.toFixed(1)}</td>
                <td>{toFixed2(row.pitching.era)}</td>
                <td>{toFixed2(row.pitching.whip)}</td>
                <td>{row.player.po}</td>
                <td>{row.player.a}</td>
                <td>{row.player.e}</td>
                <td>{toFixed3(row.fielding.fld)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </AppShell>
  );
}
