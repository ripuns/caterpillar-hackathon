import React, { useState, useEffect } from 'react';
import {
  Gamepad2,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Sliders,
  ShieldAlert,
  ShieldCheck,
  X,
  Sparkles,
  Zap,
} from 'lucide-react';

export default function SimulationPlayerModal({ module, onClose, onToggleComplete }) {
  if (!module) return null;

  const isSoilSim = module.moduleId === 'TH007' || module.simulationType === 'soil_stability';

  // State for Soil Simulation (TH007)
  const [soilType, setSoilType] = useState('Type B');
  const [depthM, setDepthM] = useState(3.5);
  const [slopeAngleDeg, setSlopeAngleDeg] = useState(45);

  // State for Proximity Reaction Simulation (TH008)
  const [gameDistance, setGameDistance] = useState(7.5);
  const [gameRunning, setGameRunning] = useState(false);
  const [gameResult, setGameResult] = useState(null); // success | collision | null
  const [reactionTimeMs, setReactionTimeMs] = useState(null);
  const [startTime, setStartTime] = useState(null);

  // Soil Stability Physics Calculation
  let maxAllowedAngle = 53; // Type A: 53° (3/4:1), Type B: 45° (1:1), Type C: 34° (1.5:1)
  if (soilType === 'Type A') maxAllowedAngle = 53;
  else if (soilType === 'Type B') maxAllowedAngle = 45;
  else if (soilType === 'Type C') maxAllowedAngle = 34;

  const isSoilSafe = slopeAngleDeg <= maxAllowedAngle;
  const safetyFactor = (maxAllowedAngle / slopeAngleDeg).toFixed(2);
  const caveInRiskPct = Math.min(Math.max(Math.round(((slopeAngleDeg - maxAllowedAngle) / 20) * 100), 0), 100);

  // Proximity Game Loop
  useEffect(() => {
    let interval;
    if (gameRunning) {
      interval = setInterval(() => {
        setGameDistance((prev) => {
          if (prev <= 1.0) {
            setGameRunning(false);
            setGameResult('collision');
            return 1.0;
          }
          return Math.max(prev - 0.4, 0.5);
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [gameRunning]);

  const startProximityDrill = () => {
    setGameDistance(8.0);
    setGameResult(null);
    setReactionTimeMs(null);
    setStartTime(Date.now());
    setGameRunning(true);
  };

  const handleEmergencyStop = () => {
    if (!gameRunning) return;
    const elapsed = Date.now() - startTime;
    setGameRunning(false);
    setReactionTimeMs(elapsed);

    if (gameDistance >= 3.0) {
      setGameResult('success');
    } else {
      setGameResult('breached');
    }
  };

  return (
    <div className="cat-modal-backdrop" onClick={onClose}>
      <div className="cat-modal simulation-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cat-modal-header">
          <div className="article-reader-head">
            <span className="cat-badge cat-badge-yellow mono-val">{module.moduleId}</span>
            <div>
              <span className="cat-badge cat-badge-sm cat-badge-muted">INTERACTIVE SIMULATION</span>
              <h3>{module.title}</h3>
            </div>
          </div>
          <button className="cat-icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="cat-modal-body simulation-modal-body">
          {isSoilSim ? (
            /* Simulation #1: Trench Benching Angle & Soil Stability */
            <div className="soil-sim-layout">
              <div className="sim-instructions-banner">
                <Sliders size={16} className="text-yellow-dark" />
                <span>
                  Adjust excavation parameters below. Certified OSHA/CAT safety rules require maximum 45° slope for Type B soil and 34° for Type C soil.
                </span>
              </div>

              <div className="sim-interactive-grid">
                {/* Control Panel */}
                <div className="sim-controls-card">
                  <div className="form-group">
                    <label className="form-label">Soil Classification Type</label>
                    <select
                      className="cat-input"
                      value={soilType}
                      onChange={(e) => setSoilType(e.target.value)}
                    >
                      <option value="Type A">Type A (Cohesive Clay / Hardpan - Max 53°)</option>
                      <option value="Type B">Type B (Silt / Sandy Loam - Max 45°)</option>
                      <option value="Type C">Type C (Gravel / Saturated Soil - Max 34°)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <div className="slider-label-row">
                      <label className="form-label">Trench Slope Angle</label>
                      <span className="mono-val font-bold text-yellow-dark">{slopeAngleDeg}°</span>
                    </div>
                    <input
                      type="range"
                      min="25"
                      max="75"
                      value={slopeAngleDeg}
                      onChange={(e) => setSlopeAngleDeg(Number(e.target.value))}
                      className="cat-slider"
                    />
                    <div className="slider-labels">
                      <span>25° (Flat Safe)</span>
                      <span>45° (Nominal)</span>
                      <span>75° (Dangerous)</span>
                    </div>
                  </div>

                  <div className="form-group">
                    <div className="slider-label-row">
                      <label className="form-label">Excavation Depth</label>
                      <span className="mono-val font-bold text-black">{depthM} meters</span>
                    </div>
                    <input
                      type="range"
                      min="1.5"
                      max="6.0"
                      step="0.5"
                      value={depthM}
                      onChange={(e) => setDepthM(Number(e.target.value))}
                      className="cat-slider"
                    />
                  </div>
                </div>

                {/* Real-time Physics Visualizer Canvas */}
                <div className="sim-visual-card">
                  <div className="sim-canvas-box">
                    <svg viewBox="0 0 300 160" className="trench-svg">
                      {/* Ground Surface */}
                      <rect x="0" y="30" width="110" height="130" fill="#78716c" />
                      <rect x="190" y="30" width="110" height="130" fill="#78716c" />

                      {/* Trench Cut Angle */}
                      <polygon
                        points={`110,30 ${110 + (slopeAngleDeg - 25) * 1.2},140 190,140 190,30`}
                        fill={isSoilSafe ? '#f5f5f4' : '#fee2e2'}
                        stroke={isSoilSafe ? '#16a34a' : '#dc2626'}
                        strokeWidth="3"
                      />

                      {/* Excavator Boom indicator */}
                      <rect x="20" y="15" width="40" height="20" rx="3" fill="#FFCD00" stroke="#000" />
                      <line x1="60" y1="25" x2="135" y2="100" stroke="#FFCD00" strokeWidth="4" />
                    </svg>
                  </div>

                  <div className="sim-telemetry-readout">
                    <div className="readout-item">
                      <span className="text-muted text-xs">SAFETY FACTOR:</span>
                      <strong className={`mono-val text-lg ${isSoilSafe ? 'text-green' : 'text-danger'}`}>
                        {safetyFactor}x {isSoilSafe ? '(PASS)' : '(FAIL)'}
                      </strong>
                    </div>

                    <div className="readout-item">
                      <span className="text-muted text-xs">CAVE-IN RISK:</span>
                      <strong className={`mono-val text-lg ${isSoilSafe ? 'text-green' : 'text-danger'}`}>
                        {caveInRiskPct}%
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Simulation #2: Proximity Reaction Drill */
            <div className="proximity-sim-layout">
              <div className="sim-instructions-banner">
                <Zap size={16} className="text-yellow-dark" />
                <span>
                  Reaction Drill: Click "START DRILL". As the simulated ground hazard approaches, press the <strong>EMERGENCY HYDRAULIC CUTOFF</strong> before it breaches the 3.0m envelope!
                </span>
              </div>

              <div className="drill-stage-box">
                <div className="drill-radar-display">
                  <div className="drill-distance-huge mono-val">
                    {gameDistance.toFixed(1)} <span className="text-sm text-muted">METERS</span>
                  </div>
                  <div
                    className={`drill-status-text ${
                      gameDistance < 3.0 ? 'text-danger font-bold' : 'text-green'
                    }`}
                  >
                    {gameDistance < 3.0 ? '⚠️ BREACHED 3.0M SAFETY ZONE!' : 'APPROACHING PERIMETER'}
                  </div>
                </div>

                <div className="drill-actions">
                  {!gameRunning ? (
                    <button
                      className="cat-btn cat-btn-primary"
                      onClick={startProximityDrill}
                    >
                      <Gamepad2 size={16} />
                      <span>START DRILL</span>
                    </button>
                  ) : (
                    <button
                      className="cat-btn cat-btn-danger cat-btn-lg pulse-critical"
                      onClick={handleEmergencyStop}
                    >
                      <span>EMERGENCY HYDRAULIC CUTOFF!</span>
                    </button>
                  )}
                </div>

                {gameResult && (
                  <div className={`drill-result-banner ${gameResult === 'success' ? 'result-success' : 'result-fail'}`}>
                    {gameResult === 'success' ? (
                      <div>
                        <strong>✓ EXCELLENT REACTION!</strong> Stopped at {gameDistance.toFixed(1)}m in {reactionTimeMs}ms. Safety perimeter maintained.
                      </div>
                    ) : (
                      <div>
                        <strong>⚠️ COLLISION / ZONE BREACH!</strong> Stopped at {gameDistance.toFixed(1)}m. Too close to obstacle.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="cat-modal-footer">
          <button className="cat-btn cat-btn-secondary" onClick={onClose}>
            Exit Simulator
          </button>

          <button
            className="cat-btn cat-btn-success"
            onClick={() => {
              onToggleComplete(module.moduleId);
              onClose();
            }}
          >
            <CheckCircle2 size={16} />
            <span>Complete Simulation Module ✓</span>
          </button>
        </div>
      </div>
    </div>
  );
}
