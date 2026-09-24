import React, { useState } from 'react';
import { useOperator } from '../../context/OperatorContext';
import ArticleReaderModal from './ArticleReaderModal';
import VideoPlayerModal from './VideoPlayerModal';
import SimulationPlayerModal from './SimulationPlayerModal';
import InstructorBookingModal from './InstructorBookingModal';
import {
  GraduationCap,
  BookOpen,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  FileText,
  Video,
  Gamepad2,
  UserCheck,
  Award,
  Sparkles,
  Check,
  Play,
  Calendar,
} from 'lucide-react';

export default function TrainingView() {
  const {
    trainingModules,
    toggleModuleComplete,
    operator,
  } = useOperator();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('all'); // all | article | video | simulation | instructor
  const [activeModalModule, setActiveModalModule] = useState(null);

  const filteredModules = trainingModules.filter((m) => {
    const matchesFormat = selectedFormat === 'all' || m.format === selectedFormat;
    const matchesSearch =
      (m.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.summary || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.moduleId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.category || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.content || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFormat && matchesSearch;
  });

  const completedCount = trainingModules.filter((m) => m.completionStatus === 'Completed').length;
  const progressPct = Math.round((completedCount / (trainingModules.length || 1)) * 100);

  const formatFilters = [
    { id: 'all', label: 'All Modules' },
    { id: 'article', label: '📖 Read Articles' },
    { id: 'video', label: '🎥 E-Learning Videos' },
    { id: 'simulation', label: '🎮 Simulation Modules' },
    { id: 'instructor', label: '👤 Instructor Coaching' },
  ];

  const handleOpenModule = (module) => {
    setActiveModalModule(module);
  };

  return (
    <div className="training-view">
      {/* View Header */}
      <div className="view-header-row">
        <div>
          <h1 className="view-title">OPERATOR TRAINING & UPSKILLING HUB</h1>
          <p className="view-subtitle">
            Outcome #3 — Multi-format training center: certified read articles, interactive video masterclasses, hands-on cab simulators, and 1-on-1 instructor sessions.
          </p>
        </div>

        <div className="view-header-actions">
          <span className="cat-badge cat-badge-yellow">
            <GraduationCap size={14} /> GET /training-hub
          </span>
        </div>
      </div>

      {/* Operator Training Progress Card */}
      <div className="cat-card training-progress-banner mb-4">
        <div className="training-banner-left">
          <div className="training-icon-box">
            <Award size={32} className="text-yellow" />
          </div>
          <div>
            <h3 className="training-banner-title">
              Operator Certification Curriculum — {operator.name} ({operator.operatorId})
            </h3>
            <p className="training-banner-sub">
              {completedCount} of {trainingModules.length} Modules Completed • Tier: <strong className="text-yellow">{operator.skillLevel}</strong>
            </p>
          </div>
        </div>

        <div className="training-banner-right">
          <div className="training-pct-box">
            <span className="training-pct-num mono-val text-yellow">{progressPct}%</span>
            <span className="training-pct-label">COMPLETED</span>
          </div>
          <div className="training-progress-bar">
            <div className="training-progress-fill" style={{ width: `${progressPct}%` }}></div>
          </div>
        </div>
      </div>

      {/* Search & Format Filter Toolbar */}
      <div className="tasks-toolbar cat-card mb-4">
        <div className="search-box">
          <Search size={16} className="text-muted" />
          <input
            type="text"
            placeholder="Search articles, video masterclasses, simulation drills, instructors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="cat-input-search"
          />
        </div>

        <div className="filter-chips">
          <Filter size={15} className="text-muted" />
          <span className="filter-label">FORMAT:</span>
          {formatFilters.map((fmt) => (
            <button
              key={fmt.id}
              className={`filter-chip-btn ${selectedFormat === fmt.id ? 'active' : ''}`}
              onClick={() => setSelectedFormat(fmt.id)}
            >
              {fmt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Modules Catalog Grid */}
      <div className="modules-grid">
        {filteredModules.map((module) => {
          const isCompleted = module.completionStatus === 'Completed';

          return (
            <div
              key={module.moduleId}
              className={`cat-card module-card ${isCompleted ? 'module-completed' : ''}`}
            >
              <div className="module-card-top">
                <div className="module-header-tags">
                  <span className="module-id-tag mono-val">{module.moduleId}</span>
                  {module.format === 'article' && (
                    <span className="cat-badge cat-badge-sm cat-badge-muted">
                      <FileText size={11} /> Article
                    </span>
                  )}
                  {module.format === 'video' && (
                    <span className="cat-badge cat-badge-sm cat-badge-yellow">
                      <Video size={11} /> Video Masterclass
                    </span>
                  )}
                  {module.format === 'simulation' && (
                    <span className="cat-badge cat-badge-sm cat-badge-amber">
                      <Gamepad2 size={11} /> Interactive Simulation
                    </span>
                  )}
                  {module.format === 'instructor' && (
                    <span className="cat-badge cat-badge-sm cat-badge-green">
                      <UserCheck size={11} /> 1-on-1 Coaching
                    </span>
                  )}
                </div>

                <span
                  className={`cat-badge ${
                    isCompleted ? 'cat-badge-green' : 'cat-badge-amber'
                  }`}
                >
                  {isCompleted ? 'CERTIFIED ✓' : 'IN PROGRESS'}
                </span>
              </div>

              <h3 className="module-title">{module.title}</h3>
              <p className="module-summary">{module.summary || (module.content ? `${module.content.slice(0, 120)}...` : 'Certified Caterpillar operational safety module.')}</p>

              <div className="module-meta-row">
                <div className="module-meta-item">
                  <BookOpen size={13} className="text-muted" />
                  <span>{module.category || 'Safety & Operations'}</span>
                </div>
                <div className="module-meta-item">
                  <Clock size={13} className="text-muted" />
                  <span>
                    {module.videoDuration ? `${module.videoDuration} video` : `${module.durationMin || 8} min`}
                  </span>
                </div>
              </div>

              <div className="module-card-actions">
                {module.format === 'article' && (
                  <button
                    className="cat-btn cat-btn-primary cat-btn-sm"
                    onClick={() => handleOpenModule(module)}
                  >
                    <FileText size={14} />
                    <span>READ ARTICLE</span>
                  </button>
                )}

                {module.format === 'video' && (
                  <button
                    className="cat-btn cat-btn-primary cat-btn-sm"
                    onClick={() => handleOpenModule(module)}
                  >
                    <Play size={14} />
                    <span>WATCH VIDEO</span>
                  </button>
                )}

                {module.format === 'simulation' && (
                  <button
                    className="cat-btn cat-btn-primary cat-btn-sm"
                    onClick={() => handleOpenModule(module)}
                  >
                    <Gamepad2 size={14} />
                    <span>LAUNCH SIMULATOR</span>
                  </button>
                )}

                {module.format === 'instructor' && (
                  <button
                    className="cat-btn cat-btn-primary cat-btn-sm"
                    onClick={() => handleOpenModule(module)}
                  >
                    <Calendar size={14} />
                    <span>BOOK INSTRUCTOR</span>
                  </button>
                )}

                <button
                  className={`cat-btn cat-btn-sm ${isCompleted ? 'cat-btn-secondary' : 'cat-btn-success'}`}
                  onClick={() => toggleModuleComplete(module.moduleId)}
                >
                  <Check size={14} />
                  <span>{isCompleted ? 'Done' : 'Mark Done'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Render Active Format Modal */}
      {activeModalModule && activeModalModule.format === 'article' && (
        <ArticleReaderModal
          module={activeModalModule}
          onClose={() => setActiveModalModule(null)}
          onToggleComplete={toggleModuleComplete}
        />
      )}

      {activeModalModule && activeModalModule.format === 'video' && (
        <VideoPlayerModal
          module={activeModalModule}
          onClose={() => setActiveModalModule(null)}
          onToggleComplete={toggleModuleComplete}
        />
      )}

      {activeModalModule && activeModalModule.format === 'simulation' && (
        <SimulationPlayerModal
          module={activeModalModule}
          onClose={() => setActiveModalModule(null)}
          onToggleComplete={toggleModuleComplete}
        />
      )}

      {activeModalModule && activeModalModule.format === 'instructor' && (
        <InstructorBookingModal
          module={activeModalModule}
          onClose={() => setActiveModalModule(null)}
          onToggleComplete={toggleModuleComplete}
        />
      )}
    </div>
  );
}
