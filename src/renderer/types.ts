export interface Source {
  id: string;
  name: string;
  thumbnail: string;
  appIconUrl: string | null;
}

export type AppScreen = 'picker' | 'recording' | 'complete';

export interface RecordingSession {
  uuid: string;
  folderPath: string;
  hasWebcam: boolean;
  duration: number; // seconds
}

declare global {
  interface Window {
    electronAPI: {
      getSources: () => Promise<Source[]>;
      saveBuffer: (folder: string, file: string, buffer: ArrayBuffer) => Promise<string>;
      renameSession: (oldName: string, newName: string) => Promise<string | null>;
      openFolder: (folderPath: string) => Promise<void>;
      chooseSaveDir: () => Promise<string | null>;
      windowMinimize: () => Promise<void>;
      windowMaximize: () => Promise<void>;
      windowClose: () => Promise<void>;
    };
  }
}
