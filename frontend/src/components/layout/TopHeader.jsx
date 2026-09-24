import React, { useState, useEffect } from 'react';
import { useOperator } from '../../context/OperatorContext';
import {
  CircleDot,
  Radio,
  Gauge,
  Clock,
  HardHat,
  Truck,
  PanelLeft,
  PanelLeftClose,
} from 'lucide-react';

export default function TopHeader() {
  const {
    activeTab,
    telemetry,
    activeMachine,
    operator,
    isSidebarOpen,
    toggleSidebar,
  } = useOperator();

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isProximityHazard = telemetry.distanceToObjectMeters < 3.0;

  const tabTitles = {
    dashboard: 'Cockpit Overview',
    tasks: 'Daily Tasks Scheduling',
    safety: 'Safety Interlocks & Hazard Radar',
    behavior: 'Unusual Behavior & Telemetry',
    estimator: 'AI Task Time Estimator (ML)',
    training: 'Operator Training Hub',
  };

  return (
    <header className="cat-top-header">
      {/* Static CAT Brand, Page Breadcrumb & Sidebar Quick Toggle */}
      <div className="top-header-left">
        {!isSidebarOpen && (
          <button
            className="top-header-menu-btn"
            onClick={toggleSidebar}
            title="Open Sidebar"
            aria-label="Open Sidebar"
          >
            <PanelLeft size={18} />
          </button>
        )}

        <div className="navbar-cat-brand">
          <div className="cat-logo-badge static-nav-logo" title="Caterpillar Intelligent Operator Assistant">
            CAT
          </div>
          <span className="navbar-brand-title">OPERATOR ASSISTANT</span>
        </div>

        <span className="navbar-divider">/</span>

        <div className="breadcrumb-trail">
          <span className="breadcrumb-active">{tabTitles[activeTab] || 'Dashboard'}</span>
        </div>
      </div>

      {/* In-Cab Live Status Gauges */}
      <div className="top-header-right">
        {/* Engine RPM */}
        <div className="top-hud-chip">
          <Gauge size={14} className="text-yellow-dark" />
          <span className="hud-label">ENGINE</span>
          <span className="hud-value mono-val">{telemetry.engineRpm} RPM</span>
        </div>

        {/* Seatbelt Interlock */}
        <div className={`top-hud-chip ${telemetry.seatbeltFastened ? 'chip-good' : 'chip-bad'}`}>
          <CircleDot size={13} className={telemetry.seatbeltFastened ? 'text-green' : 'text-danger pulse-dot'} />
          <span className="hud-label">SEATBELT</span>
          <span className="hud-value">{telemetry.seatbeltFastened ? 'LATCHED' : 'UNLATCHED'}</span>
        </div>

        {/* Proximity Distance */}
        <div className={`top-hud-chip ${isProximityHazard ? 'chip-bad' : 'chip-good'}`}>
          <Radio size={13} className={isProximityHazard ? 'text-danger pulse-dot' : 'text-green'} />
          <span className="hud-label">RADAR</span>
          <span className="hud-value mono-val">{telemetry.distanceToObjectMeters.toFixed(1)}m</span>
        </div>

        {/* Shift Clock */}
        <div className="top-hud-chip shift-clock-chip">
          <Clock size={13} className="text-grey-600" />
          <span className="mono-val font-semibold">{currentTime.toLocaleTimeString()}</span>
        </div>
      </div>
    </header>
  );
}
