import React, { useEffect, useState, useCallback } from 'react';
import { Source } from '../types';

interface Props {
  onStart: (source: Source, useWebcam: boolean) => void;
}

export default function SourcePicker({ onStart }: Props) {
  const [sources, setSources] = useState<Source[]>([]);
  const [selected, setSelected] = useState<Source | null>(null);
  const [useWebcam, setUseWebcam] = useState(false);
  const [webcamAllowed, setWebcamAllowed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'screen' | 'window'>('all');

  const loadSources = useCallback(async () => {
    setLoading(true);
    try {
      const result = await window.electronAPI.getSources();
      setSources(result);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSources(); }, [loadSources]);

  const handleWebcamToggle = async (checked: boolean) => {
    if (checked && webcamAllowed === null) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach((t) => t.stop());
        setWebcamAllowed(true);
        setUseWebcam(true);
      } catch {
        setWebcamAllowed(false);
        setUseWebcam(false);
      }
    } else {
      setUseWebcam(checked);
    }
  };

  const filtered = sources.filter((s) => {
    if (filter === 'screen') return s.id.startsWith('screen:');
    if (filter === 'window') return s.id.startsWith('window:');
    return true;
  });

  return (
    <div className="picker">
      <div className="picker__header">
        <h1 className="picker__title">Choose a source to record</h1>
        <p className="picker__subtitle">Select a screen or window below</p>
      </div>

      <div className="picker__toolbar">
        <div className="picker__filters">
          {(['all', 'screen', 'window'] as const).map((f) => (
            <button
              key={f}
              className={`filter-btn ${filter === f ? 'filter-btn--active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : f === 'screen' ? 'Screens' : 'Windows'}
            </button>
          ))}
        </div>
        <button className="icon-btn" onClick={loadSources} title="Refresh sources">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 4v6h-6M1 20v-6h6" /><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="picker__loading">
          <div className="spinner" />
          <span>Loading sources…</span>
        </div>
      ) : (
        <div className="source-grid">
          {filtered.map((source) => (
            <button
              key={source.id}
              className={`source-card ${selected?.id === source.id ? 'source-card--selected' : ''}`}
              onClick={() => setSelected(source)}
            >
              <div className="source-card__thumb">
                <img src={source.thumbnail} alt={source.name} />
                {selected?.id === source.id && (
                  <div className="source-card__check">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="white" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="source-card__label">
                {source.appIconUrl && (
                  <img className="source-card__icon" src={source.appIconUrl} alt="" />
                )}
                <span>{source.name}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="picker__footer">
        <label className="webcam-toggle">
          <div
            className={`toggle-switch ${useWebcam ? 'toggle-switch--on' : ''}`}
            onClick={() => handleWebcamToggle(!useWebcam)}
          >
            <div className="toggle-switch__thumb" />
          </div>
          <span>Record webcam</span>
          {webcamAllowed === false && (
            <span className="webcam-toggle__error">Camera permission denied</span>
          )}
        </label>

        <button
          className="btn btn--primary"
          disabled={!selected}
          onClick={() => selected && onStart(selected, useWebcam)}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <circle cx="12" cy="12" r="10" opacity="0.2"/>
            <circle cx="12" cy="12" r="4"/>
          </svg>
          Start Recording
        </button>
      </div>
    </div>
  );
}
