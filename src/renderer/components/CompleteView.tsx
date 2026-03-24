import React, { useState } from 'react';
import { RecordingSession } from '../types';

interface Props {
  session: RecordingSession;
  onNewRecording: () => void;
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function CompleteView({ session, onNewRecording }: Props) {
  const [folderPath, setFolderPath] = useState(session.folderPath);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState('');
  const [renameError, setRenameError] = useState('');

  const handleRename = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    // Sanitize: replace chars not suitable for folder names
    const safe = trimmed.replace(/[/\\:*?"<>|]/g, '_');
    const result = await window.electronAPI.renameSession(session.uuid, safe);
    if (result) {
      setFolderPath(result);
      setRenaming(false);
      setNewName('');
    } else {
      setRenameError('Could not rename — a folder with that name may already exist.');
    }
  };

  return (
    <div className="complete-view">
      <div className="complete-view__icon">
        <svg viewBox="0 0 24 24" width="56" height="56" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10" />
          <polyline points="9 12 11 14 15 10" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      <h1 className="complete-view__title">Recording saved!</h1>
      <p className="complete-view__subtitle">
        Duration: <strong>{formatDuration(session.duration)}</strong>
        {session.hasWebcam && <> &nbsp;·&nbsp; Webcam included</>}
      </p>

      <div className="complete-view__files">
        <div className="file-badge">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" opacity="0.6">
            <path d="M15 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7z"/>
          </svg>
          screen.webm
        </div>
        {session.hasWebcam && (
          <div className="file-badge">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" opacity="0.6">
              <path d="M15 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7z"/>
            </svg>
            webcam.webm
          </div>
        )}
      </div>

      <div className="complete-view__path">
        <code>{folderPath}</code>
      </div>

      {renaming ? (
        <div className="complete-view__rename">
          <input
            className="rename-input"
            type="text"
            placeholder="New folder name…"
            value={newName}
            autoFocus
            onChange={(e) => { setNewName(e.target.value); setRenameError(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setRenaming(false); }}
          />
          <button className="btn btn--primary btn--sm" onClick={handleRename}>Save</button>
          <button className="btn btn--ghost btn--sm" onClick={() => setRenaming(false)}>Cancel</button>
          {renameError && <p className="rename-error">{renameError}</p>}
        </div>
      ) : (
        <button className="btn btn--ghost btn--sm" onClick={() => setRenaming(true)}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
          Rename session
        </button>
      )}

      <div className="complete-view__actions">
        <button
          className="btn btn--primary"
          onClick={() => window.electronAPI.openFolder(folderPath)}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
          </svg>
          Open Folder
        </button>
        <button className="btn btn--secondary" onClick={onNewRecording}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
          </svg>
          New Recording
        </button>
      </div>
    </div>
  );
}
