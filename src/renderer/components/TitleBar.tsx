import React from 'react';

export default function TitleBar() {
  return (
    <div className="titlebar">
      <span className="titlebar__title">
        <span className="titlebar__dot" /> Screen Recorder
      </span>
      <div className="titlebar__controls">
        <button
          className="titlebar__btn titlebar__btn--minimize"
          onClick={() => window.electronAPI.windowMinimize()}
          aria-label="Minimize"
        />
        <button
          className="titlebar__btn titlebar__btn--maximize"
          onClick={() => window.electronAPI.windowMaximize()}
          aria-label="Maximize"
        />
        <button
          className="titlebar__btn titlebar__btn--close"
          onClick={() => window.electronAPI.windowClose()}
          aria-label="Close"
        />
      </div>
    </div>
  );
}
