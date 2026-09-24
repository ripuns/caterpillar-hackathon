import React from 'react';
import { useOperator } from '../../context/OperatorContext';
import {
  LayoutDashboard,
  CalendarCheck2,
  ShieldAlert,
  Activity,
  Sparkles,
  GraduationCap,
  HardHat,
  Truck,
  SlidersHorizontal,
  RefreshCw,
  Wifi,
  WifiOff,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

export default function Sidebar() {
  const {
    activeTab,
    setActiveTab,
    tasks,
    safetyAlerts,
    behaviorFlags,
    trainingModules,
    operator,
    machines,
    activeMachineId,
    setActiveMachineId,
    isBackendLive,
    isLoading,
    refreshAll,
    setIsDemoDrawerOpen,
    isSidebarOpen,
    setIsSidebarOpen,
    toggleSidebar,
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
    <aside className={`cat-sidebar ${isSidebarOpen ? 'sidebar-expanded' : 'sidebar-collapsed'}`}>
      {/* Sidebar Header with Toggle Button */}
      <div className="sidebar-brand-section">
        {isSidebarOpen ? (
          <div className="sidebar-brand-expanded">
            <div className="sidebar-brand-header-text">
              <span className="sidebar-header-title">CAB CONTROLS</span>
            </div>
            <button
              className="sidebar-toggle-btn"
              onClick={toggleSidebar}
              title="Collapse Sidebar"
              aria-label="Collapse Sidebar"
            >
              <ChevronLeft size={16} />
            </button>
          </div>
        ) : (
          <div className="sidebar-brand-mini">
            <button
              className="sidebar-toggle-btn mini"
              onClick={toggleSidebar}
              title="Expand Sidebar"
              aria-label="Expand Sidebar"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Operator & Unit Profile Box (Expanded only) */}
      {isSidebarOpen && (
        <div className="sidebar-profile-card">
          <div className="sidebar-profile-row">
            <HardHat size={16} className="text-yellow-dark" />
            <div className="profile-text">
              <span className="profile-name">{operator.name}</span>
              <span className="profile-sub">{operator.operatorId} • {operator.skillLevel}</span>
            </div>
          </div>

          <div className="sidebar-machine-select-row">
            <Truck size={15} className="text-grey-600" />
            <select
              className="sidebar-select-machine"
              value={activeMachineId}
              onChange={(e) => setActiveMachineId(e.target.value)}
              aria-label="Assigned Unit"
            >
              {machines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.id} — {m.name.replace('Hydraulic Excavator', 'Excavator').replace('Articulated Truck', 'Truck')}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Navigation Links */}
      <div className="sidebar-nav-section">
        {isSidebarOpen && <div className="sidebar-section-label">OPERATIONAL MODULES</div>}
        <nav className="sidebar-nav-list">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setActiveTab(item.id)}
                title={!isSidebarOpen ? item.label : undefined}
              >
                <div className="nav-item-left">
                  <Icon size={18} className="sidebar-nav-icon" />
                  {isSidebarOpen && <span className="sidebar-nav-label">{item.label}</span>}
                </div>

                {isSidebarOpen && item.badge && (
                  <span className={`cat-nav-badge badge-${item.badgeType}`}>
                    {item.badge}
                  </span>
                )}

                {!isSidebarOpen && item.badge && (
                  <span className="mini-badge-dot"></span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Sidebar Footer Controls */}
      <div className="sidebar-footer">
        {isSidebarOpen ? (
          <>
            <div className="sidebar-status-row">
              <div
                className={`connection-pill ${isBackendLive ? 'live' : 'mock'}`}
                title={isBackendLive ? 'Connected to NestJS API :3000' : 'Local fixture mode'}
              >
                {isBackendLive ? <Wifi size={12} /> : <WifiOff size={12} />}
                <span>{isBackendLive ? 'API LIVE :3000' : 'FIXTURE MODE'}</span>
              </div>

              <button
                className="cat-icon-btn cat-icon-btn-sm"
                onClick={refreshAll}
                disabled={isLoading}
                title="Refresh"
              >
                <RefreshCw size={13} className={isLoading ? 'spinning' : ''} />
              </button>
            </div>

            <button
              className="cat-btn cat-btn-primary cat-btn-sm sidebar-sim-btn"
              onClick={() => setIsDemoDrawerOpen(true)}
            >
              <SlidersHorizontal size={14} />
              <span>PANEL SIMULATOR</span>
            </button>
          </>
        ) : (
          <div className="sidebar-footer-mini">
            <button
              className="cat-icon-btn"
              onClick={() => setIsDemoDrawerOpen(true)}
              title="Panel Simulator"
            >
              <SlidersHorizontal size={16} className="text-yellow-dark" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
