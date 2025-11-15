import { GoogleGenAI, Content, GenerateContentResponse } from "@google/genai";
import { Preset, ImageData, ChatMessage } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  // This is a warning because in some environments, the key might be injected at runtime.
  console.warn("API_KEY environment variable not set. Please ensure it's available for the application to function.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const extractSvgCode = (text: string): string | null => {
  const svgRegex = /```svg\s*([\s\S]*?)\s*```/;
  const match = text.match(svgRegex);
  if (match && match[1]) {
    return match[1].trim();
  }
  return null;
};

const getModel = () => {
    // This function can be expanded later to select models based on complexity
    return 'gemini-2.5-flash';
}

// --- New Error and Response Handlers ---

const handleApiError = (error: any): never => {
    console.error("Error calling Gemini API:", error);
    const errorMessage = String(error.message || 'An unknown error occurred');

    if (errorMessage.includes('429') || /rate limit/i.test(errorMessage)) {
        throw new Error("API rate limit exceeded. Please wait a moment and try again.");
    }
    if (/API key not valid/i.test(errorMessage) || /API_KEY_INVALID/.test(errorMessage)) {
        throw new Error("The provided API key is invalid. Please check your configuration.");
    }
    // This is for content moderation errors we throw ourselves from processApiResponse
    if (errorMessage.includes('model could not generate a response')) {
        throw error;
    }
    
    // Fallback for other potential API or network errors.
    throw new Error("Failed to communicate with the AI model. It might be temporarily unavailable or there was a network issue.");
};

const processApiResponse = (response: GenerateContentResponse) => {
    // Check for content moderation blocks or other reasons for an empty response.
    if (!response.candidates || response.candidates.length === 0 || response.promptFeedback?.blockReason) {
        let reason = 'an unknown reason';
        if (response.promptFeedback?.blockReason === 'SAFETY') {
            const blockedCategories = response.promptFeedback.safetyRatings?.filter(r => r.probability !== 'NEGLIGIBLE').map(r => r.category.replace('HARM_CATEGORY_', '')).join(', ');
            reason = `its content was flagged as potentially unsafe${blockedCategories ? ` (${blockedCategories})` : ''}.`;
        } else if (response.promptFeedback?.blockReason) {
            reason = `of a policy violation (${response.promptFeedback.blockReason}).`;
        }
        throw new Error(`The model could not generate a response because ${reason} Please modify your prompt and try again.`);
    }
    
    const responseText = response.text;
    const svgCode = extractSvgCode(responseText);
    return { svgCode, responseText };
};


// --- Updated Service Functions ---

export const generateSvg = async (
  image: ImageData,
  prompt: string,
  preset: Preset,
  history: ChatMessage[]
): Promise<{ svg: string | null; text: string }> => {
  try {
    const systemInstruction = `You are an expert SVG designer. Your task is to convert the user's provided image into a high-quality, clean, and optimized SVG based on their instructions.
- If the user's prompt clearly asks for an SVG, you MUST respond ONLY with the raw SVG code within a single markdown block (e.g., \`\`\`svg ... \`\`\`).
- Do not include any other text, explanation, preamble, or conversational filler in your response when providing SVG code.
- If the user asks a question or the prompt is ambiguous, you can respond with conversational text to guide them. Do not provide SVG code in this case.
- The SVG code must be well-formed, valid, and scalable.
- Pay close attention to the selected preset ('${preset}') and the user's prompt to tailor the SVG style.`;

    const model = getModel();
    
    const imagePart = {
      inlineData: {
        data: image.base64,
        mimeType: image.mimeType,
      },
    };

    const textPart = {
      text: `Preset: ${preset}. User prompt: "${prompt}"`,
    };

    // FIX: Explicitly type `contents` as `Content[]` to allow for multi-modal parts.
    const contents: Content[] = history.map(msg => ({
        role: msg.role,
        parts: [{text: msg.content}]
    }));
    // Replace last user message with multi-modal content
    const lastContent = contents.pop();
    if(lastContent && lastContent.role === 'user') {
       contents.push({ role: 'user', parts: [imagePart, textPart] });
    }

    const response = await ai.models.generateContent({
        model: model,
        contents: contents,
        config: {
            systemInstruction: systemInstruction,
            temperature: 0.4,
        }
    });

    const { svgCode, responseText } = processApiResponse(response);

    return { svg: svgCode, text: svgCode ? "Here is the SVG I generated for you." : responseText };
  } catch (error) {
    handleApiError(error);
  }
};

export const generateSvgFromText = async (
  prompt: string,
  preset: Preset,
  history: ChatMessage[]
): Promise<{ svg: string | null; text: string }> => {
  try {
    const systemInstruction = `You are an expert SVG designer. Your task is to generate a high-quality, clean, and optimized SVG based on the user's text description.
- If the user's prompt clearly asks for an SVG, you MUST respond ONLY with the raw SVG code within a single markdown block (e.g., \`\`\`svg ... \`\`\`).
- Do not include any other text, explanation, preamble, or conversational filler in your response when providing SVG code.
- The SVG code must be well-formed, valid, and scalable.
- Pay close attention to the selected preset ('${preset}') and the user's prompt to tailor the SVG style. For example, if the user asks for a 'WiFi icon', generate a standard WiFi icon SVG.`;

    const model = getModel();
    
    const contents = history.map(msg => ({
        role: msg.role,
        parts: [{text: msg.content}]
    }));

    const response = await ai.models.generateContent({
        model: model,
        contents: contents,
        config: {
            systemInstruction: systemInstruction,
            temperature: 0.4,
        }
    });
    
    const { svgCode, responseText } = processApiResponse(response);

    return { svg: svgCode, text: svgCode ? "Here is the SVG I generated for you based on your description." : responseText };
  } catch (error) {
    handleApiError(error);
  }
};
