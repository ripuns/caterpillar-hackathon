import React, { useState } from 'react';
import { useOperator } from '../../context/OperatorContext';
import {
  CalendarCheck2,
  Clock,
  CloudSun,
  Play,
  CheckCircle2,
  RotateCcw,
  Plus,
  Search,
  Filter,
  MapPin,
  HardHat,
  Cpu,
  Sparkles,
} from 'lucide-react';

export default function TasksView() {
  const {
    tasks,
    updateTaskStatus,
    addTask,
    activeMachineId,
    operator,
    setActiveTab,
  } = useOperator();

  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);

  // New task form state
  const [newTaskForm, setNewTaskForm] = useState({
    taskType: 'Earth Excavation',
    estimatedTimeMin: 60,
    weather: 'Sunny',
    location: 'Sector 5 - North Berm',
    notes: '',
  });

  const filteredTasks = tasks.filter((t) => {
    const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
    const matchesSearch =
      (t.taskType || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.taskId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.location && t.location.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const handleCreateTask = (e) => {
    e.preventDefault();
    addTask({
      ...newTaskForm,
      machineId: activeMachineId,
      operatorId: operator.operatorId,
      estimatedTimeMin: Number(newTaskForm.estimatedTimeMin),
    });
    setIsNewTaskModalOpen(false);
    setNewTaskForm({
      taskType: 'Earth Excavation',
      estimatedTimeMin: 60,
      weather: 'Sunny',
      location: 'Sector 5 - North Berm',
      notes: '',
    });
  };

  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const inProgressCount = tasks.filter((t) => t.status === 'in_progress').length;
  const pendingCount = tasks.filter((t) => t.status === 'pending').length;

  return (
    <div className="tasks-view">
      {/* Top Header & Filter Controls */}
      <div className="view-header-row">
        <div>
          <h1 className="view-title">DAILY TASK SCHEDULING DASHBOARD</h1>
          <p className="view-subtitle">
            Outcome #1 — View scheduled tasks for the day, manage operating sequence, and track job durations.
          </p>
        </div>

        <div className="view-header-actions">
          <button
            className="cat-btn cat-btn-primary"
            onClick={() => setIsNewTaskModalOpen(true)}
          >
            <Plus size={16} />
            <span>SCHEDULE TASK</span>
          </button>
        </div>
      </div>

      {/* Task Summary Metric Pills */}
      <div className="tasks-summary-bar">
        <div className="task-metric-pill">
          <span className="metric-pill-num mono-val">{tasks.length}</span>
          <span className="metric-pill-label">TOTAL SCHEDULED</span>
        </div>
        <div className="task-metric-pill active-pill">
          <span className="metric-pill-num mono-val text-yellow">{inProgressCount}</span>
          <span className="metric-pill-label">IN PROGRESS</span>
        </div>
        <div className="task-metric-pill">
          <span className="metric-pill-num mono-val text-muted">{pendingCount}</span>
          <span className="metric-pill-label">PENDING</span>
        </div>
        <div className="task-metric-pill">
          <span className="metric-pill-num mono-val text-green">{completedCount}</span>
          <span className="metric-pill-label">COMPLETED</span>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="tasks-toolbar cat-card">
        <div className="search-box">
          <Search size={16} className="text-muted" />
          <input
            type="text"
            placeholder="Search by task type, ID (e.g. T001), or jobsite location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="cat-input-search"
          />
        </div>

        <div className="filter-chips">
          <Filter size={15} className="text-muted" />
          <span className="filter-label">STATUS:</span>
          {['all', 'in_progress', 'pending', 'completed'].map((status) => (
            <button
              key={status}
              className={`filter-chip-btn ${filterStatus === status ? 'active' : ''}`}
              onClick={() => setFilterStatus(status)}
            >
              {status === 'all' ? 'All Tasks' : status.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Task Cards Grid */}
      <div className="tasks-grid">
        {filteredTasks.length === 0 ? (
          <div className="tasks-empty-state cat-card">
            <CalendarCheck2 size={32} className="text-muted mb-2" />
            <h3>No tasks match your filter</h3>
            <p className="text-muted">Try resetting search filters or schedule a new task above.</p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isCompleted = task.status === 'completed';
            const isInProgress = task.status === 'in_progress';

            return (
              <div
                key={task.taskId}
                className={`cat-card task-card ${
                  isInProgress ? 'task-card-active' : isCompleted ? 'task-card-completed' : ''
                }`}
              >
                <div className="task-card-top">
                  <div className="task-header-left">
                    <span className="task-id-tag mono-val">{task.taskId}</span>
                    <span
                      className={`cat-badge ${
                        isInProgress
                          ? 'cat-badge-yellow'
                          : isCompleted
                          ? 'cat-badge-green'
                          : 'cat-badge-muted'
                      }`}
                    >
                      {task.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="task-weather-tag">
                    <CloudSun size={14} className="text-yellow" />
                    <span>{task.weather}</span>
                  </div>
                </div>

                <h3 className="task-title">{task.taskType}</h3>

                <div className="task-details-list">
                  <div className="task-detail-row">
                    <MapPin size={14} className="text-muted" />
                    <span>{task.location || 'Primary Workzone'}</span>
                  </div>
                  <div className="task-detail-row">
                    <Clock size={14} className="text-muted" />
                    <span>
                      Est: <strong>{task.estimatedTimeMin} min</strong>
                      {task.actualTimeMin && (
                        <span className="text-green ml-2">
                          • Actual: <strong>{task.actualTimeMin} min</strong>
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="task-detail-row">
                    <Cpu size={14} className="text-muted" />
                    <span>Unit: <strong className="text-yellow">{task.machineId}</strong> • Operator: {task.operatorId}</span>
                  </div>
                </div>

                {task.notes && <p className="task-notes-text">{task.notes}</p>}

                {/* Progress bar */}
                <div className="task-card-progress">
                  <div className="progress-labels">
                    <span>Execution Progress</span>
                    <span className="mono-val">{task.progressPct || (isCompleted ? 100 : 0)}%</span>
                  </div>
                  <div className="progress-bar-track">
                    <div
                      className={`progress-bar-fill ${isCompleted ? 'bg-green' : ''}`}
                      style={{ width: `${task.progressPct || (isCompleted ? 100 : 0)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="task-card-footer">
                  {task.status === 'pending' && (
                    <button
                      className="cat-btn cat-btn-primary cat-btn-sm"
                      onClick={() => updateTaskStatus(task.taskId, 'in_progress')}
                    >
                      <Play size={14} />
                      <span>START TASK</span>
                    </button>
                  )}

                  {task.status === 'in_progress' && (
                    <button
                      className="cat-btn cat-btn-success cat-btn-sm"
                      onClick={() => updateTaskStatus(task.taskId, 'completed')}
                    >
                      <CheckCircle2 size={14} />
                      <span>COMPLETE</span>
                    </button>
                  )}

                  {task.status === 'completed' && (
                    <button
                      className="cat-btn cat-btn-secondary cat-btn-sm"
                      onClick={() => updateTaskStatus(task.taskId, 'in_progress')}
                    >
                      <RotateCcw size={14} />
                      <span>RE-OPEN</span>
                    </button>
                  )}

                  <button
                    className="cat-btn cat-btn-secondary cat-btn-sm"
                    onClick={() => setActiveTab('estimator')}
                    title="Run AI Task Time Estimation"
                  >
                    <Sparkles size={14} className="text-cyan" />
                    <span>ESTIMATE AI</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* New Task Creation Modal */}
      {isNewTaskModalOpen && (
        <div className="cat-modal-backdrop" onClick={() => setIsNewTaskModalOpen(false)}>
          <div className="cat-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cat-modal-header">
              <h3>SCHEDULE NEW OPERATION TASK</h3>
              <button
                className="cat-icon-btn"
                onClick={() => setIsNewTaskModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTask}>
              <div className="cat-modal-body">
                <div className="form-group">
                  <label className="form-label">Task Type</label>
                  <select
                    className="cat-input"
                    value={newTaskForm.taskType}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, taskType: e.target.value })}
                  >
                    <option value="Earth Excavation">Earth Excavation</option>
                    <option value="Trenching">Trenching</option>
                    <option value="Material Loading">Material Loading</option>
                    <option value="Grading">Grading</option>
                    <option value="Demolition">Demolition</option>
                  </select>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label">Weather Forecast</label>
                    <select
                      className="cat-input"
                      value={newTaskForm.weather}
                      onChange={(e) => setNewTaskForm({ ...newTaskForm, weather: e.target.value })}
                    >
                      <option value="Sunny">Sunny</option>
                      <option value="Cloudy">Cloudy</option>
                      <option value="Rainy">Rainy</option>
                      <option value="Windy">Windy</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Estimated Time (min)</label>
                    <input
                      type="number"
                      min="15"
                      max="240"
                      className="cat-input"
                      value={newTaskForm.estimatedTimeMin}
                      onChange={(e) => setNewTaskForm({ ...newTaskForm, estimatedTimeMin: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Location / Sector</label>
                  <input
                    type="text"
                    className="cat-input"
                    value={newTaskForm.location}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, location: e.target.value })}
                    placeholder="e.g. Sector 4 East Berm"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Operating Notes / Hazards</label>
                  <textarea
                    className="cat-input"
                    rows="3"
                    value={newTaskForm.notes}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, notes: e.target.value })}
                    placeholder="e.g. Shoring box required, watch overhead lines..."
                  ></textarea>
                </div>
              </div>

              <div className="cat-modal-footer">
                <button
                  type="button"
                  className="cat-btn cat-btn-secondary"
                  onClick={() => setIsNewTaskModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="cat-btn cat-btn-primary">
                  Confirm & Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
