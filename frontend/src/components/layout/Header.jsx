import React from 'react';
import { useOperator } from '../../context/OperatorContext';
import {
  HardHat,
  RefreshCw,
  SlidersHorizontal,
  Wifi,
  WifiOff,
  CircleDot,
  Radio,
  Truck,
} from 'lucide-react';

export default function Header() {
  const {
    operator,
    machines,
    activeMachineId,
    setActiveMachineId,
    activeMachine,
    telemetry,
    isBackendLive,
    isLoading,
    refreshAll,
    setIsDemoDrawerOpen,
  } = useOperator();

  const isProximityHazard = telemetry.distanceToObjectMeters < 3.0;

  return (
    <header className="cat-header">
      {/* Brand & Unit Selector */}
      <div className="cat-header-left">
        <div className="cat-brand">
          <div className="cat-logo-badge">CAT</div>
          <div>
            <div className="cat-title">SMART OPERATOR ASSISTANT</div>
            <div className="cat-subtitle">CAB COMPANION • FLEET INTEGRATED</div>
          </div>
        </div>

        <div className="unit-pill">
          <Truck size={15} className="text-yellow-dark" />
          <select
            className="cat-select-machine"
            value={activeMachineId}
            onChange={(e) => setActiveMachineId(e.target.value)}
            aria-label="Assigned Machine Unit"
          >
            {machines.map((m) => (
              <option key={m.id} value={m.id}>
                {m.id} — {m.name}
              </option>
            ))}
          </select>
        </div>

        <div className="operator-pill">
          <HardHat size={15} className="text-grey-600" />
          <span className="operator-name">{operator.name}</span>
          <span className="operator-skill-badge">{operator.skillLevel}</span>
        </div>
      </div>

      {/* Quick Telemetry & Actions */}
      <div className="cat-header-right">
        {/* Quick Safety State Summary */}
        <div className="header-status-group">
          <div className={`quick-status-chip ${telemetry.seatbeltFastened ? 'status-good' : 'status-bad'}`}>
            <CircleDot size={12} className={telemetry.seatbeltFastened ? 'text-green' : 'text-danger pulse-dot'} />
            <span>{telemetry.seatbeltFastened ? 'SEATBELT ON' : 'SEATBELT OFF'}</span>
          </div>

          <div className={`quick-status-chip ${isProximityHazard ? 'status-bad' : 'status-good'}`}>
            <Radio size={12} className={isProximityHazard ? 'text-danger pulse-dot' : 'text-green'} />
            <span>RADAR: {telemetry.distanceToObjectMeters.toFixed(1)}m</span>
          </div>
        </div>

        {/* API Mode Indicator */}
        <div
          className={`connection-pill ${isBackendLive ? 'live' : 'mock'}`}
          title={isBackendLive ? 'Live API Connected on :3000' : 'Local Fixture Data Active'}
        >
          {isBackendLive ? <Wifi size={13} /> : <WifiOff size={13} />}
          <span>{isBackendLive ? 'LIVE API :3000' : 'FIXTURE MODE'}</span>
        </div>

        {/* Sync Button */}
        <button
          className="cat-icon-btn"
          onClick={refreshAll}
          disabled={isLoading}
          title="Refresh Data"
        >
          <RefreshCw size={15} className={isLoading ? 'spinning' : ''} />
        </button>

        {/* Simulator Button */}
        <button
          className="cat-btn cat-btn-primary cat-btn-sm"
          onClick={() => setIsDemoDrawerOpen(true)}
        >
          <SlidersHorizontal size={14} />
          <span>SIMULATOR</span>
        </button>
      </div>
    </header>
  );
}
