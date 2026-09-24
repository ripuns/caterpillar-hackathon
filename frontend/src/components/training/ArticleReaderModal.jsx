import React, { useState } from 'react';
import {
  FileText,
  X,
  CheckCircle2,
  ListChecks,
  HelpCircle,
  Award,
  Sparkles,
  BookOpen,
  Clock,
  ShieldCheck,
  Check,
} from 'lucide-react';

export default function ArticleReaderModal({ module, onClose, onToggleComplete }) {
  const [activeTab, setActiveTab] = useState('article'); // article | checklist | quiz
  const [checkedItems, setCheckedItems] = useState({});
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  if (!module) return null;

  const checklist = module.checklist || [
    'Reviewed pre-shift hazard documentation and site maps',
    'Confirmed 3.0m stand-off safety envelope is respected',
    'Verified hydraulic controls and safety lockout switch engaged',
    'Fastened 3-point seatbelt harness prior to machine operation',
  ];

  const quiz = module.quiz || [
    {
      question: 'What is the primary action when a safety sensor triggers an in-cab alert?',
      options: [
        'Continue working at reduced speed',
        'Bring hydraulic controls to neutral and verify perimeter clearance',
        'Silence the alarm and wait for supervisor',
        'Power cycle the machine engine immediately',
      ],
      correctIndex: 1,
      explanation: 'Neutralizing hydraulic controls immediately stops all rotating and travel inertia.',
    },
  ];

  const handleChecklistToggle = (idx) => {
    setCheckedItems((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleAnswerSelect = (qIdx, optIdx) => {
    if (quizSubmitted) return;
    setQuizAnswers((prev) => ({ ...prev, [qIdx]: optIdx }));
  };

  const allChecklistDone = checklist.every((_, idx) => checkedItems[idx]);
  const quizScore = quiz.reduce(
    (score, q, idx) => (quizAnswers[idx] === q.correctIndex ? score + 1 : score),
    0
  );

  const isCompleted = module.completionStatus === 'Completed';

  return (
    <div className="cat-modal-backdrop" onClick={onClose}>
      <div className="cat-modal article-reader-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cat-modal-header">
          <div className="article-reader-head">
            <span className="cat-badge cat-badge-yellow mono-val">{module.moduleId}</span>
            <div>
              <span className="cat-badge cat-badge-sm cat-badge-muted">CERTIFIED SOP ARTICLE</span>
              <h3>{module.title}</h3>
            </div>
          </div>
          <button className="cat-icon-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="article-modal-tabs">
          <button
            className={`article-tab-btn ${activeTab === 'article' ? 'active' : ''}`}
            onClick={() => setActiveTab('article')}
          >
            <BookOpen size={14} />
            <span>Full Article & Guidelines</span>
          </button>
          <button
            className={`article-tab-btn ${activeTab === 'checklist' ? 'active' : ''}`}
            onClick={() => setActiveTab('checklist')}
          >
            <ListChecks size={14} />
            <span>Operator Checklist ({Object.values(checkedItems).filter(Boolean).length}/{checklist.length})</span>
          </button>
          <button
            className={`article-tab-btn ${activeTab === 'quiz' ? 'active' : ''}`}
            onClick={() => setActiveTab('quiz')}
          >
            <HelpCircle size={14} />
            <span>Knowledge Check ({quiz.length} Qs)</span>
          </button>
        </div>

        <div className="cat-modal-body article-reader-body">
          <div className="article-meta-banner">
            <span>Category: <strong>{module.category || 'Safety Compliance'}</strong></span>
            <span>Est. Reading Time: <strong>{module.durationMin || 8} min</strong></span>
            <span>Standard: <strong className="text-yellow">CAT Global Ops Standard 2026</strong></span>
            <span>Status: <strong className={isCompleted ? 'text-green' : 'text-amber'}>{module.completionStatus}</strong></span>
          </div>

          {/* TAB 1: ARTICLE CONTENT */}
          {activeTab === 'article' && (
            <div className="article-markdown-content">
              {(module.content || '').split('\n\n').map((paragraph, idx) => {
                if (paragraph.startsWith('### ')) {
                  return (
                    <h4 key={idx} className="article-section-heading">
                      {paragraph.replace('### ', '')}
                    </h4>
                  );
                }
                if (paragraph.startsWith('- ')) {
                  const bullets = paragraph.split('\n');
                  return (
                    <ul key={idx} className="article-bullet-list">
                      {bullets.map((b, bIdx) => (
                        <li key={bIdx}>{b.replace(/^- /, '')}</li>
                      ))}
                    </ul>
                  );
                }
                return <p key={idx} className="article-p">{paragraph}</p>;
              })}

              <div className="article-compliance-callout">
                <ShieldCheck size={20} className="text-yellow-dark flex-shrink-0" />
                <div>
                  <strong>Caterpillar Compliance Note:</strong>
                  <p>
                    All operators must adhere to standard 3-point harness protocols and minimum 3.0m proximity envelopes. Non-compliance results in automatic supervisory audit logs.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: OPERATOR CHECKLIST */}
          {activeTab === 'checklist' && (
            <div className="article-checklist-view">
              <div className="checklist-intro">
                <ListChecks size={18} className="text-yellow-dark" />
                <span>Verify and check off each mandatory field requirement before certifying this module:</span>
              </div>

              <div className="interactive-checklist">
                {checklist.map((item, idx) => (
                  <label key={idx} className={`checklist-item-row ${checkedItems[idx] ? 'item-checked' : ''}`}>
                    <input
                      type="checkbox"
                      checked={!!checkedItems[idx]}
                      onChange={() => handleChecklistToggle(idx)}
                      className="cat-checkbox"
                    />
                    <span className="checklist-item-text">{item}</span>
                    {checkedItems[idx] && <Check size={16} className="text-green ml-auto" />}
                  </label>
                ))}
              </div>

              {allChecklistDone && (
                <div className="checklist-success-box">
                  <CheckCircle2 size={20} className="text-green flex-shrink-0" />
                  <span>All safety checklist items verified by Operator. Ready for certification.</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: KNOWLEDGE CHECK QUIZ */}
          {activeTab === 'quiz' && (
            <div className="article-quiz-view">
              <div className="quiz-intro">
                <HelpCircle size={18} className="text-yellow-dark" />
                <span>Test your operational understanding. Select the best answer for each question:</span>
              </div>

              <div className="quiz-questions-list">
                {quiz.map((q, qIdx) => {
                  const selected = quizAnswers[qIdx];
                  const isCorrect = selected === q.correctIndex;

                  return (
                    <div key={qIdx} className="quiz-question-card">
                      <div className="quiz-q-title">
                        <span className="quiz-q-num">Q{qIdx + 1}:</span> {q.question}
                      </div>

                      <div className="quiz-options-list">
                        {q.options.map((opt, optIdx) => {
                          let optClass = 'quiz-option-btn';
                          if (selected === optIdx) optClass += ' selected';
                          if (quizSubmitted) {
                            if (optIdx === q.correctIndex) optClass += ' correct';
                            else if (selected === optIdx) optClass += ' incorrect';
                          }

                          return (
                            <button
                              key={optIdx}
                              className={optClass}
                              onClick={() => handleAnswerSelect(qIdx, optIdx)}
                              disabled={quizSubmitted}
                            >
                              <span className="opt-letter">{String.fromCharCode(65 + optIdx)}</span>
                              <span className="opt-text">{opt}</span>
                            </button>
                          );
                        })}
                      </div>

                      {quizSubmitted && (
                        <div className={`quiz-feedback-box ${isCorrect ? 'correct' : 'incorrect'}`}>
                          <strong>{isCorrect ? '✓ Correct!' : '✗ Incorrect:'}</strong> {q.explanation}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="quiz-actions-row">
                {!quizSubmitted ? (
                  <button
                    className="cat-btn cat-btn-primary"
                    onClick={() => setQuizSubmitted(true)}
                    disabled={Object.keys(quizAnswers).length < quiz.length}
                  >
                    <CheckCircle2 size={16} />
                    <span>Submit Knowledge Check</span>
                  </button>
                ) : (
                  <div className="quiz-score-banner">
                    <Award size={20} className="text-yellow-dark" />
                    <span>
                      Score: <strong>{quizScore} / {quiz.length}</strong> (
                      {quizScore === quiz.length ? '100% Mastered' : 'Reviewed'})
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="cat-modal-footer">
          <button className="cat-btn cat-btn-secondary" onClick={onClose}>
            Close
          </button>

          <button
            className={`cat-btn ${
              isCompleted ? 'cat-btn-secondary' : 'cat-btn-success'
            }`}
            onClick={() => {
              onToggleComplete(module.moduleId);
              onClose();
            }}
          >
            <CheckCircle2 size={16} />
            <span>
              {isCompleted ? 'Certified & Completed ✓' : 'Complete & Certify Article'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
