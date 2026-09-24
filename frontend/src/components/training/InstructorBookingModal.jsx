import React, { useState } from 'react';
import { UserCheck, Calendar, Clock, CheckCircle2, X, Star, Sparkles } from 'lucide-react';

export default function InstructorBookingModal({ module, onClose, onToggleComplete }) {
  const [selectedSlot, setSelectedSlot] = useState('Today 16:00');
  const [topic, setTopic] = useState('Excavator Precision Grading & Safety');
  const [notes, setNotes] = useState('');
  const [isBooked, setIsBooked] = useState(false);

  if (!module) return null;

  const handleBooking = (e) => {
    e.preventDefault();
    setIsBooked(true);
    setTimeout(() => {
      onToggleComplete(module.moduleId);
    }, 800);
  };

  return (
    <div className="cat-modal-backdrop" onClick={onClose}>
      <div className="cat-modal instructor-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cat-modal-header">
          <div className="article-reader-head">
            <span className="cat-badge cat-badge-yellow mono-val">{module.moduleId}</span>
            <div>
              <span className="cat-badge cat-badge-sm cat-badge-muted">INSTRUCTOR COACHING</span>
              <h3>{module.title}</h3>
            </div>
          </div>
          <button className="cat-icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="cat-modal-body instructor-modal-body">
          {!isBooked ? (
            <form onSubmit={handleBooking}>
              {/* Instructor Profile Card */}
              <div className="instructor-profile-card">
                <div className="instructor-avatar-box">
                  <UserCheck size={32} className="text-yellow-dark" />
                </div>
                <div>
                  <div className="instructor-name">Sarah Jenkins</div>
                  <div className="instructor-title">Senior Field Operator Specialist • CAT Global Training</div>
                  <div className="instructor-rating">
                    <Star size={13} fill="#f59e0b" className="text-amber" />
                    <span>4.9 / 5.0 Rating (184 Operator Reviews)</span>
                  </div>
                </div>
              </div>

              <div className="form-group mt-3">
                <label className="form-label">Select Coaching Topic</label>
                <select
                  className="cat-input"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                >
                  <option value="Excavator Precision Grading & Safety">Excavator Precision Grading & Safety</option>
                  <option value="Eco-Operating & Idling Optimization">Eco-Operating & Idling Optimization</option>
                  <option value="Proximity Radar Hazard Management">Proximity Radar Hazard Management</option>
                  <option value="Emergency Hydraulic Procedures">Emergency Hydraulic Procedures</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Available In-Cab Virtual Coaching Slots</label>
                <div className="slot-chips-grid">
                  {['Today 16:00', 'Tomorrow 09:30', 'Tomorrow 14:00', 'Friday 11:00'].map((slot) => (
                    <button
                      type="button"
                      key={slot}
                      className={`slot-chip-btn ${selectedSlot === slot ? 'active' : ''}`}
                      onClick={() => setSelectedSlot(slot)}
                    >
                      <Calendar size={13} />
                      <span>{slot}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Specific Questions / Site Conditions (Optional)</label>
                <textarea
                  className="cat-input"
                  rows="2"
                  placeholder="e.g. Working on high moisture sandy loam, need slope advice..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                ></textarea>
              </div>

              <div className="cat-modal-footer px-0 pb-0">
                <button type="button" className="cat-btn cat-btn-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="cat-btn cat-btn-primary">
                  <Clock size={15} />
                  <span>Confirm Coaching Session ({selectedSlot})</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="booking-confirmed-state">
              <CheckCircle2 size={48} className="text-green mb-2" />
              <h3>Coaching Session Scheduled!</h3>
              <p className="text-muted">
                Your 30-minute session with <strong>Sarah Jenkins</strong> is confirmed for <strong>{selectedSlot}</strong>. A calendar invite has been dispatched to your in-cab display.
              </p>
              <button className="cat-btn cat-btn-primary mt-3" onClick={onClose}>
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
