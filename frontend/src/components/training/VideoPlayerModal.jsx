import React, { useState, useEffect } from 'react';
import {
  Video,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  FastForward,
  CheckCircle2,
  Clock,
  BookOpen,
  X,
  Sparkles,
} from 'lucide-react';

export default function VideoPlayerModal({ module, onClose, onToggleComplete }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeSec, setCurrentTimeSec] = useState(45);
  const [playbackSpeed, setPlaybackSpeed] = useState('1.0x');
  const [isMuted, setIsMuted] = useState(false);
  const totalDurationSec = 342; // ~05:42

  useEffect(() => {
    let timer;
    if (isPlaying) {
      timer = setInterval(() => {
        setCurrentTimeSec((prev) => {
          if (prev >= totalDurationSec) {
            setIsPlaying(false);
            return totalDurationSec;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isPlaying]);

  if (!module) return null;

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
  };

  const progressPct = (currentTimeSec / totalDurationSec) * 100;

  return (
    <div className="cat-modal-backdrop" onClick={onClose}>
      <div className="cat-modal video-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cat-modal-header">
          <div className="article-reader-head">
            <span className="cat-badge cat-badge-yellow mono-val">{module.moduleId}</span>
            <div className="video-head-title">
              <span className="cat-badge cat-badge-sm cat-badge-muted">E-LEARNING VIDEO</span>
              <h3>{module.title}</h3>
            </div>
          </div>
          <button className="cat-icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="cat-modal-body video-modal-body">
          {/* Simulated Video Player Screen */}
          <div className="video-player-container">
            <div className="video-stage">
              <div className="video-watermark">CAT® LEARNING NETWORK</div>

              <div className="video-visual-content">
                <div className="video-animation-box">
                  <div className="excavator-icon-anim">🚜</div>
                  <div className="video-overlay-text">
                    {module.title}
                  </div>
                  <div className="video-time-tag mono-val">
                    {isPlaying ? '● STREAMING LIVE CAB FEED' : '❚❚ PAUSED'}
                  </div>
                </div>
              </div>

              {/* Big Center Play Toggle */}
              <button
                className="video-center-btn"
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? <Pause size={32} /> : <Play size={32} className="ml-1" />}
              </button>

              {/* Video Bottom Control Bar */}
              <div className="video-controls-bar">
                <button
                  className="video-ctrl-btn"
                  onClick={() => setIsPlaying(!isPlaying)}
                >
                  {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                </button>

                <button
                  className="video-ctrl-btn"
                  onClick={() => setCurrentTimeSec(0)}
                  title="Restart"
                >
                  <RotateCcw size={14} />
                </button>

                <div className="video-scrubber-wrap">
                  <div
                    className="video-scrubber-fill"
                    style={{ width: `${progressPct}%` }}
                  ></div>
                </div>

                <div className="video-time-display mono-val">
                  {formatTime(currentTimeSec)} / {module.videoDuration || '05:42'}
                </div>

                <button
                  className="video-ctrl-btn"
                  onClick={() => setIsMuted(!isMuted)}
                >
                  {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>

                <button
                  className="speed-pill-btn"
                  onClick={() =>
                    setPlaybackSpeed((prev) =>
                      prev === '1.0x' ? '1.25x' : prev === '1.25x' ? '1.5x' : '1.0x'
                    )
                  }
                >
                  {playbackSpeed}
                </button>
              </div>
            </div>
          </div>

          {/* Chapters & Transcript Layout */}
          <div className="video-content-grid">
            {/* Chapters Box */}
            <div className="video-chapters-box">
              <div className="video-box-title">
                <Clock size={15} className="text-yellow-dark" />
                <span>VIDEO CHAPTERS</span>
              </div>
              <div className="chapters-list">
                {(module.chapters || []).map((ch, idx) => (
                  <button
                    key={idx}
                    className="chapter-item"
                    onClick={() => {
                      const [m, s] = ch.time.split(':');
                      setCurrentTimeSec(parseInt(m, 10) * 60 + parseInt(s, 10));
                      setIsPlaying(true);
                    }}
                  >
                    <span className="chapter-time mono-val">{ch.time}</span>
                    <span className="chapter-name">{ch.title}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Transcript & Key Notes */}
            <div className="video-transcript-box">
              <div className="video-box-title">
                <BookOpen size={15} className="text-yellow-dark" />
                <span>KEY LEARNING PROTOCOLS</span>
              </div>
              <p className="transcript-text">{module.transcript}</p>
              <div className="video-takeaway-chip">
                <Sparkles size={14} className="text-yellow-dark" />
                <span>Standard operating compliance requirement for CAT Level 2 Excavator Certification.</span>
              </div>
            </div>
          </div>
        </div>

        <div className="cat-modal-footer">
          <button className="cat-btn cat-btn-secondary" onClick={onClose}>
            Close
          </button>

          <button
            className={`cat-btn ${
              module.completionStatus === 'Completed' ? 'cat-btn-secondary' : 'cat-btn-success'
            }`}
            onClick={() => {
              onToggleComplete(module.moduleId);
              onClose();
            }}
          >
            <CheckCircle2 size={16} />
            <span>
              {module.completionStatus === 'Completed' ? 'Completed ✓' : 'Mark Video Module Complete'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
