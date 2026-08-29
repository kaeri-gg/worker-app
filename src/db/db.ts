import Dexie, { type Table } from 'dexie';
import {
  DEFAULT_SETTINGS,
  type Entry,
  type Payment,
  type Session,
  type SessionRow,
  type Settings,
  type Worker,
} from './types';

class HarvestDB extends Dexie {
  workers!: Table<Worker, string>;
  sessions!: Table<Session, string>;
  sessionRows!: Table<SessionRow, string>;
  entries!: Table<Entry, string>;
  payments!: Table<Payment, string>;
  settings!: Table<Settings, string>;

  constructor() {
    super('harvest-worker-app');
    this.version(1).stores({
      workers: 'id, name, type, archived, createdAt',
      sessions: 'id, date, status, startedAt, [date+status]',
      sessionRows: 'id, sessionId, workerId, [sessionId+workerId]',
      entries: 'id, sessionId, workerId, sessionRowId, at, paymentId',
      payments: 'id, sessionId, workerId, at',
      settings: 'id',
    });
  }
}

export const db = new HarvestDB();

export async function ensureSettings(): Promise<Settings> {
  const existing = await db.settings.get('singleton');
  if (existing) {
    const merged = { ...DEFAULT_SETTINGS, ...existing };
    if (JSON.stringify(merged) !== JSON.stringify(existing)) {
      await db.settings.put(merged);
    }
    return merged;
  }
  await db.settings.put(DEFAULT_SETTINGS);
  return DEFAULT_SETTINGS;
}
