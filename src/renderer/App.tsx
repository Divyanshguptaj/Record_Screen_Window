import React, { useState, useCallback } from 'react';
import TitleBar from './components/TitleBar';
import SourcePicker from './components/SourcePicker';
import RecordingView from './components/RecordingView';
import CompleteView from './components/CompleteView';
import { AppScreen, Source, RecordingSession } from './types';

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('picker');
  const [selectedSource, setSelectedSource] = useState<Source | null>(null);
  const [useWebcam, setUseWebcam] = useState(false);
  const [session, setSession] = useState<RecordingSession | null>(null);

  const handleStartRecording = useCallback((source: Source, webcam: boolean) => {
    setSelectedSource(source);
    setUseWebcam(webcam);
    setScreen('recording');
  }, []);

  const handleRecordingComplete = useCallback((completedSession: RecordingSession) => {
    setSession(completedSession);
    setScreen('complete');
  }, []);

  const handleNewRecording = useCallback(() => {
    setSelectedSource(null);
    setSession(null);
    setScreen('picker');
  }, []);

  return (
    <div className="app">
      <TitleBar />
      <main className="app__content">
        {screen === 'picker' && (
          <SourcePicker onStart={handleStartRecording} />
        )}
        {screen === 'recording' && selectedSource && (
          <RecordingView
            source={selectedSource}
            useWebcam={useWebcam}
            onComplete={handleRecordingComplete}
          />
        )}
        {screen === 'complete' && session && (
          <CompleteView
            session={session}
            onNewRecording={handleNewRecording}
          />
        )}
      </main>
    </div>
  );
}
