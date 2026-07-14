import { lazy, Suspense } from 'react';
import type { PageKey } from '@/types';
import { DashboardPage } from './DashboardPage';
import { LoginPage } from './LoginPage';

const CalculatorPage = lazy(() => import('./CalculatorPage').then(m => ({ default: m.CalculatorPage })));
const SimulatorPage = lazy(() => import('./SimulatorPage').then(m => ({ default: m.SimulatorPage })));
const RoadmapPage = lazy(() => import('./RoadmapPage').then(m => ({ default: m.RoadmapPage })));
const GoalsPage = lazy(() => import('./GoalsPage').then(m => ({ default: m.GoalsPage })));
const BudgetPage = lazy(() => import('./BudgetPage').then(m => ({ default: m.BudgetPage })));
const StatsPage = lazy(() => import('./StatsPage').then(m => ({ default: m.StatsPage })));
const SettingsPage = lazy(() => import('./SettingsPage').then(m => ({ default: m.SettingsPage })));

interface PageRouterProps {
  page: PageKey;
  isAuthenticated: boolean;
}

export function PageRouter({ page, isAuthenticated }: PageRouterProps) {
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const pageMap: Record<PageKey, React.ReactNode> = {
    dashboard: <DashboardPage />,
    calculator: <Suspense fallback={<div>Loading...</div>}><CalculatorPage /></Suspense>,
    simulator: <Suspense fallback={<div>Loading...</div>}><SimulatorPage /></Suspense>,
    roadmap: <Suspense fallback={<div>Loading...</div>}><RoadmapPage /></Suspense>,
    goals: <Suspense fallback={<div>Loading...</div>}><GoalsPage /></Suspense>,
    budget: <Suspense fallback={<div>Loading...</div>}><BudgetPage /></Suspense>,
    stats: <Suspense fallback={<div>Loading...</div>}><StatsPage /></Suspense>,
    settings: <Suspense fallback={<div>Loading...</div>}><SettingsPage /></Suspense>,
  };

  return pageMap[page];
}
