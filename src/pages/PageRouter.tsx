import type { PageKey } from '@/types';
import { DashboardPage } from './DashboardPage';
import { LoginPage } from './LoginPage';
import { CalculatorPage } from './CalculatorPage';
import { SimulatorPage } from './SimulatorPage';
import { RoadmapPage } from './RoadmapPage';
import { GoalsPage } from './GoalsPage';
import { BudgetPage } from './BudgetPage';
import { StatsPage } from './StatsPage';
import { SettingsPage } from './SettingsPage';

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
    calculator: <CalculatorPage />,
    simulator: <SimulatorPage />,
    roadmap: <RoadmapPage />,
    goals: <GoalsPage />,
    budget: <BudgetPage />,
    stats: <StatsPage />,
    settings: <SettingsPage />,
  };

  return pageMap[page];
}
