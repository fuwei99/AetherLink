export interface WorkspaceFile {
  name: string;
  path: string;
  size: number;
  isDirectory: boolean;
  type: string;
  modifiedTime: number;
  extension?: string;
}

export interface MobileFileViewerProps {
  open: boolean;
  file: WorkspaceFile | null;
  onClose: () => void;
  onSave?: (content: string) => Promise<void>;
}

export type FileType = 'text' | 'image' | 'pdf' | 'code' | 'unknown';

export interface ZoomState {
  scale: number;
  minScale: number;
  maxScale: number;
}
