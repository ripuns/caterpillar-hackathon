import React from 'react';
import { Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function IdlingGauge({ currentIdlingMin = 52, thresholdMin = 45 }) {
  const maxScale = 75;
  const isExceeded = currentIdlingMin > thresholdMin;
  const pct = Math.min((currentIdlingMin / maxScale) * 100, 100);

  // SVG Gauge calculations (semi-circle arc)
  const radius = 70;
  const circumference = Math.PI * radius; // 180 degree arc
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  return (
    <div className="cat-card idling-gauge-card">
      <div className="cat-card-header">
        <div className="cat-card-title">
          <Clock size={18} className={isExceeded ? 'text-amber' : 'text-green'} />
          <span>EXCESSIVE IDLING DETECTION (GET /behavior-flags)</span>
        </div>
        <span
          className={`cat-badge ${
            isExceeded ? 'cat-badge-amber pulse-alert' : 'cat-badge-green'
          }`}
        >
          {isExceeded ? 'THRESHOLD EXCEEDED' : 'OPTIMAL EFFICIENCY'}
        </span>
      </div>

      <div className="idling-gauge-layout">
        {/* SVG Semi-Circular Gauge */}
        <div className="gauge-visual-wrap">
          <svg className="semi-gauge-svg" viewBox="0 0 180 110">
            {/* Background Arc */}
            <path
              d="M 20 95 A 70 70 0 0 1 160 95"
              fill="none"
              stroke="#222a38"
              strokeWidth="16"
              strokeLinecap="round"
            />
            {/* 45m Threshold Marker tick */}
            <path
              d="M 125 35 L 132 28"
              stroke="#f59e0b"
              strokeWidth="3"
            />
            {/* Active Progress Arc */}
            <path
              d="M 20 95 A 70 70 0 0 1 160 95"
              fill="none"
              stroke={isExceeded ? '#f59e0b' : '#10b981'}
              strokeWidth="16"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="gauge-arc-anim"
            />
          </svg>

          <div className="gauge-center-reading">
            <div className={`gauge-number mono-val ${isExceeded ? 'text-amber' : 'text-main'}`}>
              {currentIdlingMin}
            </div>
            <div className="gauge-sub-label">MINUTES IDLE</div>
          </div>
        </div>

        {/* Diagnostic Explanation & Details */}
        <div className="idling-diagnostic-col">
          <div className="threshold-comparison-row">
            <div className="thresh-box">
              <span className="thresh-label">CURRENT VALUE</span>
              <strong className={`thresh-val mono-val ${isExceeded ? 'text-amber' : 'text-green'}`}>
                {currentIdlingMin} min
              </strong>
            </div>
            <div className="thresh-divider">/</div>
            <div className="thresh-box">
              <span className="thresh-label">SAFETY THRESHOLD</span>
              <strong className="thresh-val mono-val text-yellow">45 min max</strong>
            </div>
          </div>

          <div className="idling-callout-box">
            {isExceeded ? (
              <div className="callout-content">
                <AlertTriangle size={18} className="text-amber flex-shrink-0" />
                <div>
                  <div className="callout-title">Unusual Idling Behavior Flagged</div>
                  <p className="callout-desc">
                    Engine idle time is +{currentIdlingMin - thresholdMin} min over allowed maximum. High idle consumes excess DEF fuel and triggers fleet efficiency flags.
                  </p>
                </div>
              </div>
            ) : (
              <div className="callout-content">
                <CheckCircle2 size={18} className="text-green flex-shrink-0" />
                <div>
                  <div className="callout-title">Idling Within Normal Envelope</div>
                  <p className="callout-desc">
                    Engine operation is balanced. Machine efficiency is at optimal productivity.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
