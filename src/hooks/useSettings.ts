import { useLiveQuery } from 'dexie-react-hooks';
import { db, ensureSettings } from '@/db/db';
import { DEFAULT_SETTINGS, type Settings } from '@/db/types';
import { useEffect } from 'react';

export function useSettings(): Settings {
  useEffect(() => {
    void ensureSettings();
  }, []);
  const settings = useLiveQuery(() => db.settings.get('singleton'), []);
  return settings ?? DEFAULT_SETTINGS;
}

export async function updateSettings(patch: Partial<Settings>): Promise<void> {
  await ensureSettings();
  await db.settings.update('singleton', patch);
}
