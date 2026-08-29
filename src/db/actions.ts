import { db, ensureSettings } from './db';
import type {
  Entry,
  Payment,
  RateModel,
  Session,
  SessionRow,
  Settings,
  Worker,
  WorkerChange,
  WorkerChangeKind,
  WorkerType,
} from './types';
import { newId, todayISO } from '@/lib/id';

async function logChange(
  workerId: string,
  kind: WorkerChangeKind,
  from: string | null,
  to: string,
): Promise<void> {
  const change: WorkerChange = {
    id: newId(),
    workerId,
    kind,
    from,
    to,
    at: Date.now(),
  };
  await db.workerChanges.add(change);
}

function rateFor(type: WorkerType, s: Settings): { rateModel: RateModel; rate: number } {
  switch (type) {
    case 'picker':
      return { rateModel: 'per_kg', rate: s.pickerRatePerKg };
    case 'driver':
      return { rateModel: 'daily', rate: s.driverDailyRate };
    case 'shaker':
      return { rateModel: 'daily', rate: s.shakerDailyRate };
    case 'broker':
      return { rateModel: 'daily', rate: s.brokerDailyRate };
  }
}

export async function createWorker(input: {
  name: string;
  type?: WorkerType;
  photo?: string;
}): Promise<Worker> {
  const trimmed = input.name.trim();
  if (!trimmed) throw new Error('Worker name is required');
  const worker: Worker = {
    id: newId(),
    name: trimmed,
    type: input.type ?? 'picker',
    photo: input.photo,
    createdAt: Date.now(),
  };
  await db.workers.add(worker);
  await logChange(worker.id, 'type', null, worker.type);
  return worker;
}

export async function updateWorker(id: string, patch: Partial<Worker>): Promise<void> {
  const current = await db.workers.get(id);
  if (current) {
    if (patch.type !== undefined && current.type !== patch.type) {
      await logChange(id, 'type', current.type, patch.type);
    }
    if (patch.name !== undefined && current.name !== patch.name) {
      await logChange(id, 'name', current.name, patch.name);
    }
    if (patch.photo !== undefined && (current.photo ?? '') !== (patch.photo ?? '')) {
      await logChange(id, 'photo', current.photo ?? null, patch.photo ?? '');
    }
  }
  await db.workers.update(id, patch);
}

export async function archiveWorker(id: string, archived = true): Promise<void> {
  await db.workers.update(id, { archived });
}

export async function getOrStartTodaySession(): Promise<Session> {
  const date = todayISO();
  const existing = await db.sessions.where({ date, status: 'open' }).first();
  if (existing) return existing;
  const session: Session = {
    id: newId(),
    date,
    startedAt: Date.now(),
    status: 'open',
  };
  await db.sessions.add(session);
  return session;
}

export async function addWorkerToSession(
  sessionId: string,
  workerId: string,
  overrideType?: WorkerType,
): Promise<SessionRow> {
  const settings = await ensureSettings();
  const worker = await db.workers.get(workerId);
  if (!worker) throw new Error('Worker not found');
  const existing = await db.sessionRows.where({ sessionId, workerId }).first();
  if (existing) return existing;

  const type = overrideType ?? worker.type;
  const { rateModel, rate } = rateFor(type, settings);
  const row: SessionRow = {
    id: newId(),
    sessionId,
    workerId,
    type,
    rateModel,
    rate,
    addedAt: Date.now(),
  };
  await db.sessionRows.add(row);
  if (overrideType && overrideType !== worker.type) {
    await logChange(workerId, 'type', worker.type, overrideType);
    await db.workers.update(workerId, { type: overrideType });
  }
  return row;
}

export async function removeWorkerFromSession(
  sessionId: string,
  workerId: string,
): Promise<void> {
  const row = await db.sessionRows.where({ sessionId, workerId }).first();
  if (!row) return;
  const entries = await db.entries.where({ sessionRowId: row.id }).toArray();
  if (entries.some((e) => e.paymentId)) {
    throw new Error('Cannot remove worker with paid entries');
  }
  const paid = await db.payments.where({ sessionId, workerId }).first();
  if (paid) throw new Error('Cannot remove a worker who has been paid');
  await db.transaction('rw', db.sessionRows, db.entries, async () => {
    await Promise.all(entries.map((e) => db.entries.delete(e.id)));
    await db.sessionRows.delete(row.id);
  });
}

export async function updateSessionRowRate(rowId: string, rate: number): Promise<void> {
  if (rate < 0 || !Number.isFinite(rate)) throw new Error('Invalid rate');
  await db.sessionRows.update(rowId, { rate });
}

export async function addEntry(
  sessionRowId: string,
  kg: number,
): Promise<Entry> {
  if (!(kg > 0)) throw new Error('kg must be greater than 0');
  const row = await db.sessionRows.get(sessionRowId);
  if (!row) throw new Error('Session row not found');
  if (row.rateModel !== 'per_kg') {
    throw new Error('Only pickers can log kg entries');
  }
  const entry: Entry = {
    id: newId(),
    sessionId: row.sessionId,
    sessionRowId: row.id,
    workerId: row.workerId,
    kg,
    at: Date.now(),
  };
  await db.entries.add(entry);
  return entry;
}

export async function deleteEntry(entryId: string): Promise<void> {
  const entry = await db.entries.get(entryId);
  if (!entry) return;
  if (entry.paymentId) throw new Error('Cannot delete a paid entry');
  await db.entries.delete(entryId);
}

export interface RowSummary {
  rowId: string;
  workerId: string;
  workerName: string;
  workerPhoto?: string;
  type: WorkerType;
  rateModel: RateModel;
  rate: number;
  totalKg: number;
  unpaidKg: number;
  amount: number;
  unpaidAmount: number;
  isPaid: boolean;
  entryCount: number;
  unpaidEntryCount: number;
  kgs: number[];
}

export async function summarizeRow(row: SessionRow): Promise<RowSummary> {
  const worker = await db.workers.get(row.workerId);
  const workerName = worker?.name ?? 'Unknown';
  const workerPhoto = worker?.photo;
  if (row.rateModel === 'daily') {
    const paidExists = await db.payments
      .where({ sessionId: row.sessionId, workerId: row.workerId })
      .filter((p) => !p.revertedAt)
      .count() > 0;
    return {
      rowId: row.id,
      workerId: row.workerId,
      workerName,
      workerPhoto,
      type: row.type,
      rateModel: row.rateModel,
      rate: row.rate,
      totalKg: 0,
      unpaidKg: 0,
      amount: row.rate,
      unpaidAmount: paidExists ? 0 : row.rate,
      isPaid: paidExists,
      entryCount: 0,
      unpaidEntryCount: 0,
      kgs: [],
    };
  }
  const entries = await db.entries.where({ sessionRowId: row.id }).toArray();
  entries.sort((a, b) => a.at - b.at);
  const totalKg = entries.reduce((a, e) => a + e.kg, 0);
  const unpaid = entries.filter((e) => !e.paymentId);
  const unpaidKg = unpaid.reduce((a, e) => a + e.kg, 0);
  const amount = totalKg * row.rate;
  const unpaidAmount = unpaidKg * row.rate;
  return {
    rowId: row.id,
    workerId: row.workerId,
    workerName,
    workerPhoto,
    type: row.type,
    rateModel: row.rateModel,
    rate: row.rate,
    totalKg,
    unpaidKg,
    amount,
    unpaidAmount,
    isPaid: entries.length > 0 && unpaid.length === 0,
    entryCount: entries.length,
    unpaidEntryCount: unpaid.length,
    kgs: entries.map((e) => e.kg),
  };
}

export async function summarizeSession(sessionId: string): Promise<RowSummary[]> {
  const rows = await db.sessionRows.where({ sessionId }).toArray();
  return Promise.all(rows.map(summarizeRow));
}

export async function markRowPaid(rowId: string): Promise<Payment | null> {
  const settings = await ensureSettings();
  const row = await db.sessionRows.get(rowId);
  if (!row) throw new Error('Session row not found');
  const worker = await db.workers.get(row.workerId);
  if (!worker) throw new Error('Worker not found');

  if (row.rateModel === 'daily') {
    const already = await db.payments
      .where({ sessionId: row.sessionId, workerId: row.workerId })
      .filter((p) => !p.revertedAt)
      .first();
    if (already) return null;
    const payment: Payment = {
      id: newId(),
      sessionId: row.sessionId,
      sessionRowId: row.id,
      workerId: row.workerId,
      workerName: worker.name,
      workerType: row.type,
      totalKg: 0,
      amount: row.rate,
      currency: settings.currency,
      at: Date.now(),
    };
    await db.payments.add(payment);
    return payment;
  }

  const unpaid = await db.entries
    .where({ sessionRowId: row.id })
    .filter((e) => !e.paymentId)
    .toArray();
  if (unpaid.length === 0) return null;
  const totalKg = unpaid.reduce((a, e) => a + e.kg, 0);
  const amount = totalKg * row.rate;
  const payment: Payment = {
    id: newId(),
    sessionId: row.sessionId,
    sessionRowId: row.id,
    workerId: row.workerId,
    workerName: worker.name,
    workerType: row.type,
    totalKg,
    amount,
    currency: settings.currency,
    at: Date.now(),
  };
  await db.transaction('rw', db.payments, db.entries, async () => {
    await db.payments.add(payment);
    await Promise.all(
      unpaid.map((e) => db.entries.update(e.id, { paymentId: payment.id })),
    );
  });
  return payment;
}

export async function revertPayment(paymentId: string): Promise<void> {
  const payment = await db.payments.get(paymentId);
  if (!payment) throw new Error('Payment not found');
  if (payment.revertedAt) return;
  const session = await db.sessions.get(payment.sessionId);
  if (!session || session.status !== 'open') {
    throw new Error('Cannot revert: session is closed');
  }
  const linkedEntries = await db.entries
    .where({ sessionRowId: payment.sessionRowId })
    .filter((e) => e.paymentId === paymentId)
    .toArray();
  await db.transaction('rw', db.payments, db.entries, async () => {
    await db.payments.update(paymentId, { revertedAt: Date.now() });
    await Promise.all(
      linkedEntries.map((e) => db.entries.update(e.id, { paymentId: undefined })),
    );
  });
}

export async function revertRowLatestPayment(rowId: string): Promise<void> {
  const row = await db.sessionRows.get(rowId);
  if (!row) throw new Error('Session row not found');
  const active = await db.payments
    .where({ sessionId: row.sessionId, workerId: row.workerId })
    .filter((p) => !p.revertedAt && p.sessionRowId === rowId)
    .sortBy('at');
  const latest = active[active.length - 1];
  if (!latest) throw new Error('No active payment to revert');
  await revertPayment(latest.id);
}

export async function endSession(sessionId: string): Promise<void> {
  const rows = await db.sessionRows.where({ sessionId }).toArray();
  for (const row of rows) {
    const summary = await summarizeRow(row);
    if (!summary.isPaid && summary.unpaidAmount > 0) {
      await markRowPaid(row.id);
    }
  }
  await db.sessions.update(sessionId, {
    status: 'closed',
    endedAt: Date.now(),
  });
}
