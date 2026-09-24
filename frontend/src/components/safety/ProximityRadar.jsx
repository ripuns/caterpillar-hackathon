import React from 'react';
import { ShieldAlert, ShieldCheck, Radio, AlertOctagon } from 'lucide-react';

export default function ProximityRadar({ distance = 2.1, onSimulateDistance }) {
  const isHazard = distance < 3.0;
  const isCritical = distance < 1.5;

  // Calculate visual dot position on radar screen (0.5m -> inner ring, 10m -> outer ring)
  const normalizedDistance = Math.min(Math.max((distance - 0.5) / 9.5, 0.1), 0.95);
  // Place obstacle at 45 degree angle for visual representation
  const angleRad = (45 * Math.PI) / 180;
  const radiusPx = normalizedDistance * 110;
  const dotX = 130 + radiusPx * Math.cos(angleRad);
  const dotY = 130 - radiusPx * Math.sin(angleRad);

  return (
    <div className="cat-card proximity-radar-card">
      <div className="cat-card-header">
        <div className="cat-card-title">
          <Radio size={18} className={isHazard ? 'text-danger' : 'text-yellow-dark'} />
          <span>360° PROXIMITY HAZARD RADAR</span>
        </div>
        <span
          className={`cat-badge ${
            isHazard ? 'cat-badge-red pulse-critical' : 'cat-badge-green'
          }`}
        >
          {isCritical ? 'COLLISION IMMINENT' : isHazard ? 'HAZARD ZONE (<3.0m)' : 'ZONE CLEAR'}
        </span>
      </div>

      <div className="radar-layout">
        {/* Animated Radar Canvas / SVG Display */}
        <div className="radar-viewport">
          <svg className="radar-svg" viewBox="0 0 260 260">
            {/* Background Grid Circles */}
            <circle cx="130" cy="130" r="115" className="radar-ring outer" />
            <circle cx="130" cy="130" r="85" className="radar-ring mid" />
            <circle cx="130" cy="130" r="45" className="radar-ring hazard-zone" />
            <circle cx="130" cy="130" r="15" className="radar-ring inner" />

            {/* Radar Crosshairs */}
            <line x1="130" y1="10" x2="130" y2="250" className="radar-crosshair" />
            <line x1="10" y1="130" x2="250" y2="130" className="radar-crosshair" />

            {/* 3.0m Safety Envelope Threshold Ring */}
            <circle
              cx="130"
              cy="130"
              r="45"
              className="radar-threshold-boundary"
            />

            {/* Rotating Radar Sweep Beam */}
            <g className="radar-sweep">
              <path
                d="M 130 130 L 130 15 A 115 115 0 0 1 210 50 Z"
                className="radar-beam"
              />
            </g>

            {/* Excavator Center Icon representation */}
            <rect
              x="122"
              y="118"
              width="16"
              height="24"
              rx="3"
              className="radar-machine-body"
            />
            <line x1="130" y1="118" x2="130" y2="95" className="radar-boom-line" />

            {/* Detected Obstacle Blip */}
            <circle
              cx={dotX}
              cy={dotY}
              r={isHazard ? 9 : 6}
              className={`radar-blip ${isHazard ? 'hazard pulse-blip' : 'safe'}`}
            />
          </svg>

          <div className="radar-legend-overlay">
            <span className="legend-zone-text text-danger">⚠️ 3.0m Safety Envelope</span>
          </div>
        </div>

        {/* Proximity Readings & Sensor Diagnostics */}
        <div className="radar-telemetry-side">
          <div className="distance-display-box">
            <div className="distance-label">CURRENT OBSTACLE DISTANCE</div>
            <div
              className={`distance-value mono-val ${
                isHazard ? 'text-danger' : 'text-green'
              }`}
            >
              {distance.toFixed(1)} <span className="distance-unit">METERS</span>
            </div>
            <div className="distance-status-text">
              {isHazard
                ? '⚠️ Sensor Alert: Object inside 3.0m safety perimeter!'
                : '✓ All surrounding zones within safe clearance limits.'}
            </div>
          </div>

          <div className="sensor-matrix">
            <div className="sensor-chip">
              <span className="sensor-name">Front Ultrasonic:</span>
              <strong className="mono-val text-green">5.8m</strong>
            </div>
            <div className="sensor-chip">
              <span className="sensor-name">Rear Radar:</span>
              <strong className={`mono-val ${distance < 3.0 ? 'text-danger' : 'text-green'}`}>
                {distance.toFixed(1)}m
              </strong>
            </div>
            <div className="sensor-chip">
              <span className="sensor-name">Boom Swing Sensor:</span>
              <strong className="mono-val text-green">Clear</strong>
            </div>
            <div className="sensor-chip">
              <span className="sensor-name">Ground Transponders:</span>
              <strong className="mono-val text-black">2 Active</strong>
            </div>
          </div>

          {onSimulateDistance && (
            <div className="radar-quick-toggles">
              <span className="text-muted text-xs">TEST PROXIMITY RULE:</span>
              <div className="sim-btn-row">
                <button
                  className="cat-btn cat-btn-danger cat-btn-sm"
                  onClick={() => onSimulateDistance(1.8)}
                >
                  Simulate Hazard (1.8m)
                </button>
                <button
                  className="cat-btn cat-btn-success cat-btn-sm"
                  onClick={() => onSimulateDistance(4.5)}
                >
                  Clear to Safe (4.5m)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
