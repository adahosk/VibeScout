
import { GoogleGenAI, Type } from "@google/genai";
import { UserLocation, PlaceSuggestion, ComparisonMatrix, VibeType } from "./types";

const VIBE_SYSTEM_INSTRUCTION = `
    You are VibeScout, a high-end AI concierge that focuses on "Context over Content".
    Your goal is to find venues based on atmosphere, vibe, and specific user needs.
    
    GUIDELINES:
    1. Always use Google Maps grounding for up-to-date venue information.
    2. Analyze vibes based on reviews and context.
    3. JSON FORMAT REQUIREMENT:
    If you find places, you MUST include a JSON block with the following schema:
    {
      "suggestions": [
        {
          "id": "string",
          "name": "string",
          "address": "string",
          "vibe": "Quiet/Work" | "Romantic" | "Party/Lively" | "Casual" | "Fancy/Upscale",
          "vibeScore": number (0-10),
          "distance": "string (e.g. 0.5 miles)",
          "priceLevel": "string (e.g. $$$)",
          "bestFor": "string",
          "noiseLevel": "Low" | "Medium" | "High",
          "summary": "string",
          "rating": number,
          "mapsUrl": "string (FULL GOOGLE MAPS URL)"
        }
      ],
      "comparison": {
        "headers": ["Venue A", "Venue B"],
        "rows": [
          {"feature": "Atmosphere", "values": ["Dimly lit, cozy", "Bright, industrial"]}
        ]
      }
    }
`;

const IMAGE_SYSTEM_INSTRUCTION = `
    You are a visual geolocation and vibe expert. 
    Analyze the provided image to identify exactly where it was taken.
    Look for: Landmarks, street signs, architectural styles, and unique vegetation.
    
    TASK:
    1. Identify the location or most likely area.
    2. Provide a Google Maps link if you can find a specific spot.
    3. Analyze the "vibe" of the scene (e.g., "Lively Mediterranean street vibe").
    4. If the user asks for similar places, use your reasoning to suggest nearby spots.
    
    If you identify a specific venue, include the JSON structure as defined for VibeScout suggestions.
`;

export async function processConversation(
  messages: { role: 'user' | 'assistant', content: string }[],
  location: UserLocation | null
) {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelName = 'gemini-2.5-flash';
  
  try {
    const config: any = {
      tools: [{ googleMaps: {} }],
      systemInstruction: VIBE_SYSTEM_INSTRUCTION,
    };

    if (location) {
      config.toolConfig = {
        retrievalConfig: { latLng: { latitude: location.latitude, longitude: location.longitude } },
      };
    }

    const response = await ai.models.generateContent({
      model: modelName,
      contents: messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      })),
      config,
    });

    const groundingLinks: { title: string; url: string }[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    chunks.forEach((chunk: any) => {
      if (chunk.maps) {
        groundingLinks.push({
          title: chunk.maps.title || 'View on Google Maps',
          url: chunk.maps.uri
        });
      }
    });

    return {
      text: response.text,
      groundingLinks
    };
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
}

export async function analyzeImage(
  imageData: string,
  prompt: string,
  location: UserLocation | null
) {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelName = 'gemini-3-pro-preview';
  
  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: [
          { inlineData: { data: imageData.split(',')[1], mimeType: 'image/jpeg' } },
          { text: prompt || "Identify the location in this image and describe its vibe. Provide a Google Maps link if possible." }
        ]
      },
      config: {
        systemInstruction: IMAGE_SYSTEM_INSTRUCTION,
      },
    });

    return {
      text: response.text,
    };
  } catch (error) {
    console.error("Image Analysis Error:", error);
    throw error;
  }
}
