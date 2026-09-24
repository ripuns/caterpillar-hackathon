import React from 'react';
import { useOperator } from '../../context/OperatorContext';
import IdlingGauge from './IdlingGauge';
import TelemetryCharts from './TelemetryCharts';
import {
  Activity,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Flame,
  TrendingDown,
  HardHat,
  Cpu,
  CheckCircle2,
  BookOpen,
} from 'lucide-react';

export default function BehaviorView() {
  const {
    behaviorFlags,
    telemetry,
    telemetryHistory,
    operator,
    activeMachineId,
    setActiveTab,
  } = useOperator();

  const idlingFlag = behaviorFlags.find((f) => f.type === 'excessive_idling');
  const unsafePatternFlag = behaviorFlags.find((f) => f.type === 'unsafe_pattern');

  return (
    <div className="behavior-view">
      {/* View Header */}
      <div className="view-header-row">
        <div>
          <h1 className="view-title">UNUSUAL BEHAVIOR DETECTION & TELEMETRY</h1>
          <p className="view-subtitle">
            Outcome #4 — Autonomous monitoring of operational patterns: excessive engine idling (&gt; 45m) and recurring safety alert patterns (≥ 3 incidents).
          </p>
        </div>

        <div className="view-header-actions">
          <button
            className="cat-btn cat-btn-secondary"
            onClick={() => setActiveTab('training')}
          >
            <BookOpen size={16} />
            <span>ECO-DRIVE TRAINING</span>
          </button>
        </div>
      </div>

      {/* Top Section: Radial Idling Gauge & Pattern Detector */}
      <div className="behavior-top-grid">
        {/* Component 1: Excessive Idling Gauge */}
        <IdlingGauge
          currentIdlingMin={telemetry.idlingMinutes || telemetry.idlingTimeMin || 58}
          thresholdMin={45}
        />

        {/* Component 2: Unsafe Pattern Detector (Rule: >= 3 safety alerts) */}
        <div className="cat-card unsafe-pattern-card">
          <div className="cat-card-header">
            <div className="cat-card-title">
              <ShieldAlert size={18} className={unsafePatternFlag ? 'text-danger' : 'text-green'} />
              <span>RECURRING UNSAFE PATTERN DETECTOR</span>
            </div>
            <span
              className={`cat-badge ${
                unsafePatternFlag ? 'cat-badge-red pulse-alert' : 'cat-badge-green'
              }`}
            >
              {unsafePatternFlag ? 'PATTERN FLAGGED' : 'LOW RISK PROFILE'}
            </span>
          </div>

          <div className="pattern-body">
            <div className="pattern-score-row">
              <div className="pattern-score-box">
                <span className="text-muted text-xs">SESSION INFRACTIONS</span>
                <div className={`mono-val text-xl ${unsafePatternFlag ? 'text-danger' : 'text-green'}`}>
                  {unsafePatternFlag ? unsafePatternFlag.value : 1} / 3 Threshold
                </div>
              </div>
              <div className="pattern-status-badge">
                {unsafePatternFlag ? (
                  <span className="text-danger font-semibold">⚠️ Supervisory Flag Active</span>
                ) : (
                  <span className="text-green font-semibold">✓ Normal Compliance</span>
                )}
              </div>
            </div>

            <p className="pattern-desc">
              Deterministic Logic: <code>if (operator_alerts_in_session &gt;= 3) flag('unsafe_pattern')</code>.
              Triggers in-cab coaching suggestions and supervisor review before high-risk tasks.
            </p>

            <div className="pattern-action-box">
              <span className="text-muted text-xs">RECOMMENDED OPERATOR ACTION:</span>
              <p className="pattern-recommendation">
                {unsafePatternFlag
                  ? 'Complete Module TH001: Safe Excavation Practices and recalibrate proximity radar.'
                  : 'Maintain standard 3-point contact and continuous perimeter scanning.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Historical Telemetry Charts (Fuel vs Idling & Load Cycles) */}
      <TelemetryCharts history={telemetryHistory} />

      {/* Behavior Flags Audit Table */}
      <div className="cat-card flags-table-card">
        <div className="cat-card-header">
          <div className="cat-card-title">
            <Activity size={18} className="text-yellow" />
            <span>ACTIVE BEHAVIOR FLAGS AUDIT FEED (GET /behavior-flags)</span>
          </div>
          <span className="cat-badge cat-badge-muted mono-val">{behaviorFlags.length} RECORDED</span>
        </div>

        <div className="flags-list">
          {behaviorFlags.map((flag) => (
            <div key={flag.flagId} className="flag-item-card">
              <div className="flag-icon-col">
                {flag.type === 'excessive_idling' ? (
                  <Clock size={20} className="text-amber" />
                ) : (
                  <ShieldAlert size={20} className="text-danger" />
                )}
              </div>

              <div className="flag-main-col">
                <div className="flag-header-row">
                  <div className="flag-tags">
                    <span className="mono-val flag-id-chip">{flag.flagId}</span>
                    <span className={`cat-badge ${flag.type === 'excessive_idling' ? 'cat-badge-amber' : 'cat-badge-red'}`}>
                      {flag.type.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className="cat-badge cat-badge-muted">
                      VALUE: {flag.value} (THRESHOLD: {flag.threshold})
                    </span>
                  </div>
                  <span className="mono-val text-muted text-xs">
                    {new Date(flag.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                <div className="flag-message">{flag.message}</div>
                {flag.recommendation && (
                  <div className="flag-rec-text">
                    <strong className="text-yellow">Recommendation:</strong> {flag.recommendation}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
