import React, { useState, useEffect } from 'react';
import { useOperator } from '../../context/OperatorContext';
import { predictTaskTime } from '../../services/api';
import {
  Sparkles,
  Calculator,
  Clock,
  TrendingUp,
  TrendingDown,
  CloudSun,
  HardHat,
  Cpu,
  Zap,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Gauge,
  ArrowRight,
} from 'lucide-react';

const SAMPLE_BENCHMARKS = [
  { id: 'T001', taskType: 'Earth Excavation', weather: 'Sunny', operatorSkill: 'Expert', machineAgeYears: 2, estimatedTimeMin: 60, sampleActual: 58 },
  { id: 'T002', taskType: 'Trenching', weather: 'Rainy', operatorSkill: 'Intermediate', machineAgeYears: 4, estimatedTimeMin: 45, sampleActual: 52 },
  { id: 'T003', taskType: 'Material Loading', weather: 'Cloudy', operatorSkill: 'Beginner', machineAgeYears: 3, estimatedTimeMin: 30, sampleActual: 42 },
  { id: 'T004', taskType: 'Grading', weather: 'Sunny', operatorSkill: 'Expert', machineAgeYears: 5, estimatedTimeMin: 35, sampleActual: 33 },
  { id: 'T005', taskType: 'Demolition', weather: 'Windy', operatorSkill: 'Intermediate', machineAgeYears: 6, estimatedTimeMin: 90, sampleActual: 105 },
];

export default function EstimatorView() {
  const { operator, activeMachine } = useOperator();

  // Prediction Form State
  const [formData, setFormData] = useState({
    taskType: 'Earth Excavation',
    weather: 'Sunny',
    operatorSkill: operator.skillLevel || 'Intermediate',
    machineAgeYears: activeMachine.age || 3,
    estimatedTimeMin: 60,
  });

  const [prediction, setPrediction] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeBenchmarkId, setActiveBenchmarkId] = useState('T001');

  // Trigger prediction calculation
  const handlePredict = async (params = formData) => {
    setIsLoading(true);
    try {
      const res = await predictTaskTime(params);
      setPrediction(res.data);
    } catch (err) {
      console.error('Prediction failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    handlePredict(formData);
  }, []);

  const loadBenchmark = (b) => {
    setActiveBenchmarkId(b.id);
    const newForm = {
      taskType: b.taskType,
      weather: b.weather,
      operatorSkill: b.operatorSkill,
      machineAgeYears: b.machineAgeYears,
      estimatedTimeMin: b.estimatedTimeMin,
    };
    setFormData(newForm);
    handlePredict(newForm);
  };

  return (
    <div className="estimator-view">
      {/* View Header */}
      <div className="view-header-row">
        <div>
          <h1 className="view-title">AI TASK TIME ESTIMATION ENGINE</h1>
          <p className="view-subtitle">
            Outcome #5 — Scikit-learn regression model predicting actual task duration based on environmental conditions, operator skill curve, and machinery wear.
          </p>
        </div>

        <div className="view-header-actions">
          <span className="cat-badge cat-badge-yellow">
            <Sparkles size={14} /> POST /predict-task-time
          </span>
        </div>
      </div>

      {/* Main Interactive Grid */}
      <div className="estimator-grid">
        {/* Left Form: Parameter Selector */}
        <div className="cat-card estimator-form-card">
          <div className="cat-card-header">
            <div className="cat-card-title">
              <Calculator size={18} className="text-yellow-dark" />
              <span>PREDICTION INPUT PARAMETERS</span>
            </div>
            <span className="cat-badge cat-badge-muted">REGRESSION FEATURES</span>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handlePredict(formData);
            }}
          >
            {/* 1. Task Type Chips */}
            <div className="form-group mb-4">
              <label className="form-label font-bold">Select Operation Type</label>
              <div className="chip-selector-group">
                {['Earth Excavation', 'Trenching', 'Material Loading', 'Grading', 'Demolition'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={`chip-select-btn ${formData.taskType === type ? 'active' : ''}`}
                    onClick={() => {
                      const updated = { ...formData, taskType: type };
                      setFormData(updated);
                      handlePredict(updated);
                    }}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Weather & Skill Chips */}
            <div className="form-grid-2 mb-4">
              <div className="form-group">
                <label className="form-label font-bold">Weather Condition</label>
                <div className="chip-selector-group">
                  {[
                    { id: 'Sunny', label: '☀️ Sunny' },
                    { id: 'Cloudy', label: '☁️ Cloudy' },
                    { id: 'Rainy', label: '🌧️ Rainy' },
                    { id: 'Windy', label: '💨 Windy' },
                  ].map((w) => (
                    <button
                      key={w.id}
                      type="button"
                      className={`chip-select-btn ${formData.weather === w.id ? 'active' : ''}`}
                      onClick={() => {
                        const updated = { ...formData, weather: w.id };
                        setFormData(updated);
                        handlePredict(updated);
                      }}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label font-bold">Operator Skill Level</label>
                <div className="chip-selector-group">
                  {[
                    { id: 'Beginner', label: 'Beginner' },
                    { id: 'Intermediate', label: 'Intermediate' },
                    { id: 'Expert', label: 'Expert' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className={`chip-select-btn ${formData.operatorSkill === s.id ? 'active' : ''}`}
                      onClick={() => {
                        const updated = { ...formData, operatorSkill: s.id };
                        setFormData(updated);
                        handlePredict(updated);
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. Interactive Range Sliders */}
            <div className="form-grid-2 mb-4">
              <div className="slider-control-card">
                <div className="slider-header">
                  <span className="slider-label">Machine Age</span>
                  <span className="slider-val-badge mono-val">{formData.machineAgeYears} Years</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="12"
                  step="1"
                  className="cat-range-slider"
                  value={formData.machineAgeYears}
                  onChange={(e) => {
                    const updated = { ...formData, machineAgeYears: Number(e.target.value) };
                    setFormData(updated);
                    handlePredict(updated);
                  }}
                />
                <div className="slider-limits">
                  <span>1 yr (New)</span>
                  <span>12 yrs (High Wear)</span>
                </div>
              </div>

              <div className="slider-control-card">
                <div className="slider-header">
                  <span className="slider-label">Standard Baseline Estimate</span>
                  <span className="slider-val-badge mono-val text-yellow-dark">{formData.estimatedTimeMin} Min</span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="180"
                  step="5"
                  className="cat-range-slider"
                  value={formData.estimatedTimeMin}
                  onChange={(e) => {
                    const updated = { ...formData, estimatedTimeMin: Number(e.target.value) };
                    setFormData(updated);
                    handlePredict(updated);
                  }}
                />
                <div className="slider-limits">
                  <span>15 min</span>
                  <span>180 min</span>
                </div>
              </div>
            </div>

            <div className="estimator-form-submit">
              <button
                type="submit"
                className="cat-btn cat-btn-primary w-full"
                disabled={isLoading}
              >
                <Sparkles size={16} className={isLoading ? 'spinning' : ''} />
                <span>{isLoading ? 'CALCULATING INFERENCE...' : 'RE-RUN ML INFERENCE'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Output: AI Prediction Card & Model Attribution */}
        <div className="cat-card prediction-result-card">
          <div className="cat-card-header">
            <div className="cat-card-title">
              <Sparkles size={18} className="text-yellow-dark" />
              <span>AI PREDICTED DURATION</span>
            </div>

            {prediction && (
              <span
                className={`cat-badge ${
                  prediction.source === 'model' ? 'cat-badge-yellow' : 'cat-badge-amber'
                }`}
              >
                {prediction.source === 'model' ? 'REAL ML MODEL' : 'WEIGHTED FALLBACK'}
              </span>
            )}
          </div>

          {prediction ? (
            <div className="prediction-output-body">
              <div className="prediction-hero-row">
                <div className="pred-num-box">
                  <span className="pred-label">PREDICTED DURATION</span>
                  <div className="pred-value mono-val text-yellow">
                    {prediction.predictedTimeMin} <span className="pred-unit">MIN</span>
                  </div>
                </div>

                <div className="pred-delta-box">
                  <span className="pred-label">DELTA VS ESTIMATE</span>
                  <div
                    className={`pred-delta-val mono-val ${
                      prediction.deltaMin > 0 ? 'text-amber' : 'text-green'
                    }`}
                  >
                    {prediction.deltaMin > 0 ? `+${prediction.deltaMin}` : prediction.deltaMin} min
                    <span className="delta-pct">
                      ({prediction.deltaMin > 0 ? `+${prediction.deltaPct}%` : `${prediction.deltaPct}%`})
                    </span>
                  </div>
                </div>
              </div>

              {/* Provenance & Confidence Box */}
              <div className="prediction-provenance-box">
                <div className="provenance-row">
                  <span className="prov-label">Inference Engine:</span>
                  <strong className="text-yellow">
                    {prediction.source === 'model'
                      ? 'Python FastAPI scikit-learn regressor (:8001)'
                      : 'NestJS Rule Weighted-Average Fallback'}
                  </strong>
                </div>

                <div className="provenance-row">
                  <span className="prov-label">Prediction Confidence:</span>
                  <span
                    className={`cat-badge cat-badge-sm ${
                      prediction.confidence === 'high'
                        ? 'cat-badge-green'
                        : prediction.confidence === 'medium'
                        ? 'cat-badge-yellow'
                        : 'cat-badge-amber'
                    }`}
                  >
                    {prediction.confidence.toUpperCase()} CONFIDENCE
                  </span>
                </div>
              </div>

              {/* Feature Impact Analysis */}
              <div className="feature-impact-matrix">
                <div className="matrix-title">Feature Factor Breakdown:</div>
                <div className="matrix-grid">
                  <div className="matrix-chip">
                    <HardHat size={14} className="text-yellow-dark" />
                    <span>Skill ({formData.operatorSkill}):</span>
                    <strong className="mono-val">
                      {formData.operatorSkill === 'Beginner' ? '+25%' : formData.operatorSkill === 'Expert' ? '-8%' : '+4%'}
                    </strong>
                  </div>
                  <div className="matrix-chip">
                    <CloudSun size={14} className="text-yellow-dark" />
                    <span>Weather ({formData.weather}):</span>
                    <strong className="mono-val">
                      {formData.weather === 'Rainy' || formData.weather === 'Windy' ? '+12%' : '0%'}
                    </strong>
                  </div>
                  <div className="matrix-chip">
                    <Cpu size={14} className="text-muted" />
                    <span>Age ({formData.machineAgeYears} yrs):</span>
                    <strong className="mono-val">
                      {Number(formData.machineAgeYears) > 5 ? '+8%' : '0%'}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="prediction-loading-state">
              <Clock size={32} className="text-muted mb-2" />
              <span>Enter parameters to run machine learning prediction.</span>
            </div>
          )}
        </div>
      </div>

      {/* Ground Truth Validation Benchmarks Table */}
      <div className="cat-card benchmarks-card mt-4">
        <div className="cat-card-header">
          <div className="cat-card-title">
            <Zap size={18} className="text-yellow-dark" />
            <span>DATASET REPRODUCIBILITY BENCHMARKS (README §3.1 SAMPLE TEST CASES)</span>
          </div>
          <span className="cat-badge cat-badge-muted">CLICK ROW TO LOAD PRESET</span>
        </div>

        <p className="benchmarks-desc">
          Test the regression model against the 5 canonical sample cases from the hackathon problem statement to demonstrate how skill and weather drive real learnable structure.
        </p>

        <div className="table-responsive">
          <table className="cat-table">
            <thead>
              <tr>
                <th>Task ID</th>
                <th>Task Type</th>
                <th>Weather</th>
                <th>Operator Skill</th>
                <th>Machine Age</th>
                <th>Baseline Est.</th>
                <th>Actual Benchmark</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {SAMPLE_BENCHMARKS.map((b) => (
                <tr
                  key={b.id}
                  className={`benchmark-row ${activeBenchmarkId === b.id ? 'active-row' : ''}`}
                  onClick={() => loadBenchmark(b)}
                >
                  <td className="mono-val text-yellow-dark">{b.id}</td>
                  <td><strong>{b.taskType}</strong></td>
                  <td>
                    <span className="cat-badge cat-badge-sm cat-badge-muted">{b.weather}</span>
                  </td>
                  <td>
                    <span
                      className={`cat-badge cat-badge-sm ${
                        b.operatorSkill === 'Expert'
                          ? 'cat-badge-green'
                          : b.operatorSkill === 'Beginner'
                          ? 'cat-badge-amber'
                          : 'cat-badge-muted'
                      }`}
                    >
                      {b.operatorSkill}
                    </span>
                  </td>
                  <td className="mono-val">{b.machineAgeYears} yrs</td>
                  <td className="mono-val">{b.estimatedTimeMin} min</td>
                  <td className="mono-val text-black font-bold">{b.sampleActual} min</td>
                  <td>
                    <button className="cat-btn cat-btn-sm cat-btn-secondary">
                      <span>Test Case</span>
                      <ArrowRight size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
