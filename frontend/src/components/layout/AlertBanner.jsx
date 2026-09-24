import React from 'react';
import { useOperator } from '../../context/OperatorContext';
import { AlertTriangle, ShieldX, Radio, CheckCircle, ArrowRight } from 'lucide-react';

export default function AlertBanner() {
  const {
    unacknowledgedHighAlerts,
    acknowledgeAlert,
    setActiveTab,
    telemetry,
  } = useOperator();

  if (unacknowledgedHighAlerts.length === 0 && telemetry.seatbeltFastened && telemetry.distanceToObjectMeters >= 3.0) {
    return null;
  }

  const primaryAlert = unacknowledgedHighAlerts[0] || {
    alertId: 'LIVE_SENSOR',
    type: !telemetry.seatbeltFastened ? 'seatbelt' : 'proximity',
    message: !telemetry.seatbeltFastened
      ? 'CRITICAL HAZARD: Seatbelt unfastened while machine is active'
      : `PROXIMITY WARNING: Obstacle detected at ${telemetry.distanceToObjectMeters.toFixed(1)}m (< 3.0m threshold)`,
    severity: 'high',
  };

  return (
    <div className="cat-alert-banner pulse-critical">
      <div className="alert-banner-left">
        <div className="alert-banner-icon-box">
          <AlertTriangle size={20} className="alert-icon-svg" />
        </div>
        <div>
          <div className="alert-banner-title">
            SAFETY ALERT #{primaryAlert.alertId} — CRITICAL ATTENTION REQUIRED
          </div>
          <div className="alert-banner-message">{primaryAlert.message}</div>
        </div>
      </div>

      <div className="alert-banner-actions">
        {primaryAlert.alertId !== 'LIVE_SENSOR' && (
          <button
            className="cat-btn cat-btn-sm cat-btn-secondary"
            onClick={() => acknowledgeAlert(primaryAlert.alertId)}
          >
            <CheckCircle size={14} />
            <span>ACKNOWLEDGE</span>
          </button>
        )}
        <button
          className="cat-btn cat-btn-sm cat-btn-danger"
          onClick={() => setActiveTab('safety')}
        >
          <span>VIEW SAFETY RADAR</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}
