
import { GoogleGenAI, Type } from "@google/genai";
import { AIResponse } from "../types";

export async function getGameCommentary(score: number, status: string, history: string[]): Promise<AIResponse> {
  // Gracefully handle missing API key to prevent app crash
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === "undefined" || apiKey === "") {
    return { commentary: "The Snake Master is observing silently." };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `The player is playing a Snake game. Current score: ${score}. Game status: ${status}. 
      Recent commentary history: ${history.slice(-3).join(', ')}.
      
      Provide a short, punchy piece of commentary as a "Snake Master". 
      - If playing, give encouragement or mock their length.
      - If game over, give a final witty remark.
      - Occasionally suggest a new "visual theme" name for the game (e.g., Cyberpunk, Jungle, Space).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            commentary: { type: Type.STRING, description: "A short witty comment (max 15 words)." },
            themeDescription: { type: Type.STRING, description: "Optional new theme name." },
            advice: { type: Type.STRING, description: "Short gameplay tip." }
          },
          required: ["commentary"]
        }
      }
    });

    const result = JSON.parse(response.text);
    return result;
  } catch (error) {
    console.error("Gemini Error:", error);
    return { commentary: "The Snake Master is lost in thought." };
  }
}
