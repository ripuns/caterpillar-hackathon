import React from 'react';
import { useOperator } from '../../context/OperatorContext';
import {
  X,
  SlidersHorizontal,
  ShieldAlert,
  Clock,
  RotateCcw,
  Zap,
  Gauge,
  HardHat,
  Radar,
  CheckCircle2,
} from 'lucide-react';

export default function SimulationDrawer() {
  const {
    isDemoDrawerOpen,
    setIsDemoDrawerOpen,
    telemetry,
    triggerSimulation,
    operator,
    setOperator,
    isBackendLive,
  } = useOperator();

  if (!isDemoDrawerOpen) return null;

  return (
    <div className="demo-drawer-backdrop" onClick={() => setIsDemoDrawerOpen(false)}>
      <div className="demo-drawer-panel" onClick={(e) => e.stopPropagation()}>
        <div className="demo-drawer-header">
          <div className="demo-drawer-title">
            <SlidersHorizontal size={18} className="text-yellow" />
            <span>PANEL PRESENTATION & SIMULATION CONTROL</span>
          </div>
          <button
            className="cat-icon-btn"
            onClick={() => setIsDemoDrawerOpen(false)}
            title="Close Simulator"
          >
            <X size={18} />
          </button>
        </div>

        <div className="demo-drawer-body">
          <div className="demo-section-alert">
            <Zap size={16} className="text-yellow" />
            <span>
              Use these interactive triggers during panel reviews to showcase live deterministic safety rules, idling detection, and ML estimation.
            </span>
          </div>

          {/* 1. Rule: Seatbelt Interlock */}
          <div className="simulation-card">
            <div className="sim-card-header">
              <div className="sim-card-title">
                <ShieldAlert size={16} className={telemetry.seatbeltFastened ? 'text-green' : 'text-danger'} />
                <span>Rule #1: Seatbelt Compliance Sensor</span>
              </div>
              <span className={`cat-badge ${telemetry.seatbeltFastened ? 'cat-badge-green' : 'cat-badge-red'}`}>
                {telemetry.seatbeltFastened ? 'FASTENED' : 'UNFASTENED (ALERT)'}
              </span>
            </div>
            <p className="sim-card-desc">
              Rule logic: <code>if (seatbelt_status === 'Unfastened') trigger_alert('seatbelt', 'high')</code>
            </p>
            <button
              className={`cat-btn cat-btn-sm ${telemetry.seatbeltFastened ? 'cat-btn-danger' : 'cat-btn-success'}`}
              onClick={() => triggerSimulation('TOGGLE_SEATBELT')}
            >
              {telemetry.seatbeltFastened ? 'Simulate Unfastening Seatbelt' : 'Fasten Seatbelt (Clear)'}
            </button>
          </div>

          {/* 2. Rule: Proximity Radar Sensor */}
          <div className="simulation-card">
            <div className="sim-card-header">
              <div className="sim-card-title">
                <Radar size={16} className={telemetry.distanceToObjectMeters < 3.0 ? 'text-danger' : 'text-cyan'} />
                <span>Rule #2: Proximity Hazard Sensor</span>
              </div>
              <span className={`cat-badge ${telemetry.distanceToObjectMeters < 3.0 ? 'cat-badge-red' : 'cat-badge-green'}`}>
                {telemetry.distanceToObjectMeters.toFixed(1)}m (Threshold &lt; 3.0m)
              </span>
            </div>
            <p className="sim-card-desc">
              Rule logic: <code>if (distance &lt; 3.0m) trigger_alert('proximity')</code>
            </p>
            <div className="sim-proximity-controls">
              <input
                type="range"
                min="0.5"
                max="10.0"
                step="0.1"
                value={telemetry.distanceToObjectMeters}
                onChange={(e) => triggerSimulation('SET_PROXIMITY', e.target.value)}
                className="cat-slider"
              />
              <div className="slider-labels">
                <span className="text-danger">0.5m (Hazard)</span>
                <span className="text-yellow">3.0m (Limit)</span>
                <span className="text-green">10.0m (Clear)</span>
              </div>
            </div>
            <div className="sim-button-group">
              <button
                className="cat-btn cat-btn-sm cat-btn-secondary"
                onClick={() => triggerSimulation('SET_PROXIMITY', 1.8)}
              >
                Set Danger (1.8m)
              </button>
              <button
                className="cat-btn cat-btn-sm cat-btn-secondary"
                onClick={() => triggerSimulation('SET_PROXIMITY', 5.5)}
              >
                Set Clear (5.5m)
              </button>
            </div>
          </div>

          {/* 3. Rule: Excessive Idling */}
          <div className="simulation-card">
            <div className="sim-card-header">
              <div className="sim-card-title">
                <Clock size={16} className={telemetry.idlingTimeMin > 45 ? 'text-amber' : 'text-green'} />
                <span>Rule #3: Unusual Behavior (Idling Threshold)</span>
              </div>
              <span className={`cat-badge ${telemetry.idlingTimeMin > 45 ? 'cat-badge-amber' : 'cat-badge-green'}`}>
                {telemetry.idlingTimeMin} min (Threshold &gt; 45m)
              </span>
            </div>
            <p className="sim-card-desc">
              Rule logic: <code>if (idling_time_min &gt; 45) flag('excessive_idling')</code>
            </p>
            <button
              className="cat-btn cat-btn-sm cat-btn-secondary"
              onClick={() => triggerSimulation('TRIGGER_IDLING_SPIKE')}
            >
              Simulate 58 Min Idling Spike
            </button>
          </div>

          {/* 4. Operator Profile Switch */}
          <div className="simulation-card">
            <div className="sim-card-header">
              <div className="sim-card-title">
                <HardHat size={16} className="text-yellow" />
                <span>Simulate Operator Skill Profile</span>
              </div>
              <span className="cat-badge cat-badge-yellow">{operator.skillLevel}</span>
            </div>
            <p className="sim-card-desc">
              Affects regression multipliers in <code>/predict-task-time</code> (Beginner: +25%, Expert: -8%).
            </p>
            <div className="sim-button-group">
              {['Beginner', 'Intermediate', 'Expert'].map((skill) => (
                <button
                  key={skill}
                  className={`cat-btn cat-btn-sm ${operator.skillLevel === skill ? 'cat-btn-primary' : 'cat-btn-secondary'}`}
                  onClick={() => setOperator((prev) => ({ ...prev, skillLevel: skill }))}
                >
                  {skill}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="demo-drawer-footer">
          <button
            className="cat-btn cat-btn-secondary cat-btn-sm"
            onClick={() => triggerSimulation('RESET_DEMO')}
          >
            <RotateCcw size={14} />
            <span>RESET TO NOMINAL</span>
          </button>
          <button
            className="cat-btn cat-btn-primary cat-btn-sm"
            onClick={() => setIsDemoDrawerOpen(false)}
          >
            <CheckCircle2 size={14} />
            <span>DONE</span>
          </button>
        </div>
      </div>
    </div>
  );
}
