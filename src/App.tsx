import { useEffect } from 'react';
import { HashRouter, MemoryRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { StoreProvider, useBoot, useStore, applyTheme, getTheme } from './lib/store';
import { Layout, More } from './components/Layout';
import Onboarding from './pages/Onboarding';
import Login from './pages/Login';
import Today from './pages/Today';
import Learn, { UnitPage } from './pages/Learn';
import LessonPage from './pages/Lesson';
import Practice, { PracticeRun, TopicPage, Diagnostic } from './pages/Practice';
import Bank from './pages/Bank';
import Errors from './pages/Errors';
import Plan from './pages/Plan';
import Progress from './pages/Progress';
import Mocks from './pages/Mocks';
import Library from './pages/Library';
import Board from './pages/Board';
import ProfilePage from './pages/Profile';
import StartHere from './pages/StartHere';

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function Routed() {
  const { s } = useStore();
  if (!s.profile) return <Onboarding />;
  return (
    <Layout>
      <ScrollTop />
      <Routes>
        <Route path="/" element={<Today />} />
        <Route path="/start" element={<StartHere />} />
        <Route path="/learn" element={<Learn />} />
        <Route path="/learn/:id" element={<UnitPage />} />
        <Route path="/lesson/:id" element={<LessonPage />} />
        <Route path="/topic/:id" element={<TopicPage />} />
        <Route path="/practice" element={<Practice />} />
        <Route path="/practice/run" element={<PracticeRun />} />
        <Route path="/diagnostic" element={<Diagnostic />} />
        <Route path="/bank" element={<Bank />} />
        <Route path="/errors" element={<Errors />} />
        <Route path="/plan" element={<Plan />} />
        <Route path="/progress" element={<Progress />} />
        <Route path="/mocks" element={<Mocks />} />
        <Route path="/library" element={<Library />} />
        <Route path="/board" element={<Board />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/more" element={<More />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  const { boot, reload } = useBoot();
  // leave the host's theme alone unless this viewer picked one in the app
  useEffect(() => { const t = getTheme(); if (t !== 'auto') applyTheme(t); }, []);
  if (boot.phase === 'loading') {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <div className="stack" style={{ alignItems: 'center' }}>
          <div className="brand-mark" style={{ width: 48, height: 48, fontSize: 17 }}>FC</div>
          <div className="small muted">Loading your progress</div>
        </div>
      </div>
    );
  }
  if (boot.phase === 'login') return <Login backend={boot.backend} onDone={() => reload(boot.backend)} />;
  // The hosted portal keeps routes in the URL hash so links and refresh work. Inside a
  // claude.ai artifact the host owns the URL, so routing stays in memory there.
  const framed = (() => { try { return window.self !== window.top; } catch { return true; } })();
  const Router = boot.backend.kind === 'artifact' || (framed && boot.backend.kind !== 'supabase') ? MemoryRouter : HashRouter;
  return (
    <Router>
      <StoreProvider backend={boot.backend} initial={boot.state}>
        <Routed />
      </StoreProvider>
    </Router>
  );
}
