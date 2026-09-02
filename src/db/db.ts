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
    this.version(4)
      .stores({
        sessionRows: 'id, sessionId, workerId, parentDriverRowId, [sessionId+workerId]',
      })
      .upgrade(async (tx) => {
        const brokers = await tx
          .table<Worker>('workers')
          .filter((w) => (w.type as string) === 'broker')
          .toArray();
        const brokerIds = new Set(brokers.map((w) => w.id));
        if (brokerIds.size > 0) {
          const rows = await tx.table<SessionRow>('sessionRows').toArray();
          const brokerRowIds = new Set(
            rows.filter((r) => brokerIds.has(r.workerId)).map((r) => r.id),
          );
          const entries = await tx.table<Entry>('entries').toArray();
          const brokerEntryIds = entries
            .filter(
              (e) => brokerIds.has(e.workerId) || brokerRowIds.has(e.sessionRowId),
            )
            .map((e) => e.id);
          const payments = await tx.table<Payment>('payments').toArray();
          const brokerPaymentIds = payments
            .filter(
              (p) => brokerIds.has(p.workerId) || brokerRowIds.has(p.sessionRowId),
            )
            .map((p) => p.id);
          const changes = await tx.table<WorkerChange>('workerChanges').toArray();
          const brokerChangeIds = changes
            .filter((c) => brokerIds.has(c.workerId))
            .map((c) => c.id);

          await tx.table('entries').bulkDelete(brokerEntryIds);
          await tx.table('payments').bulkDelete(brokerPaymentIds);
          await tx.table('sessionRows').bulkDelete([...brokerRowIds]);
          await tx.table('workerChanges').bulkDelete(brokerChangeIds);
          await tx.table('workers').bulkDelete([...brokerIds]);
        }
        const s = await tx
          .table<Settings & { brokerDailyRate?: number; driverDailyRate?: number }>(
            'settings',
          )
          .get('singleton');
        if (s && ('brokerDailyRate' in s || 'driverDailyRate' in s)) {
          const { brokerDailyRate, driverDailyRate, ...rest } = s;
          void brokerDailyRate;
          void driverDailyRate;
          await tx.table('settings').put(rest);
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
