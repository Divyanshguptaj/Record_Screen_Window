import React, { useEffect, useRef, useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Source, RecordingSession } from '../types';

interface Props {
  source: Source;
  useWebcam: boolean;
  onComplete: (session: RecordingSession) => void;
}

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function RecordingView({ source, useWebcam, onComplete }: Props) {
  const webcamRef = useRef<HTMLVideoElement>(null);
  const screenRecorderRef = useRef<MediaRecorder | null>(null);
  const webcamRecorderRef = useRef<MediaRecorder | null>(null);
  const screenChunksRef = useRef<Blob[]>([]);
  const webcamChunksRef = useRef<Blob[]>([]);
  const sessionUUID = useRef(uuidv4());

  const [elapsed, setElapsed] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const [stopping, setStopping] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Start timer ──────────────────────────────────────────────────────────
  const startTimer = useCallback(() => {
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  // ── Init recording ───────────────────────────────────────────────────────
  useEffect(() => {
    let screenStream: MediaStream;
    let camStream: MediaStream | null = null;

    const start = async () => {
      // Screen capture via desktopCapturer source id
      screenStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          // @ts-ignore – Electron-specific constraint
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: source.id,
          },
        },
      });

      // Webcam capture
      if (useWebcam) {
        try {
          camStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          setWebcamStream(camStream);
          if (webcamRef.current) {
            webcamRef.current.srcObject = camStream;
          }
        } catch {
          console.warn('Webcam unavailable');
        }
      }

      // Screen recorder
      const screenRecorder = new MediaRecorder(screenStream, { mimeType: 'video/webm;codecs=vp8' });
      screenRecorder.ondataavailable = (e) => { if (e.data.size > 0) screenChunksRef.current.push(e.data); };
      screenRecorder.start(250);
      screenRecorderRef.current = screenRecorder;

      // Webcam recorder
      if (camStream) {
        const camRecorder = new MediaRecorder(camStream, { mimeType: 'video/webm;codecs=vp8' });
        camRecorder.ondataavailable = (e) => { if (e.data.size > 0) webcamChunksRef.current.push(e.data); };
        camRecorder.start(250);
        webcamRecorderRef.current = camRecorder;
      }

      startTimer();
    };

    start().catch(console.error);

    return () => {
      stopTimer();
      screenStream?.getTracks().forEach((t) => t.stop());
      camStream?.getTracks().forEach((t) => t.stop());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Pause / Resume ───────────────────────────────────────────────────────
  const togglePause = () => {
    const sr = screenRecorderRef.current;
    const wr = webcamRecorderRef.current;
    if (!sr) return;

    if (isPaused) {
      sr.resume();
      wr?.resume();
      startTimer();
    } else {
      sr.pause();
      wr?.pause();
      stopTimer();
    }
    setIsPaused((p) => !p);
  };

  // ── Stop & save ──────────────────────────────────────────────────────────
  const stopRecording = useCallback(async () => {
    setStopping(true);
    stopTimer();

    const finalize = (recorder: MediaRecorder | null, chunks: Blob[]): Promise<ArrayBuffer> =>
      new Promise((resolve) => {
        if (!recorder || recorder.state === 'inactive') {
          resolve(new Blob(chunks, { type: 'video/webm' }).arrayBuffer());
          return;
        }
        recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }).arrayBuffer());
        recorder.stop();
      });

    const [screenBuf, webcamBuf] = await Promise.all([
      finalize(screenRecorderRef.current, screenChunksRef.current),
      webcamRecorderRef.current
        ? finalize(webcamRecorderRef.current, webcamChunksRef.current)
        : Promise.resolve(null),
    ]);

    // Stop all tracks
    webcamStream?.getTracks().forEach((t) => t.stop());

    const uuid = sessionUUID.current;
    const folderPath = await window.electronAPI.saveBuffer(uuid, 'screen.webm', screenBuf);

    if (webcamBuf) {
      await window.electronAPI.saveBuffer(uuid, 'webcam.webm', webcamBuf);
    }

    onComplete({ uuid, folderPath, hasWebcam: !!webcamBuf, duration: elapsed });
  }, [elapsed, onComplete, stopTimer, webcamStream]);

  // Handle window close mid-recording
  useEffect(() => {
    const handleBeforeUnload = () => {
      screenRecorderRef.current?.stop();
      webcamRecorderRef.current?.stop();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  return (
    <div className="recording-view">
      <div className="recording-view__source-name">
        <span className="recording-badge">
          <span className={`recording-dot ${isPaused ? 'recording-dot--paused' : ''}`} />
          {isPaused ? 'Paused' : 'Recording'}
        </span>
        <span className="recording-view__name">{source.name}</span>
      </div>

      <div className="recording-view__timer">{formatTime(elapsed)}</div>

      {useWebcam && webcamStream && (
        <div className="webcam-preview">
          <video ref={webcamRef} autoPlay muted playsInline />
          <div className="webcam-preview__label">Webcam</div>
        </div>
      )}

      <div className="recording-view__controls">
        <button
          className={`btn ${isPaused ? 'btn--primary' : 'btn--secondary'}`}
          onClick={togglePause}
          disabled={stopping}
        >
          {isPaused ? (
            <>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              Resume
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
              </svg>
              Pause
            </>
          )}
        </button>

        <button
          className="btn btn--danger"
          onClick={stopRecording}
          disabled={stopping}
        >
          {stopping ? (
            <>
              <div className="spinner spinner--sm" /> Saving…
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <rect x="4" y="4" width="16" height="16" rx="2"/>
              </svg>
              Stop Recording
            </>
          )}
        </button>
      </div>

      <p className="recording-view__hint">
        Recording to <code>Videos/screen-recorder/{sessionUUID.current.slice(0, 8)}…</code>
      </p>
    </div>
  );
}
