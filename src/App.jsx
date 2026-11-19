import { useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
// Add page imports here
import Title from './pages/Title';
import Customize from './pages/Customize';
import WorldMap from './pages/WorldMap';
import NewWorldMap from './pages/NewWorldMap';
import Stage from './pages/Stage';
import Shop from './pages/Shop';
import ChallengeMode from './pages/ChallengeMode';
import ArcadeMode from './pages/ArcadeMode';
import { loadSave } from '@/game/core';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      {/* Add your page Route elements here */}
      <Route path="/" element={<Title />} />
      <Route path="/customize" element={<Customize />} />
      <Route path="/world" element={<WorldMap />} />
      <Route path="/new-world" element={<NewWorldMap />} />
      <Route path="/stage/:stage" element={<Stage />} />
      <Route path="/level-select-map" element={<ChallengeMode />} />
      <Route path="/arcade" element={<ArcadeMode />} />
      <Route path="/shop" element={<Shop />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {
  useEffect(() => {
    document.documentElement.classList.toggle("pa-high-contrast", Boolean(loadSave()?.settings?.highContrast));
  }, []);

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
