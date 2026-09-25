import React from 'react';
import { useOperator } from '../../context/OperatorContext';
import {
  CalendarCheck2,
  ShieldAlert,
  ShieldCheck,
  Activity,
  Sparkles,
  Clock,
  Gauge,
  Droplet,
  Fuel,
  ArrowUpRight,
  Play,
  CheckCircle2,
  AlertTriangle,
  Compass,
  Radio,
  SlidersHorizontal,
  GraduationCap,
  HardHat,
  ChevronRight,
  Zap,
  DollarSign,
} from 'lucide-react';

export default function CockpitDashboard() {
  const {
    operator,
    activeMachine,
    tasks,
    updateTaskStatus,
    safetyAlerts,
    behaviorFlags,
    telemetry,
    setActiveTab,
    setIsDemoDrawerOpen,
    fleetCostSummary,
  } = useOperator();

  const activeTask = tasks.find((t) => t.status === 'in_progress') || tasks.find((t) => t.status === 'pending');
  const isProximityHazard = telemetry.distanceToObjectMeters < 3.0;
  const isIdlingExcessive = telemetry.idlingMinutes > 45 || telemetry.idlingTimeMin > 45;
  const currentIdling = telemetry.idlingMinutes || telemetry.idlingTimeMin || 52;
  const unackAlerts = safetyAlerts.filter((a) => !a.acknowledged);

  return (
    <div className="cockpit-modern-dashboard">
      {/* 1. Machine & Cockpit Live Command Strip */}
      <section className="cockpit-command-strip">
        <div className="command-strip-left">
          <div className="machine-avatar-badge">
            <span className="machine-code">{activeMachine.id}</span>
          </div>
          <div className="command-machine-details">
            <div className="command-machine-headline">
              <h1 className="command-machine-title">{activeMachine.name}</h1>
              <span className="live-telemetry-badge">
                <span className="telemetry-live-dot"></span>
                TELEMETRY LIVE (5Hz)
              </span>
            </div>
            <div className="command-meta-chips">
              <span className="meta-chip">
                <HardHat size={13} className="text-yellow" />
                <span>{operator.name}</span>
                <span className="chip-sub">({operator.operatorId} • {operator.skillLevel})</span>
              </span>
              <span className="meta-chip">
                <Clock size={13} className="text-muted" />
                <span>{telemetry.engineHours || 1420.5} Engine Hours</span>
              </span>
              <span className="meta-chip">
                <span>Unit Age: {activeMachine.age || 3} Years</span>
              </span>
            </div>
          </div>
        </div>

        <div className="command-strip-right">
          {/* Quick HUD Meters */}
          <div className="hud-meter-pill">
            <Gauge size={16} className="text-yellow" />
            <div className="hud-meter-body">
              <span className="hud-meter-label">ENGINE RPM</span>
              <span className="hud-meter-value mono-val">{telemetry.engineRpm} <small>RPM</small></span>
            </div>
          </div>

          <div className="hud-meter-pill">
            <Fuel size={16} className="text-green" />
            <div className="hud-meter-body">
              <span className="hud-meter-label">DIESEL FUEL</span>
              <span className="hud-meter-value mono-val">{telemetry.fuelLevelPct}%</span>
            </div>
            <div className="hud-mini-meter">
              <div className="hud-mini-bar" style={{ width: `${telemetry.fuelLevelPct}%` }}></div>
            </div>
          </div>

          <div className="hud-meter-pill">
            <Droplet size={16} className="text-yellow-dark" />
            <div className="hud-meter-body">
              <span className="hud-meter-label">HYDRAULIC</span>
              <span className="hud-meter-value mono-val">{telemetry.hydraulicPressurePsi} <small>PSI</small></span>
            </div>
          </div>
        </div>
      </section>

      {/* Fleet Cost/ROI Rollup (§14) */}
      {fleetCostSummary && (
        <section className="cost-roi-stat-row">
          <div className="cost-roi-stat-tile">
            <DollarSign size={16} className="text-yellow-dark" />
            <div className="hud-meter-body">
              <span className="hud-meter-label">IDLE COST (EST.)</span>
              <span className="hud-meter-value mono-val">${fleetCostSummary.totalIdleCostEstimate?.toLocaleString()}</span>
            </div>
          </div>
          <div className="cost-roi-stat-tile">
            <DollarSign size={16} className="text-yellow-dark" />
            <div className="hud-meter-body">
              <span className="hud-meter-label">OVERRUN COST (EST.)</span>
              <span className="hud-meter-value mono-val">${fleetCostSummary.totalOverrunCostEstimate?.toLocaleString()}</span>
            </div>
          </div>
          <div className="cost-roi-stat-tile">
            <DollarSign size={16} className="text-yellow-dark" />
            <div className="hud-meter-body">
              <span className="hud-meter-label">INCIDENT COST (EST.)</span>
              <span className="hud-meter-value mono-val">${fleetCostSummary.totalIncidentCostEstimate?.toLocaleString()}</span>
            </div>
          </div>
          <div className="cost-roi-stat-tile">
            <ShieldAlert size={16} className="text-yellow-dark" />
            <div className="hud-meter-body">
              <span className="hud-meter-label">TOTAL INCIDENTS</span>
              <span className="hud-meter-value mono-val">{fleetCostSummary.totalIncidentCount}</span>
            </div>
          </div>
        </section>
      )}

      {/* 2. Core Operational Cockpit Matrix (3 Sleek Fluid Columns) */}
      <section className="cockpit-matrix-grid">
        
        {/* Column 1: Primary Mission Deck (Active Task) */}
        <div className="modern-glass-card mission-deck-card">
          <div className="glass-card-header">
            <div className="card-header-icon-title">
              <div className="icon-halo-yellow">
                <CalendarCheck2 size={18} className="text-yellow-dark" />
              </div>
              <div>
                <h2 className="card-section-title">ACTIVE OPERATION</h2>
                <p className="card-section-sub">Outcome #1 — Scheduled Task Workflow</p>
              </div>
            </div>
            <span className={`status-pill ${activeTask?.status === 'in_progress' ? 'pill-active' : 'pill-pending'}`}>
              {activeTask?.status === 'in_progress' ? 'IN EXECUTION' : 'NEXT ON QUEUE'}
            </span>
          </div>

          {activeTask ? (
            <div className="mission-deck-body">
              <div className="mission-task-banner">
                <div className="mission-type-tag">{activeTask.taskType}</div>
                <span className="mission-id mono-val">{activeTask.taskId}</span>
              </div>

              <div className="mission-location-row">
                <span className="text-muted">Target Area:</span>
                <strong>{activeTask.location || 'Sector 4 — Excavation Berm'}</strong>
              </div>

              {/* Mission Progress Indicator */}
              <div className="mission-progress-container">
                <div className="mission-progress-header">
                  <span>Shift Progress</span>
                  <span className="mono-val font-bold text-yellow-dark">
                    {activeTask.status === 'completed' ? '100%' : activeTask.status === 'in_progress' ? '45%' : '0%'}
                  </span>
                </div>
                <div className="mission-progress-track">
                  <div
                    className="mission-progress-fill"
                    style={{
                      width: activeTask.status === 'completed' ? '100%' : activeTask.status === 'in_progress' ? '45%' : '0%',
                    }}
                  ></div>
                </div>
              </div>

              {/* Task Environmental & Time Specs */}
              <div className="mission-specs-row">
                <div className="mission-spec-item">
                  <Clock size={14} className="text-muted" />
                  <div>
                    <span className="spec-label">ESTIMATED</span>
                    <span className="spec-value mono-val">{activeTask.estimatedTimeMin} min</span>
                  </div>
                </div>
                <div className="mission-spec-item">
                  <Zap size={14} className="text-yellow" />
                  <div>
                    <span className="spec-label">WEATHER</span>
                    <span className="spec-value">{activeTask.weather}</span>
                  </div>
                </div>
                <div className="mission-spec-item">
                  <HardHat size={14} className="text-grey-600" />
                  <div>
                    <span className="spec-label">ASSIGNED</span>
                    <span className="spec-value">{activeTask.operatorId || 'OP-04'}</span>
                  </div>
                </div>
              </div>

              {/* Mission Action Buttons */}
              <div className="mission-actions-row">
                {activeTask.status === 'pending' ? (
                  <button
                    className="cat-btn cat-btn-primary"
                    onClick={() => updateTaskStatus(activeTask.taskId, 'in_progress')}
                  >
                    <Play size={15} />
                    <span>START OPERATION</span>
                  </button>
                ) : (
                  <button
                    className="cat-btn cat-btn-success"
                    onClick={() => updateTaskStatus(activeTask.taskId, 'completed')}
                  >
                    <CheckCircle2 size={15} />
                    <span>MARK COMPLETE</span>
                  </button>
                )}
                <button
                  className="cat-btn cat-btn-secondary"
                  onClick={() => setActiveTab('tasks')}
                >
                  <span>VIEW ALL TASKS</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          ) : (
            <div className="mission-empty-state">
              <CheckCircle2 size={32} className="text-green mb-2" />
              <p>All assigned shift tasks are complete.</p>
              <button className="cat-btn cat-btn-secondary cat-btn-sm mt-3" onClick={() => setActiveTab('tasks')}>
                Schedule New Task
              </button>
            </div>
          )}
        </div>

        {/* Column 2: Safety & Radar Interlock Deck */}
        <div className="modern-glass-card safety-deck-card">
          <div className="glass-card-header">
            <div className="card-header-icon-title">
              <div className={`icon-halo-${telemetry.seatbeltFastened && !isProximityHazard ? 'green' : 'red'}`}>
                <ShieldAlert size={18} className={telemetry.seatbeltFastened && !isProximityHazard ? 'text-green' : 'text-danger'} />
              </div>
              <div>
                <h2 className="card-section-title">SAFETY & RADAR</h2>
                <p className="card-section-sub">Outcome #2 — Interlock & 360° Proximity</p>
              </div>
            </div>
            <span className={`status-pill ${telemetry.seatbeltFastened && !isProximityHazard ? 'pill-safe' : 'pill-danger'}`}>
              {telemetry.seatbeltFastened && !isProximityHazard ? 'ALL CLEAR' : 'SAFETY ALERT'}
            </span>
          </div>

          <div className="safety-deck-body">
            {/* Live Dual Sensors Display */}
            <div className="safety-dual-tiles">
              {/* Seatbelt Sensor Tile */}
              <div className={`safety-sensor-tile ${telemetry.seatbeltFastened ? 'tile-safe' : 'tile-danger'}`}>
                <div className="sensor-tile-top">
                  <span className="sensor-tile-name">SEATBELT LATCH</span>
                  {telemetry.seatbeltFastened ? (
                    <ShieldCheck size={16} className="text-green" />
                  ) : (
                    <ShieldAlert size={16} className="text-danger pulse-dot" />
                  )}
                </div>
                <div className="sensor-tile-val">
                  {telemetry.seatbeltFastened ? 'FASTENED' : 'UNFASTENED'}
                </div>
                <div className="sensor-tile-rule">Required while machine active</div>
              </div>

              {/* 360 Proximity Sensor Tile */}
              <div className={`safety-sensor-tile ${!isProximityHazard ? 'tile-safe' : 'tile-danger'}`}>
                <div className="sensor-tile-top">
                  <span className="sensor-tile-name">360° RADAR</span>
                  <Radio size={16} className={isProximityHazard ? 'text-danger pulse-dot' : 'text-green'} />
                </div>
                <div className="sensor-tile-val mono-val">
                  {telemetry.distanceToObjectMeters.toFixed(1)}m
                </div>
                <div className="sensor-tile-rule">Safety Envelope: &lt; 3.0m Hazard</div>
              </div>
            </div>

            {/* Radar Mini Sweep Preview */}
            <div className="radar-mini-sweep" onClick={() => setActiveTab('safety')}>
              <div className="radar-mini-grid">
                <div className={`radar-mini-target ${isProximityHazard ? 'hazard' : ''}`} title="Nearest Object"></div>
                <div className="radar-mini-blip"></div>
                <div className="radar-center-machine">CAT</div>
              </div>
              <div className="radar-mini-label">
                <span>{isProximityHazard ? '⚠️ Proximity Alert within 3.0m Zone' : '✓ 360° Safety Perimeter Clear'}</span>
              </div>
            </div>

            {/* Safety Actions */}
            <div className="safety-actions-row">
              <button
                className="cat-btn cat-btn-secondary cat-btn-sm"
                onClick={() => setActiveTab('safety')}
              >
                <Compass size={14} />
                <span>OPEN RADAR</span>
              </button>
              <button
                className="cat-btn cat-btn-primary cat-btn-sm"
                onClick={() => setIsDemoDrawerOpen(true)}
              >
                <SlidersHorizontal size={14} />
                <span>SIMULATE SENSORS</span>
              </button>
            </div>
          </div>
        </div>

        {/* Column 3: AI Intelligence & Telemetry Deck */}
        <div className="modern-glass-card intelligence-deck-card">
          <div className="glass-card-header">
            <div className="card-header-icon-title">
              <div className="icon-halo-yellow">
                <Sparkles size={18} className="text-yellow-dark" />
              </div>
              <div>
                <h2 className="card-section-title">AI & TELEMETRY</h2>
                <p className="card-section-sub">Outcome #3 & #4 — ML & Behavior</p>
              </div>
            </div>
            <span className={`status-pill ${isIdlingExcessive ? 'pill-warning' : 'pill-safe'}`}>
              {isIdlingExcessive ? 'HIGH IDLE' : 'OPTIMAL'}
            </span>
          </div>

          <div className="intelligence-deck-body">
            {/* Idling Monitor Tile */}
            <div className={`idling-stream-box ${isIdlingExcessive ? 'stream-warning' : ''}`}>
              <div className="idling-stream-header">
                <div className="idling-stream-label">
                  <Activity size={14} className={isIdlingExcessive ? 'text-amber' : 'text-green'} />
                  <span>IDLING DURATION</span>
                </div>
                <span className="mono-val font-bold">{currentIdling}m / 45m limit</span>
              </div>
              <div className="idling-stream-track">
                <div
                  className={`idling-stream-fill ${isIdlingExcessive ? 'fill-exceeded' : ''}`}
                  style={{ width: `${Math.min((currentIdling / 60) * 100, 100)}%` }}
                ></div>
              </div>
              <p className="idling-stream-hint">
                {isIdlingExcessive
                  ? 'Exceeds 45m threshold. Auto-idle recommended.'
                  : 'Fuel consumption efficiency within optimal range.'}
              </p>
            </div>

            {/* AI Time Estimator Quick Card */}
            <div className="ai-estimator-quick-tile" onClick={() => setActiveTab('estimator')}>
              <div className="ai-tile-header">
                <span className="ai-tile-tag">ML PREDICTOR</span>
                <span className="ai-tile-model font-mono">RandomForestRegressor</span>
              </div>
              <p className="ai-tile-desc">
                Real-time task time estimation adjusted for operator skill, weather condition, and machine age.
              </p>
              <div className="ai-tile-link">
                <span>Test Interactive ML Estimator</span>
                <ChevronRight size={14} />
              </div>
            </div>

            {/* Quick Training Shortcut */}
            <div className="training-quick-pill" onClick={() => setActiveTab('training')}>
              <GraduationCap size={16} className="text-yellow-dark" />
              <div className="training-quick-text">
                <span className="training-quick-title">OPERATOR TRAINING HUB</span>
                <span className="training-quick-sub">Articles • Videos • Cab Simulators</span>
              </div>
              <ChevronRight size={14} className="text-muted" />
            </div>
          </div>
        </div>

      </section>
    </div>
  );
}

