
import { GoogleGenAI, Type } from "@google/genai";

// This runs on the server, so process.env.API_KEY is secure and available.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Vercel automatically turns this file into a serverless function.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // The frontend will send a JSON body with the task and payload.
    const { task, payload } = req.body;

    let response;
    
    switch (task) {
      case 'generateSingleScene': {
        const { image, prompt } = payload;
        const imagePart = { inlineData: image };
        const schema = {
          type: Type.OBJECT,
          properties: {
            narrative: { type: Type.STRING },
            dialogue: { type: Type.STRING },
          },
          required: ["narrative", "dialogue"]
        };
        
        response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: { parts: [imagePart, { text: prompt }] },
          config: {
            responseMimeType: "application/json",
            responseSchema: schema,
            temperature: 0.7,
          },
        });
        break;
      }
      
      case 'refineText':
      case 'translateText': {
        const { prompt } = payload;
        response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: { temperature: 0.3 },
        });
        break;
      }
      
      default:
        return res.status(400).json({ error: 'Invalid task specified' });
    }

    // Send the successful response text back to the client.
    res.status(200).json({ text: response.text });

  } catch (error) {
    console.error('Error in Vercel API route:', error);
    res.status(500).json({ error: 'An error occurred while communicating with the AI model.' });
  }
}
