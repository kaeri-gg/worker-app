export type WorkerType = 'picker' | 'driver' | 'shaker';

export const WORKER_TYPES: WorkerType[] = ['picker', 'driver', 'shaker'];

export type SessionStatus = 'open' | 'closed';

export type RateModel = 'per_kg' | 'daily';

export type DriverPayMode = 'per_pax' | 'fixed' | 'per_kg';

export const DRIVER_PAY_MODES: DriverPayMode[] = ['per_pax', 'fixed', 'per_kg'];

export type WorkerPayMode = 'flat' | 'per_weight';

export const WORKER_PAY_MODES: WorkerPayMode[] = ['flat', 'per_weight'];

export interface Worker {
  id: string;
  name: string;
  photo?: string;
  type: WorkerType;
  createdAt: number;
  archived?: boolean;
}

export interface Session {
  id: string;
  date: string;
  startedAt: number;
  endedAt?: number;
  status: SessionStatus;
}

export interface SessionRow {
  id: string;
  sessionId: string;
  workerId: string;
  type: WorkerType;
  rateModel: RateModel;
  rate: number;
  addedAt: number;
  parentDriverRowId?: string;
  driverPayMode?: DriverPayMode;
  workerPayMode?: WorkerPayMode;
  pickerFlatRate?: number;
}

export interface Entry {
  id: string;
  sessionId: string;
  sessionRowId: string;
  workerId: string;
  kg: number;
  at: number;
  paymentId?: string;
}

export type WorkerChangeKind = 'type' | 'name' | 'photo';

export interface WorkerChange {
  id: string;
  workerId: string;
  kind: WorkerChangeKind;
  from: string | null;
  to: string;
  at: number;
}

export interface Payment {
  id: string;
  sessionId: string;
  sessionRowId: string;
  workerId: string;
  workerName: string;
  workerType: WorkerType;
  totalKg: number;
  amount: number;
  currency: string;
  at: number;
  revertedAt?: number;
}

export type LanguageCode = 'en' | 'ka';

export interface Settings {
  id: 'singleton';
  currency: string;
  weightUnit: 'kg' | 'lb';
  language: LanguageCode;
  pickerRatePerKg: number;
  shakerDailyRate: number;
  fontScale: number;
}

export const DEFAULT_SETTINGS: Settings = {
  id: 'singleton',
  currency: 'GEL',
  weightUnit: 'kg',
  language: 'en',
  pickerRatePerKg: 1,
  shakerDailyRate: 40,
  fontScale: 1,
};

export const FONT_SCALE_MIN = 0.85;
export const FONT_SCALE_MAX = 1.4;
