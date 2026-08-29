import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { updateSettings, useSettings } from '@/hooks/useSettings';
import { FONT_SCALE_MAX, FONT_SCALE_MIN, type LanguageCode, type Settings } from '@/db/types';

const CURRENCIES = ['GEL', 'USD', 'EUR'];
const LANGUAGES: { code: LanguageCode; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'ka', label: 'ქართული' },
];

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  return (
    <div>
      <label className="label">{label}</label>
      <input
        className="input"
        type="text"
        inputMode="decimal"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const n = Number(draft.replace(',', '.'));
          if (Number.isFinite(n) && n >= 0) onChange(n);
          else setDraft(String(value));
        }}
      />
    </div>
  );
}

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const settings = useSettings();

  const set = async (patch: Partial<Settings>) => {
    await updateSettings(patch);
    if (patch.language) await i18n.changeLanguage(patch.language);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">{t('settings.title')}</h1>

      <section className="card p-4 space-y-3">
        <h2 className="font-semibold">{t('settings.language')}</h2>
        <div className="grid grid-cols-2 gap-2">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => void set({ language: l.code })}
              className={`btn ${
                settings.language === l.code
                  ? 'bg-brand-700 text-white'
                  : 'bg-neutral-100 text-neutral-800'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </section>

      <section className="card p-4 space-y-3">
        <h2 className="font-semibold">{t('settings.currency')}</h2>
        <div className="grid grid-cols-3 gap-2">
          {CURRENCIES.map((c) => (
            <button
              key={c}
              onClick={() => void set({ currency: c })}
              className={`btn ${
                settings.currency === c
                  ? 'bg-brand-700 text-white'
                  : 'bg-neutral-100 text-neutral-800'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </section>

      <section className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{t('settings.fontSize')}</h2>
          <span className="text-xs text-neutral-500 tabular-nums">
            {Math.round((settings.fontScale ?? 1) * 100)}%
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-neutral-500">A</span>
          <input
            type="range"
            className="grow accent-brand-700"
            min={FONT_SCALE_MIN}
            max={FONT_SCALE_MAX}
            step={0.05}
            value={settings.fontScale ?? 1}
            onChange={(e) => void set({ fontScale: Number(e.target.value) })}
          />
          <span className="text-xl text-neutral-500">A</span>
        </div>
        <div className="rounded-lg border border-neutral-200 p-3">
          <div className="text-xs text-neutral-500 mb-1">
            {t('settings.fontSizePreview')}
          </div>
          <div className="font-medium">{t('today.title')} · Dexter · 19.00 kg · 19.00 ₾</div>
        </div>
      </section>

      <section className="card p-4 space-y-3">
        <h2 className="font-semibold">{t('settings.weightUnit')}</h2>
        <div className="grid grid-cols-2 gap-2">
          {(['kg', 'lb'] as const).map((u) => (
            <button
              key={u}
              onClick={() => void set({ weightUnit: u })}
              className={`btn ${
                settings.weightUnit === u
                  ? 'bg-brand-700 text-white'
                  : 'bg-neutral-100 text-neutral-800'
              }`}
            >
              {u}
            </button>
          ))}
        </div>
      </section>

      <section className="card p-4 space-y-3">
        <h2 className="font-semibold">
          {t('settings.rates')} ({settings.currency})
        </h2>
        <NumberField
          label={t('settings.pickerRate')}
          value={settings.pickerRatePerKg}
          onChange={(n) => void set({ pickerRatePerKg: n })}
        />
        <NumberField
          label={t('settings.driverRate')}
          value={settings.driverDailyRate}
          onChange={(n) => void set({ driverDailyRate: n })}
        />
        <NumberField
          label={t('settings.shakerRate')}
          value={settings.shakerDailyRate}
          onChange={(n) => void set({ shakerDailyRate: n })}
        />
        <NumberField
          label={t('settings.brokerRate')}
          value={settings.brokerDailyRate}
          onChange={(n) => void set({ brokerDailyRate: n })}
        />
        <p className="text-xs text-neutral-500">
          Changes apply to new session entries. Ongoing session rates stay locked at
          the value snapshotted when workers were added.
        </p>
      </section>
    </div>
  );
}
