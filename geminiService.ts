
import { GoogleGenAI, Type } from "@google/genai";
import { UserLocation, PlaceSuggestion, ComparisonMatrix, VibeType } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function processConversation(
  messages: { role: 'user' | 'assistant', content: string }[],
  location: UserLocation | null
) {
  const modelName = 'gemini-2.5-flash'; // Optimized for Maps Grounding
  
  const systemInstruction = `
    You are VibeScout, a high-end AI concierge that focuses on "Context over Content".
    Your goal is to find venues based on atmosphere, vibe, and specific user needs rather than just ratings.
    
    GUIDELINES:
    1. Always use Google Maps grounding for up-to-date venue information.
    2. Analyze vibes (Romantic, Quiet, Party, etc.) based on reviews and context.
    3. If user intent is unclear, ask clarifying questions about cuisine, budget, distance, and vibe.
    4. When presenting results, always provide:
       - A natural language response explaining your choices.
       - A structured JSON representation of the suggestions and a comparison matrix.
    
    JSON FORMAT REQUIREMENT:
    If you find places, you MUST include a JSON block at the end of your response inside triple backticks with "json" tag.
    The JSON should follow this structure:
    {
      "suggestions": [
        {
          "id": "unique-id",
          "name": "Venue Name",
          "address": "Full Address",
          "vibe": "one of VibeType values",
          "vibeScore": 1-10,
          "distance": "e.g., 1.2 km",
          "priceLevel": "$/$$/$$$/$$$$",
          "bestFor": "Specific use case",
          "noiseLevel": "Low/Medium/High",
          "summary": "Short 1-sentence why it matches",
          "rating": 4.5,
          "mapsUrl": "Google Maps Link"
        }
      ],
      "comparison": {
        "headers": ["Venue A", "Venue B"],
        "rows": [
          { "feature": "Vibe", "values": ["Romantic", "Modern"] },
          { "feature": "Best For", "values": ["Date Night", "Quick Meeting"] }
        ]
      }
    }
  `;

  try {
    const config: any = {
      tools: [{ googleMaps: {} }],
      systemInstruction,
    };

    if (location) {
      config.toolConfig = {
        retrievalConfig: {
          latLng: {
            latitude: location.latitude,
            longitude: location.longitude,
          },
        },
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

    return {
      text: response.text,
      groundingChunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
    };
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
}
