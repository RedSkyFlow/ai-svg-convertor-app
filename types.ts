export enum Preset {
  LOGO = 'Logo',
  ICON = 'Icon',
  FAVICON = 'Favicon',
  TEXT = 'Text',
  BACKGROUND = 'Background',
  NONE = 'None',
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export interface ImageData {
  base64: string;
  mimeType: string;
  name: string;
}

export interface ConversionHistoryItem {
  id: string;
  timestamp: number;
  imageData: ImageData | null;
  selectedPreset: Preset;
  conversation: ChatMessage[];
  svgHistory: string[];
  svgHistoryIndex: number;
}
