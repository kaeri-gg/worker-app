import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Layout } from '@/components/Layout';
import { TodayPage } from '@/pages/TodayPage';
import { WorkersPage } from '@/pages/WorkersPage';
import { SessionsPage } from '@/pages/SessionsPage';
import { SessionDetailPage } from '@/pages/SessionDetailPage';
import { PaymentsPage } from '@/pages/PaymentsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { useSettings } from '@/hooks/useSettings';

export default function App() {
  const settings = useSettings();
  const { i18n } = useTranslation();

  useEffect(() => {
    if (settings.language && i18n.language !== settings.language) {
      void i18n.changeLanguage(settings.language);
    }
  }, [settings.language, i18n]);

  useEffect(() => {
    const scale = settings.fontScale ?? 1;
    document.documentElement.style.fontSize = `${scale * 100}%`;
  }, [settings.fontScale]);

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/today" replace />} />
          <Route path="/today" element={<TodayPage />} />
          <Route path="/workers" element={<WorkersPage />} />
          <Route path="/sessions" element={<SessionsPage />} />
          <Route path="/sessions/:id" element={<SessionDetailPage />} />
          <Route path="/payments" element={<PaymentsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/today" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
