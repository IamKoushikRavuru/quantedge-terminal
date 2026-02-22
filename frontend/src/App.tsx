import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import ProtectedRoute from './components/ProtectedRoute';
import { SettingsProvider } from './hooks/useSettings';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const OptionChain = lazy(() => import('./pages/OptionChain'));
const VolatilitySurface = lazy(() => import('./pages/VolatilitySurface'));
const ModelComparison = lazy(() => import('./pages/ModelComparison'));
const MLInsights = lazy(() => import('./pages/MLInsights'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const MarketStructure = lazy(() => import('./pages/MarketStructure'));
const ScenarioLab = lazy(() => import('./pages/ScenarioLab'));
const ResearchSignals = lazy(() => import('./pages/ResearchSignals'));
const SignalResearch = lazy(() => import('./pages/SignalResearch'));
const ExecutionSandbox = lazy(() => import('./pages/ExecutionSandbox'));
const QuantEdgeGuide = lazy(() => import('./pages/QuantEdgeGuide'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const DeveloperInfo = lazy(() => import('./pages/DeveloperInfo'));

function PageLoader() {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}>
      <div style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.06)', borderTopColor: 'var(--green)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Onboarding — protected but outside AppShell (uses own full-screen layout) */}
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <Onboarding />
                </Suspense>
              </ProtectedRoute>
            }
          />

          {/* Protected routes — inside AppShell */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AppShell>
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/chain" element={<OptionChain />} />
                      <Route path="/surface" element={<VolatilitySurface />} />
                      <Route path="/models" element={<ModelComparison />} />
                      <Route path="/ml" element={<MLInsights />} />
                      <Route path="/profile" element={<ProfilePage />} />
                      <Route path="/market-structure" element={<MarketStructure />} />
                      <Route path="/scenario" element={<ScenarioLab />} />
                      <Route path="/research" element={<ResearchSignals />} />
                      <Route path="/signals" element={<SignalResearch />} />
                      <Route path="/sandbox" element={<ExecutionSandbox />} />
                      <Route path="/guide" element={<QuantEdgeGuide />} />
                      <Route path="/settings" element={<SettingsPage />} />
                      <Route path="/developer" element={<DeveloperInfo />} />
                    </Routes>
                  </Suspense>
                </AppShell>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </SettingsProvider>
  );
}
