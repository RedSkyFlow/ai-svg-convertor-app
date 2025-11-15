
import { Preset, ChatMessage } from './types';

export const PRESETS: Preset[] = [
  Preset.LOGO,
  Preset.ICON,
  Preset.FAVICON,
  Preset.TEXT,
  Preset.BACKGROUND,
];

export const INITIAL_ASSISTANT_MESSAGE: ChatMessage = {
  role: 'model',
  content: "Welcome! I'm here to help you convert your images into stunning SVGs. Please upload a PNG or JPG to get started. You can also select a preset to guide the conversion.",
};
