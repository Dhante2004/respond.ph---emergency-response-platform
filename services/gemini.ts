
import { GoogleGenAI, Type } from "@google/genai";

// Use process.env.API_KEY directly as specified in the guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeIncident = async (description: string, incidentType: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze this emergency report and suggest verification priority and primary response steps.
      Type: ${incidentType}
      Description: ${description}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestedPriority: {
              type: Type.STRING,
              description: 'low, medium, high, or critical',
            },
            summary: {
              type: Type.STRING,
              description: 'Short summary of the incident.',
            },
            recommendedAgency: {
              type: Type.STRING,
              description: 'BFP, PNP, or PCG',
            },
            immediateActions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Actionable steps for dispatchers.',
            }
          },
          required: ["suggestedPriority", "summary", "recommendedAgency", "immediateActions"]
        },
      },
    });

    // Use response.text directly as a property and handle potential undefined
    const text = response.text;
    return text ? JSON.parse(text) : null;
  } catch (error) {
    console.error("Gemini analysis error:", error);
    return null;
  }
};
