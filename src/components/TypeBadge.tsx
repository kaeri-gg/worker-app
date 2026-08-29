import { useTranslation } from 'react-i18next';
import type { WorkerType } from '@/db/types';

const STYLE: Record<WorkerType, string> = {
  picker: 'bg-emerald-100 text-emerald-800',
  driver: 'bg-blue-100 text-blue-800',
  shaker: 'bg-amber-100 text-amber-800',
  broker: 'bg-purple-100 text-purple-800',
};

export function TypeBadge({ type }: { type: WorkerType }) {
  const { t } = useTranslation();
  return (
    <span className={`badge ${STYLE[type]}`}>{t(`worker.type.${type}`)}</span>
  );
}
