import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { Fuel, TrendingUp, Cpu } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="cat-chart-tooltip">
        <div className="tooltip-time mono-val">{label}</div>
        {payload.map((entry, idx) => (
          <div key={idx} className="tooltip-row" style={{ color: entry.color }}>
            <span>{entry.name}:</span>
            <strong className="mono-val">{entry.value} {entry.unit || ''}</strong>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function TelemetryCharts({ history = [] }) {
  return (
    <div className="telemetry-charts-wrapper">
      {/* Chart 1: Fuel vs Idling Correlation */}
      <div className="cat-card chart-card">
        <div className="cat-card-header">
          <div className="cat-card-title">
            <Fuel size={18} className="text-yellow" />
            <span>FUEL USAGE (L) vs IDLING TIME (MIN)</span>
          </div>
          <span className="cat-badge cat-badge-muted">HOURLY TELEMETRY</span>
        </div>

        <div className="chart-canvas-wrap">
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="fuelGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FFCD00" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#FFCD00" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="idleGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#252d3d" vertical={false} />
              <XAxis dataKey="time" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="fuelUsed"
                name="Fuel Used (L)"
                stroke="#FFCD00"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#fuelGrad)"
              />
              <Area
                type="monotone"
                dataKey="idlingMin"
                name="Idling (Min)"
                stroke="#F59E0B"
                strokeWidth={2}
                strokeDasharray="4 4"
                fillOpacity={1}
                fill="url(#idleGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: Load Cycles & Production Velocity */}
      <div className="cat-card chart-card">
        <div className="cat-card-header">
          <div className="cat-card-title">
            <TrendingUp size={18} className="text-cyan" />
            <span>EXCAVATION LOAD CYCLES</span>
          </div>
          <span className="cat-badge cat-badge-cyan">PRODUCTIVITY</span>
        </div>

        <div className="chart-canvas-wrap">
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#252d3d" vertical={false} />
              <XAxis dataKey="time" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="loadCycles"
                name="Cumulative Cycles"
                fill="#0ea5e9"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
