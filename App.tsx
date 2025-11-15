import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Preset, ChatMessage, ImageData, ConversionHistoryItem } from './types';
import { PRESETS, INITIAL_ASSISTANT_MESSAGE } from './constants';
import { generateSvg, generateSvgFromText } from './services/geminiService';

// --- Helper Functions & Icons ---

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = (error) => reject(error);
  });

const UploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
);

const MagicWandIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v1.046a1 1 0 01.996 1.045 1 1 0 01-1.045.996A1 1 0 0111 4V3a1 1 0 01-1-1 1 1 0 011.3-.954zM14 4a1 1 0 100-2 1 1 0 000 2zM6 4a1 1 0 100-2 1 1 0 000 2zM2 7a1 1 0 011-1h1a1 1 0 110 2H3a1 1 0 01-1-1zm14 0a1 1 0 011-1h1a1 1 0 110 2h-1a1 1 0 01-1-1zM7 9a1 1 0 00-1 1v1a1 1 0 102 0v-1a1 1 0 00-1-1zm8 0a1 1 0 00-1 1v1a1 1 0 102 0v-1a1 1 0 00-1-1zM4 14a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm10 0a1 1 0 011-1h1a1 1 0 110 2h-1a1 1 0 01-1-1zM5 16a1 1 0 100 2h10a1 1 0 100-2H5z" clipRule="evenodd" />
    </svg>
);

const NewFileIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
);

const UndoIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"/></svg>
);

const RedoIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="m15 14 5-5-5-5"/><path d="M19.5 9H9a5.5 5.5 0 0 0-5.5 5.5v0A5.5 5.5 0 0 0 9 20h2"/></svg>
);


const Loader = () => (
    <div className="flex items-center space-x-2">
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse [animation-delay:-0.3s]"></div>
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse [animation-delay:-0.15s]"></div>
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
    </div>
);

// --- Child Components ---

interface FileUploadProps {
  onFileUpload: (file: File) => void;
  imagePreview: string | null;
  imageName: string | null;
}
const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload, imagePreview, imageName }) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileUpload(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => e.preventDefault();
  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="w-full">
      <label onDragOver={handleDragOver} onDrop={handleDrop} className={`flex justify-center w-full h-48 px-4 transition bg-gray-800 border-2 ${imagePreview ? 'border-primary' : 'border-gray-600'} border-dashed rounded-md appearance-none cursor-pointer hover:border-primary focus:outline-none`}>
        {imagePreview ? (
          <div className="flex flex-col items-center justify-center text-center">
            <img src={imagePreview} alt="Preview" className="max-h-32 object-contain rounded-md mb-2"/>
            <p className="text-sm text-gray-400 truncate max-w-full px-2">{imageName}</p>
          </div>
        ) : (
          <span className="flex flex-col items-center justify-center space-y-2">
            <UploadIcon />
            <span className="font-medium text-gray-400">Drop files to Attach, or <span className="text-primary underline">browse</span></span>
          </span>
        )}
        <input type="file" name="file_upload" className="hidden" accept="image/png, image/jpeg" onChange={handleFileChange} />
      </label>
    </div>
  );
};

interface PresetSelectorProps {
  selectedPreset: Preset;
  onSelectPreset: (preset: Preset) => void;
}
const PresetSelector: React.FC<PresetSelectorProps> = ({ selectedPreset, onSelectPreset }) => (
  <div className="w-full">
    <h3 className="text-lg font-semibold mb-3 text-gray-300">Choose a Preset</h3>
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {PRESETS.map((preset) => (
        <button
          key={preset}
          onClick={() => onSelectPreset(preset)}
          className={`px-4 py-2 text-sm font-medium transition-colors rounded-md ${
            selectedPreset === preset
              ? 'bg-primary text-white shadow-lg'
              : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
          }`}
        >
          {preset}
        </button>
      ))}
    </div>
  </div>
);


interface ResultDisplayProps {
    svgCode: string | null;
    onUndo: () => void;
    onRedo: () => void;
    canUndo: boolean;
    canRedo: boolean;
}
const ResultDisplay: React.FC<ResultDisplayProps> = ({ svgCode, onUndo, onRedo, canUndo, canRedo }) => {
    if (!svgCode) {
        return (
            <div className="flex items-center justify-center h-full bg-gray-800 rounded-lg">
                <div className="text-center p-8">
                    <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <h3 className="mt-4 text-lg font-medium text-gray-400">Your generated SVG will appear here</h3>
                    <p className="mt-1 text-sm text-gray-500">Upload an image or describe one to get started.</p>
                </div>
            </div>
        );
    }

    const dataUrl = `data:image/svg+xml;base64,${btoa(svgCode)}`;

    const handleDownload = () => {
        // Safety check to ensure there's SVG code to download.
        if (!svgCode) return;

        // Use the browser's prompt to ask the user for a filename.
        const filenameInput = prompt("Enter a filename for your SVG:", "generated.svg");

        // If the user clicks "Cancel", the prompt returns null. We abort in that case.
        if (filenameInput === null) {
            return;
        }

        // Use the user's input, or fall back to a default name if the input is empty.
        let filename = filenameInput.trim() || "generated.svg";

        // Ensure the filename consistently has the .svg extension.
        if (!filename.toLowerCase().endsWith('.svg')) {
            filename += '.svg';
        }
        
        const blob = new Blob([svgCode], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(svgCode);
    };

    return (
        <div className="bg-gray-800 p-4 rounded-lg h-full flex flex-col">
            <div className="flex-grow flex items-center justify-center p-4 bg-gray-900/50 rounded-md overflow-hidden">
                <img src={dataUrl} alt="Generated SVG" className="max-w-full max-h-full object-contain" />
            </div>
            <div className="flex items-center justify-between mt-4">
                 <div className="flex items-center space-x-2">
                    <button onClick={onUndo} disabled={!canUndo} className="p-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Undo">
                        <UndoIcon />
                    </button>
                    <button onClick={onRedo} disabled={!canRedo} className="p-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Redo">
                        <RedoIcon />
                    </button>
                </div>
                <div className="flex items-center space-x-2">
                    <button onClick={handleCopy} className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-md transition-colors">Copy Code</button>
                    <button onClick={handleDownload} className="px-4 py-2 text-sm bg-primary hover:bg-primary-hover text-white rounded-md transition-colors">Download SVG</button>
                </div>
            </div>
        </div>
    );
};


interface AiAssistantProps {
    messages: ChatMessage[];
    isLoading: boolean;
    onSendMessage: (message: string) => void;
    prompt: string;
    setPrompt: (prompt: string) => void;
    imageUploaded: boolean;
}
const AiAssistant: React.FC<AiAssistantProps> = ({ messages, isLoading, onSendMessage, prompt, setPrompt, imageUploaded }) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }

    useEffect(scrollToBottom, [messages, isLoading]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (prompt.trim() && !isLoading) {
                onSendMessage(prompt);
            }
        }
    };
    
    return (
        <div className="bg-gray-800 rounded-lg flex flex-col h-full max-h-[calc(100vh-4rem)]">
            <div className="flex-grow p-4 space-y-4 overflow-y-auto">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-lg ${msg.role === 'user' ? 'bg-primary text-white' : 'bg-gray-700 text-gray-200'}`}>
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-lg bg-gray-700 text-gray-200">
                           <Loader/>
                        </div>
                    </div>
                )}
                 <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t border-gray-700">
                 <div className="relative">
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={imageUploaded ? "Describe how to convert the image..." : "Describe an SVG to generate..."}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 pr-20 resize-none focus:ring-2 focus:ring-primary focus:outline-none"
                        rows={2}
                        disabled={isLoading}
                    />
                    <button 
                        onClick={() => onSendMessage(prompt)}
                        disabled={!prompt.trim() || isLoading}
                        className="absolute right-3 top-1/2 -translate-y-1/2 bg-primary disabled:bg-gray-600 text-white p-2 rounded-md hover:bg-primary-hover transition-colors"
                        aria-label="Generate SVG"
                    >
                        <MagicWandIcon />
                    </button>
                 </div>
            </div>
        </div>
    );
};


// --- Main App Component ---

const LOCAL_STORAGE_KEY = 'ai-svg-converter-history';

export default function App() {
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<Preset>(Preset.LOGO);
  const [prompt, setPrompt] = useState<string>('');
  const [conversation, setConversation] = useState<ChatMessage[]>([INITIAL_ASSISTANT_MESSAGE]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // SVG history state
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const generatedSvg = history[historyIndex] ?? null;

  // Saved sessions state
  const [savedSessions, setSavedSessions] = useState<ConversionHistoryItem[]>([]);

  useEffect(() => {
    try {
      const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedData) {
        setSavedSessions(JSON.parse(savedData));
      }
    } catch (error) {
      console.error("Failed to load conversion history from localStorage", error);
      localStorage.removeItem(LOCAL_STORAGE_KEY); // Clear corrupted data
    }
  }, []);

  const handleFileUpload = useCallback(async (file: File) => {
    const supportedTypes = ['image/png', 'image/jpeg'];
    if (!supportedTypes.includes(file.type)) {
      const errorMessage = 'Please upload a valid PNG or JPG file.';
      setError(errorMessage);
      setConversation(prev => [...prev, {role: 'model', content: `Sorry, I can only process PNG and JPG files.`}]);
      return;
    }
    setError(null);
    
    setImagePreview(URL.createObjectURL(file));

    try {
        const base64 = await fileToBase64(file);
        setImageData({ base64, mimeType: file.type, name: file.name });
        setConversation(prev => [...prev, {role: 'model', content: `Great! I've loaded '${file.name}'. Now describe what kind of SVG you'd like to create.`}]);
    } catch (err) {
        console.error("Error reading file:", err);
        const errorMessage = "Sorry, I couldn't read that file. It might be corrupted. Please try another one.";
        setError(errorMessage);
        setConversation(prev => [...prev, {role: 'model', content: errorMessage}]);
    }
  }, []);

  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return;

    const newUserMessage: ChatMessage = { role: 'user', content: message };
    setConversation(prev => [...prev, newUserMessage]);
    setPrompt('');
    setIsLoading(true);
    setError(null);

    try {
      const conversationHistory = [...conversation, newUserMessage];
      const { svg, text } = imageData
        ? await generateSvg(imageData, message, selectedPreset, conversationHistory)
        : await generateSvgFromText(message, selectedPreset, conversationHistory);
      
      if (svg) {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(svg);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
      }
      const newModelMessage: ChatMessage = { role: 'model', content: text };
      setConversation(prev => [...prev, newModelMessage]);

    } catch (e: any) {
        const errorMessage = e.message || "An unexpected error occurred.";
        setError(errorMessage);
        setConversation(prev => [...prev, {role: 'model', content: `Sorry, something went wrong: ${errorMessage}`}]);
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleNewConversion = () => {
    // Save the current session if it has meaningful content
    const isSessionDirty = !!imageData || history.length > 0 || conversation.length > 1;
    if (isSessionDirty) {
      const newSession: ConversionHistoryItem = {
        id: new Date().toISOString(),
        timestamp: Date.now(),
        imageData: imageData,
        selectedPreset: selectedPreset,
        conversation: conversation,
        svgHistory: history,
        svgHistoryIndex: historyIndex,
      };

      const updatedSessions = [newSession, ...savedSessions];
      setSavedSessions(updatedSessions);
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedSessions));
      } catch (error) {
        console.error("Failed to save conversion history to localStorage", error);
        setError("Could not save your last session; browser storage might be full.");
      }
    }

    // Reset the workspace for a new conversion
    setImageData(null);
    setImagePreview(null);
    setSelectedPreset(Preset.LOGO);
    setPrompt('');
    setConversation([INITIAL_ASSISTANT_MESSAGE]);
    setIsLoading(false);
    setError(null);
    setHistory([]);
    setHistoryIndex(-1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
    }
  };

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return (
    <main className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="text-center md:text-left">
                    <h1 className="text-4xl font-bold text-white">AI SVG Converter</h1>
                    <p className="mt-2 text-lg text-gray-400">Transform images or ideas into scalable vectors with AI</p>
                </div>
                <button 
                    onClick={handleNewConversion} 
                    className="flex-shrink-0 w-full md:w-auto flex items-center justify-center bg-primary hover:bg-primary-hover text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                    <NewFileIcon />
                    New SVG
                </button>
            </div>
        </header>
        
        {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg relative mb-6" role="alert">
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{error}</span>
            </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 flex flex-col space-y-8">
                <FileUpload onFileUpload={handleFileUpload} imagePreview={imagePreview} imageName={imageData?.name ?? null} />
                <PresetSelector selectedPreset={selectedPreset} onSelectPreset={setSelectedPreset} />
                <AiAssistant
                    messages={conversation}
                    isLoading={isLoading}
                    onSendMessage={handleSendMessage}
                    prompt={prompt}
                    setPrompt={setPrompt}
                    imageUploaded={!!imageData}
                />
            </div>

            <div className="lg:col-span-2">
                <ResultDisplay
                    svgCode={generatedSvg}
                    onUndo={handleUndo}
                    onRedo={handleRedo}
                    canUndo={canUndo}
                    canRedo={canRedo}
                />
            </div>
        </div>
      </div>
    </main>
  );
}
