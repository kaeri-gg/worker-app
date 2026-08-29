import Dexie, { type Table } from 'dexie';
import {
  DEFAULT_SETTINGS,
  type Entry,
  type Payment,
  type Session,
  type SessionRow,
  type Settings,
  type Worker,
  type WorkerChange,
} from './types';
import { newId } from '@/lib/id';

class HarvestDB extends Dexie {
  workers!: Table<Worker, string>;
  sessions!: Table<Session, string>;
  sessionRows!: Table<SessionRow, string>;
  entries!: Table<Entry, string>;
  payments!: Table<Payment, string>;
  settings!: Table<Settings, string>;
  workerChanges!: Table<WorkerChange, string>;

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
    this.version(2)
      .stores({
        workerTypeChanges: 'id, workerId, at, to',
      })
      .upgrade(async (tx) => {
        const existing = await tx.table<Worker>('workers').toArray();
        const seed = existing.map((w) => ({
          id: newId(),
          workerId: w.id,
          from: null,
          to: w.type,
          at: w.createdAt,
        }));
        if (seed.length > 0) {
          await tx.table('workerTypeChanges').bulkAdd(seed);
        }
      });
    this.version(3)
      .stores({
        workerTypeChanges: null,
        workerChanges: 'id, workerId, at, kind',
      })
      .upgrade(async (tx) => {
        const legacy = (await tx.table('workerTypeChanges').toArray()) as {
          id: string;
          workerId: string;
          from: string | null;
          to: string;
          at: number;
        }[];
        const migrated: WorkerChange[] = legacy.map((c) => ({
          id: c.id,
          workerId: c.workerId,
          kind: 'type',
          from: c.from,
          to: c.to,
          at: c.at,
        }));
        if (migrated.length > 0) {
          await tx.table<WorkerChange>('workerChanges').bulkAdd(migrated);
        }
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
