import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AppProvider, useApp } from './store/AppContext.jsx';
import NavigateRegistrar from './components/NavigateRegistrar.jsx';
import RequireScreen from './components/RequireScreen.jsx';
import Sidebar from './components/layout/Sidebar.jsx';
import Topbar from './components/layout/Topbar.jsx';
import Toast from './components/ui/Toast.jsx';
import Login from './screens/Login.jsx';
import Dashboard from './screens/Dashboard.jsx';
import Inbox from './screens/Inbox.jsx';
import Browser from './screens/Browser.jsx';
import SmartMatch from './screens/SmartMatch.jsx';
import ProposalBuilder from './screens/ProposalBuilder.jsx';
import ProposalEditPage from './screens/ProposalEditPage.jsx';
import Proposals from './screens/Proposals.jsx';
import Leads from './screens/Leads.jsx';
import Freshness from './screens/Freshness.jsx';
import Users from './screens/Users.jsx';
import PublicProposalPortal from './screens/PublicProposalPortal.jsx';
import { FEATURES } from './config/features.js';
import {
  PATHS, defaultPathForUser, resolvePostLoginPath, canSeePath,
} from './routes.js';
import { getLastRoute } from './navigation.js';

function BootScreen() {
  return (
    <div className="app-boot">
      <Loader2 className="spin" />
    </div>
  );
}

function GuestRoute() {
  const { authChecked, authUser } = useApp();
  const location = useLocation();

  if (!authChecked) return <BootScreen />;
  if (authUser) {
    const target = resolvePostLoginPath(
      authUser,
      location.state?.from?.pathname
        ? `${location.state.from.pathname}${location.state.from.search || ''}`
        : '',
    );
    return <Navigate to={target} replace />;
  }
  return <Login />;
}

function HomeRedirect() {
  const { authUser } = useApp();
  const last = getLastRoute();
  if (last && canSeePath(authUser, last.split('?')[0])) {
    return <Navigate to={last} replace />;
  }
  return <Navigate to={defaultPathForUser(authUser)} replace />;
}

function ProtectedLayout() {
  const { authChecked, authUser } = useApp();
  const location = useLocation();

  if (!authChecked) return <BootScreen />;
  if (!authUser) {
    return <Navigate to={PATHS.login} state={{ from: location }} replace />;
  }

  if (location.pathname === PATHS.inbox && !FEATURES.inbox) {
    return <Navigate to={PATHS.dashboard} replace />;
  }

  const screenPath = location.pathname.replace(/\/$/, '') || '/';
  if (
    screenPath !== '/'
    && screenPath !== PATHS.login
    && !canSeePath(authUser, screenPath)
  ) {
    return <Navigate to={defaultPathForUser(authUser)} replace />;
  }

  return (
    <div className="app">
      <Sidebar />
      <div className="workspace">
        <Topbar />
        <main id="main">
          <div className="screen active">
            <Outlet />
          </div>
        </main>
      </div>
      <Toast />
    </div>
  );
}

function AppRoutes() {
  useEffect(() => {
    const onError = (e) => {
      const img = e.target;
      if (img.tagName === 'IMG' && !img.dataset.fb) {
        img.dataset.fb = '1';
        img.src = `https://picsum.photos/seed/${encodeURIComponent((img.alt || 'spacehaat').replace(/\W/g, '') || 'spacehaat')}/600/360`;
      }
    };
    document.addEventListener('error', onError, true);
    return () => document.removeEventListener('error', onError, true);
  }, []);

  return (
    <>
      <NavigateRegistrar />
      <Routes>
        <Route path="/p/:token" element={<PublicProposalPortal />} />
        <Route path={PATHS.login} element={<GuestRoute />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<HomeRedirect />} />
          <Route path={PATHS.dashboard} element={<RequireScreen screen="dashboard"><Dashboard /></RequireScreen>} />
          <Route
            path={PATHS.inbox}
            element={
              FEATURES.inbox
                ? <RequireScreen screen="inbox"><Inbox /></RequireScreen>
                : <Navigate to={PATHS.dashboard} replace />
            }
          />
          <Route path={PATHS.browser} element={<RequireScreen screen="browser"><Browser /></RequireScreen>} />
          <Route path={PATHS.match} element={<RequireScreen screen="match"><SmartMatch /></RequireScreen>} />
          <Route path={PATHS.proposal} element={<RequireScreen screen="proposal"><ProposalBuilder /></RequireScreen>} />
          <Route path="/proposals/:id/edit" element={<RequireScreen screen="proposal"><ProposalEditPage /></RequireScreen>} />
          <Route path={PATHS.proposals} element={<RequireScreen screen="proposals"><Proposals /></RequireScreen>} />
          <Route path={PATHS.leads} element={<RequireScreen screen="leads"><Leads /></RequireScreen>} />
          <Route path={PATHS.freshness} element={<RequireScreen screen="freshness"><Freshness /></RequireScreen>} />
          <Route path={PATHS.users} element={<RequireScreen screen="users"><Users /></RequireScreen>} />
          <Route path="*" element={<HomeRedirect />} />
        </Route>
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </BrowserRouter>
  );
}
