import React, { useState } from 'react';
import { useOperator } from '../../context/OperatorContext';
import ProximityRadar from './ProximityRadar';
import IncidentModal from './IncidentModal';
import {
  ShieldAlert,
  ShieldCheck,
  Shield,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Filter,
  PlusCircle,
  FileSpreadsheet,
  Clock,
  Radio,
  Sliders,
  Check,
} from 'lucide-react';

export default function SafetyView() {
  const {
    safetyAlerts,
    acknowledgeAlert,
    telemetry,
    triggerSimulation,
    operator,
    activeMachineId,
  } = useOperator();

  const [severityFilter, setSeverityFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);

  const filteredAlerts = safetyAlerts.filter((a) => {
    const matchesSeverity = severityFilter === 'all' || a.severity === severityFilter;
    const matchesType = typeFilter === 'all' || a.type === typeFilter;
    return matchesSeverity && matchesType;
  });

  const highAlertsCount = safetyAlerts.filter((a) => a.severity === 'high').length;
  const unackCount = safetyAlerts.filter((a) => !a.acknowledged).length;

  return (
    <div className="safety-view">
      {/* View Header */}
      <div className="view-header-row">
        <div>
          <h1 className="view-title">SAFETY MONITOR & HAZARD INTERLOCK</h1>
          <p className="view-subtitle">
            Outcome #2 — Real-time operator safety compliance, proximity hazard radar, and audit incident logging.
          </p>
        </div>

        <div className="view-header-actions">
          <button
            className="cat-btn cat-btn-danger"
            onClick={() => setIsIncidentModalOpen(true)}
          >
            <PlusCircle size={16} />
            <span>LOG INCIDENT</span>
          </button>
        </div>
      </div>

      {/* Primary Status Banner Cards */}
      <div className="safety-cards-top">
        {/* Seatbelt Interlock Card */}
        <div className={`cat-card safety-feature-card ${telemetry.seatbeltFastened ? 'border-green' : 'border-danger'}`}>
          <div className="safety-card-top-row">
            <div className="safety-card-title">
              {telemetry.seatbeltFastened ? (
                <ShieldCheck size={22} className="text-green" />
              ) : (
                <ShieldAlert size={22} className="text-danger pulse-dot" />
              )}
              <span>SEATBELT INTERLOCK</span>
            </div>
            <span className={`cat-badge ${telemetry.seatbeltFastened ? 'cat-badge-green' : 'cat-badge-red'}`}>
              {telemetry.seatbeltFastened ? 'COMPLIANT' : 'VIOLATION DETECTED'}
            </span>
          </div>

          <p className="safety-card-desc">
            Deterministic Rule: Evaluates cabin harness switch. If machine RPM &gt; 500 while harness unlatched, triggers High-Severity audible/visual alert.
          </p>

          <div className="safety-card-bottom">
            <span className="text-muted">Sensor State: <strong>{telemetry.seatbeltFastened ? 'Latched (Closed Circuit)' : 'Unlatched (Open Circuit)'}</strong></span>
            <button
              className={`cat-btn cat-btn-sm ${telemetry.seatbeltFastened ? 'cat-btn-secondary' : 'cat-btn-success'}`}
              onClick={() => triggerSimulation('TOGGLE_SEATBELT')}
            >
              {telemetry.seatbeltFastened ? 'Simulate Unfasten' : 'Fasten Seatbelt (Clear)'}
            </button>
          </div>
        </div>

        {/* Explainability & Auditability Story (Panel Talking Point) */}
        <div className="cat-card explainability-card">
          <div className="safety-card-top-row">
            <div className="safety-card-title">
              <Shield size={22} className="text-yellow" />
              <span>DETERMINISTIC SAFETY RULES</span>
            </div>
            <span className="cat-badge cat-badge-yellow">100% AUDITABLE</span>
          </div>

          <p className="safety-card-desc">
            Caterpillar safety architecture uses deterministic, rule-based verification over black-box AI. Every alert directly maps to inspectable thresholds:
          </p>

          <div className="rules-mini-list">
            <div className="rule-mini-item">
              <span className="mono-val text-yellow">RULE 1:</span> Seatbelt == "Unfastened" → Alert(high)
            </div>
            <div className="rule-mini-item">
              <span className="mono-val text-yellow">RULE 2:</span> Distance &lt; 3.0m → Alert(proximity)
            </div>
            <div className="rule-mini-item">
              <span className="mono-val text-yellow">RULE 3:</span> Session Alerts ≥ 3 → Flag(unsafe_pattern)
            </div>
          </div>
        </div>
      </div>

      {/* Proximity Radar Interactive Component */}
      <ProximityRadar
        distance={telemetry.distanceToObjectMeters}
        onSimulateDistance={(dist) => triggerSimulation('SET_PROXIMITY', dist)}
      />

      {/* Real-time Safety Alerts Feed */}
      <div className="cat-card alerts-feed-card">
        <div className="cat-card-header">
          <div className="cat-card-title">
            <AlertTriangle size={18} className="text-yellow" />
            <span>REAL-TIME SAFETY ALERTS & INCIDENT STREAM (GET /safety-alerts)</span>
          </div>

          <div className="feed-filters">
            <span className="filter-label">SEVERITY:</span>
            {['all', 'high', 'medium', 'low'].map((sev) => (
              <button
                key={sev}
                className={`filter-chip-btn ${severityFilter === sev ? 'active' : ''}`}
                onClick={() => setSeverityFilter(sev)}
              >
                {sev.toUpperCase()}
              </button>
            ))}

            <span className="filter-label ml-3">TYPE:</span>
            {['all', 'seatbelt', 'proximity', 'incident'].map((t) => (
              <button
                key={t}
                className={`filter-chip-btn ${typeFilter === t ? 'active' : ''}`}
                onClick={() => setTypeFilter(t)}
              >
                {t.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="alerts-list">
          {filteredAlerts.length === 0 ? (
            <div className="alerts-empty-state">
              <ShieldCheck size={32} className="text-green mb-2" />
              <h4>No Active Safety Alerts in Selected Filter</h4>
              <p className="text-muted">All safety sensors and telemetry checks are operating normally.</p>
            </div>
          ) : (
            filteredAlerts.map((alert) => {
              const isHigh = alert.severity === 'high';
              const isAck = alert.acknowledged;

              return (
                <div
                  key={alert.alertId}
                  className={`alert-item-card ${isHigh && !isAck ? 'alert-high-unack pulse-alert' : ''}`}
                >
                  <div className="alert-item-icon-col">
                    {alert.severity === 'high' ? (
                      <AlertOctagon size={22} className="text-danger" />
                    ) : alert.severity === 'medium' ? (
                      <AlertTriangle size={22} className="text-warning" />
                    ) : (
                      <FileSpreadsheet size={22} className="text-grey-700" />
                    )}
                  </div>

                  <div className="alert-item-main">
                    <div className="alert-item-header">
                      <div className="alert-tags-row">
                        <span className="alert-id-chip mono-val">{alert.alertId}</span>
                        <span
                          className={`cat-badge ${
                            alert.severity === 'high'
                              ? 'cat-badge-red'
                              : alert.severity === 'medium'
                              ? 'cat-badge-amber'
                              : 'cat-badge-muted'
                          }`}
                        >
                          {alert.severity} SEVERITY
                        </span>
                        <span className="cat-badge cat-badge-muted">{alert.type}</span>
                      </div>

                      <div className="alert-timestamp mono-val">
                        <Clock size={12} />
                        <span>{new Date(alert.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </div>

                    <h4 className="alert-message">{alert.message}</h4>
                    {alert.details && <p className="alert-details">{alert.details}</p>}

                    <div className="alert-meta-footer">
                      <span>Machine: <strong className="text-yellow">{alert.machineId}</strong></span>
                      <span>Operator: <strong>{alert.operatorId}</strong></span>
                    </div>
                  </div>

                  <div className="alert-item-actions">
                    {isAck ? (
                      <span className="ack-status-tag text-green">
                        <Check size={14} /> ACKNOWLEDGED
                      </span>
                    ) : (
                      <button
                        className="cat-btn cat-btn-secondary cat-btn-sm"
                        onClick={() => acknowledgeAlert(alert.alertId)}
                      >
                        <CheckCircle2 size={14} />
                        <span>ACKNOWLEDGE</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Incident Modal */}
      <IncidentModal
        isOpen={isIncidentModalOpen}
        onClose={() => setIsIncidentModalOpen(false)}
      />
    </div>
  );
}
