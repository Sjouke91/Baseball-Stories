'use client';

import { useEffect, useRef } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useAppStore } from '@/stores/useAppStore';
import type { AppData } from '@/types/models';

const SNAPSHOT_ID = 'global';
let hasHydratedSnapshot = false;

const pickSnapshot = (
  state: ReturnType<typeof useAppStore.getState>,
): AppData => ({
  teams: state.teams,
  players: state.players,
  events: state.events,
  attendance: state.attendance,
  games: state.games,
  lineups: state.lineups,
  plays: state.plays,
  runnerEvents: state.runnerEvents,
  gameProgress: state.gameProgress,
  activeTeamId: state.activeTeamId,
});

export const useSupabaseSnapshotSync = () => {
  const applyRemoteSnapshot = useAppStore((state) => state.applyRemoteSnapshot);
  const lastSerializedRef = useRef<string>('');
  const loadedRef = useRef(false);
  const pendingSnapshotRef = useRef<{
    snapshot: AppData;
    serialized: string;
  } | null>(null);

  useEffect(() => {
    if (hasHydratedSnapshot) {
      loadedRef.current = true;
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      loadedRef.current = true;
      hasHydratedSnapshot = true;
      return;
    }

    let cancelled = false;

    const load = async () => {
      const { data, error } = await supabase
        .from('app_state_snapshots')
        .select('data')
        .eq('id', SNAPSHOT_ID)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error('Failed to load Supabase snapshot:', error.message);
        loadedRef.current = true;
        hasHydratedSnapshot = true;
        return;
      }

      if (data?.data) {
        applyRemoteSnapshot(data.data as Partial<AppData>);
        lastSerializedRef.current = JSON.stringify(data.data);
      }

      loadedRef.current = true;
      hasHydratedSnapshot = true;
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [applyRemoteSnapshot]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    let timer: ReturnType<typeof setTimeout> | null = null;

    const persistSnapshot = async (snapshot: AppData, serialized: string) => {
      const { error } = await supabase.from('app_state_snapshots').upsert(
        {
          id: SNAPSHOT_ID,
          data: snapshot,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' },
      );

      if (error) {
        console.error('Failed to save Supabase snapshot:', error.message);
        return;
      }

      lastSerializedRef.current = serialized;
    };

    const unsubscribe = useAppStore.subscribe((state) => {
      if (!loadedRef.current) return;

      const snapshot = pickSnapshot(state);
      const serialized = JSON.stringify(snapshot);
      if (serialized === lastSerializedRef.current) return;

      pendingSnapshotRef.current = { snapshot, serialized };

      if (timer) clearTimeout(timer);
      timer = setTimeout(async () => {
        const pending = pendingSnapshotRef.current;
        if (!pending) return;
        pendingSnapshotRef.current = null;
        await persistSnapshot(pending.snapshot, pending.serialized);
      }, 500);
    });

    return () => {
      if (timer) clearTimeout(timer);

      const pending = pendingSnapshotRef.current;
      if (pending) {
        pendingSnapshotRef.current = null;
        void persistSnapshot(pending.snapshot, pending.serialized);
      }

      unsubscribe();
    };
  }, []);
};
