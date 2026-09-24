import React from 'react';
import { useOperator } from '../../context/OperatorContext';
import {
  LayoutDashboard,
  CalendarCheck2,
  ShieldAlert,
  Activity,
  Sparkles,
  GraduationCap,
} from 'lucide-react';

export default function Navbar() {
  const {
    activeTab,
    setActiveTab,
    tasks,
    safetyAlerts,
    behaviorFlags,
    trainingModules,
  } = useOperator();

  const pendingTasksCount = tasks.filter((t) => t.status !== 'completed').length;
  const unackAlertsCount = safetyAlerts.filter((a) => !a.acknowledged).length;
  const behaviorFlagsCount = behaviorFlags.length;
  const completedTrainingCount = trainingModules.filter((m) => m.completionStatus === 'Completed').length;

  const navItems = [
    {
      id: 'dashboard',
      label: 'Overview',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'tasks',
      label: 'Daily Tasks',
      icon: CalendarCheck2,
      badge: pendingTasksCount > 0 ? `${pendingTasksCount}` : null,
      badgeType: 'yellow',
    },
    {
      id: 'safety',
      label: 'Safety & Hazards',
      icon: ShieldAlert,
      badge: unackAlertsCount > 0 ? `${unackAlertsCount}` : null,
      badgeType: 'red',
    },
    {
      id: 'behavior',
      label: 'Unusual Behavior',
      icon: Activity,
      badge: behaviorFlagsCount > 0 ? `${behaviorFlagsCount}` : null,
      badgeType: 'amber',
    },
    {
      id: 'estimator',
      label: 'AI Time Estimator',
      icon: Sparkles,
      badge: 'ML',
      badgeType: 'dark',
    },
    {
      id: 'training',
      label: 'Training Hub',
      icon: GraduationCap,
      badge: `${completedTrainingCount}/${trainingModules.length}`,
      badgeType: 'green',
    },
  ];

  return (
    <nav className="cat-navbar">
      <div className="cat-nav-tabs">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              className={`cat-nav-tab ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <Icon size={17} className="nav-icon" />
              <span className="nav-tab-label">{item.label}</span>
              {item.badge && (
                <span className={`cat-nav-badge badge-${item.badgeType}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
