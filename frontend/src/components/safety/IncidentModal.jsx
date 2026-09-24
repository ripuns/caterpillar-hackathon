import React, { useState } from 'react';
import { useOperator } from '../../context/OperatorContext';
import { AlertOctagon, X, FileText, CheckCircle2 } from 'lucide-react';

export default function IncidentModal({ isOpen, onClose }) {
  const { logIncident, activeMachineId, operator } = useOperator();

  const [form, setForm] = useState({
    title: '',
    severity: 'medium',
    category: 'Equipment / Hydraulic',
    details: '',
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;

    logIncident({
      title: form.title,
      severity: form.severity,
      details: `${form.category}: ${form.details}`,
    });

    onClose();
    setForm({
      title: '',
      severity: 'medium',
      category: 'Equipment / Hydraulic',
      details: '',
    });
  };

  return (
    <div className="cat-modal-backdrop" onClick={onClose}>
      <div className="cat-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cat-modal-header">
          <div className="cat-card-title">
            <AlertOctagon size={20} className="text-danger" />
            <span>RECORD SAFETY / MACHINE INCIDENT</span>
          </div>
          <button className="cat-icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="cat-modal-body">
            <div className="incident-meta-chip mb-3">
              <span>Reporting Unit: <strong className="text-yellow">{activeMachineId}</strong></span>
              <span>Operator: <strong>{operator.operatorId} ({operator.name})</strong></span>
              <span>Timestamp: <strong>{new Date().toLocaleTimeString()}</strong></span>
            </div>

            <div className="form-group">
              <label className="form-label">Incident Summary / Headline</label>
              <input
                type="text"
                className="cat-input"
                placeholder="e.g. Sudden hydraulic pressure relief trigger during bucket curl"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label">Incident Category</label>
                <select
                  className="cat-input"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  <option value="Equipment / Hydraulic">Equipment / Hydraulic</option>
                  <option value="Proximity / Obstacle Hazard">Proximity / Obstacle Hazard</option>
                  <option value="Ground Worker / Spotter Event">Ground Worker / Spotter Event</option>
                  <option value="Trench / Soil Stability">Trench / Soil Stability</option>
                  <option value="Seatbelt / PPE Non-Compliance">Seatbelt / PPE Non-Compliance</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Severity Level</label>
                <select
                  className="cat-input"
                  value={form.severity}
                  onChange={(e) => setForm({ ...form, severity: e.target.value })}
                >
                  <option value="low">Low (Advisory Log)</option>
                  <option value="medium">Medium (Requires Inspection)</option>
                  <option value="high">High (Critical Stop-Work Event)</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Detailed Incident Narrative & Operating Context</label>
              <textarea
                className="cat-input"
                rows="4"
                placeholder="Describe actions taken, telemetry readings, machine response, and supervisor notification status..."
                value={form.details}
                onChange={(e) => setForm({ ...form, details: e.target.value })}
                required
              ></textarea>
            </div>
          </div>

          <div className="cat-modal-footer">
            <button
              type="button"
              className="cat-btn cat-btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button type="submit" className="cat-btn cat-btn-danger">
              <FileText size={16} />
              <span>LOG INCIDENT RECORD</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
