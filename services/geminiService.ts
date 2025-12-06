
import { Scene } from "../types";

// Helper function to securely call our backend API route
async function callAIApi(task: string, payload: object) {
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ task, payload }),
  });

  if (!response.ok) {
    const errorBody = await response.json();
    throw new Error(errorBody.error || 'API request failed');
  }

  const data = await response.json();
  return data.text;
}

/**
 * Single Image Analysis
 */
export const generateSingleScene = async (
  image: { data: string; mimeType: string },
  context: { title: string; studentName: string; languageMode: 'ar' | 'bilingual' },
  index: number = 1
): Promise<{ narrative: string; dialogue: string }> => {
  let languageInstruction = "";
  if (context.languageMode === 'ar') {
    languageInstruction = `
      OUTPUT LANGUAGE: ARABIC ONLY.
      - The 'narrative' field must be purely Arabic.
      - The 'dialogue' field must be purely Arabic.
      - Do NOT include any English text.
      - Maintain RTL formatting structure.
    `;
  } else {
    languageInstruction = `
      OUTPUT LANGUAGE: BILINGUAL (ARABIC AND ENGLISH).
      - CRITICAL: You MUST provide the English translation for every Arabic section.
      - 'narrative' format: Write the Arabic paragraph first. Then add a new line. Then write the English translation.
      - 'dialogue' format: Write the Arabic line. Then immediately write the English translation below it.
      - Example Narrative: 
        "ذهب سعد إلى السوق لشراء التفاح.
        
        Saad went to the market to buy apples."
    `;
  }

  const prompt = `
    You are a bilingual story generator helper for a school application.
    Analyze the provided image for Scene ${index} of the story "${context.title}".
    
    CONTEXT:
    - This is scene number ${index}.
    - Characters: The main student "${context.studentName}", and friends "Saad" and "Reem".
    - Setting: Describe strictly what is visible in the image.

    CRITICAL INSTRUCTIONS:
    1. VISUAL RELEVANCE: The narrative MUST describe exactly what is in the image. If it's a market, talk about the market.
    2. CHARACTER CONSISTENCY: Always use names ${context.studentName}, Saad, and Reem where appropriate.
    3. LANGUAGE REQUIREMENT: 
       ${languageInstruction}
    4. LENGTH: Narrative max 150 words. Dialogue max 3 lines per person.
    5. FORMAT: Return JSON object with 'narrative' and 'dialogue'.
  `;

  try {
    const text = await callAIApi('generateSingleScene', { image, prompt });
    if (!text) throw new Error("Empty response from AI");
    return JSON.parse(text);
  } catch (error) {
    console.error(`Error analyzing image via backend:`, error);
    return {
      narrative: context.languageMode === 'ar' ? "تعذر تحليل الصورة." : "Could not analyze image.\n\nتعذر تحليل الصورة.",
      dialogue: ""
    };
  }
};

/**
 * Batch Analysis
 */
export const generateStoryFromImages = async (
  title: string,
  studentName: string,
  languageMode: 'ar' | 'bilingual',
  images: { data: string; mimeType: string }[]
): Promise<Scene[]> => {
  const scenePromises = images.map(async (image, index) => {
    const result = await generateSingleScene(image, { title, studentName, languageMode }, index + 1);
    return {
      id: `scene-${Date.now()}-${index}`,
      mediaUrls: [`data:${image.mimeType};base64,${image.data}`],
      mediaType: 'image' as const,
      narrative: result.narrative,
      dialogue: result.dialogue,
    };
  });
  return await Promise.all(scenePromises);
};

/**
 * Refine / Translate Text Helper
 */
export const refineText = async (
  text: string,
  field: 'narrative' | 'dialogue',
  languageMode: 'ar' | 'bilingual'
): Promise<string> => {
  if (!text.trim()) return "";

  const prompt = `
    You are a professional bilingual story editor for an educational app.
    Task: Refine and translate the following text.
    
    Field: ${field}
    Language Mode: ${languageMode}
    Input Text: "${text}"

    INSTRUCTIONS:
    1. If mode is 'ar' (Arabic Only):
       - Fix grammar and style in Arabic.
       - Remove any English text.
       - Return ONLY the Arabic text.
    2. If mode is 'bilingual' (Arabic & English):
       - If the text is only Arabic: Keep it (improve if needed) AND generate an English translation.
       - If the text is only English: Generate an Arabic translation AND keep the English (improve if needed).
       - If mixed: Ensure the Arabic comes first, followed by English. Match the meaning exactly.
       
    FORMATTING RULES:
    - For Narrative: 
      [Arabic Paragraph]
      
      [English Paragraph]
    - For Dialogue:
      Match line by line or block by block.
      [Arabic Line]
      [English Line]

    OUTPUT: Return ONLY the final text string. No markdown, no labels, no quotes around it.
  `;

  try {
    const refinedText = await callAIApi('refineText', { prompt });
    return refinedText?.trim() || text;
  } catch (error) {
    console.error("Translation error via backend:", error);
    return text; 
  }
};

/**
 * Translate Text for Export (Arabic -> English)
 */
export const translateText = async (text: string): Promise<string> => {
  if (!text.trim()) return "";

  const prompt = `
    Translate the following Arabic children's story text into simple, clear English. 
    Keep the meaning accurate but easy to read.
    Do not add explanations. Just return the English translation.
    
    Text to translate:
    "${text}"
  `;

  try {
    const translatedText = await callAIApi('translateText', { prompt });
    return translatedText?.trim() || "";
  } catch (error) {
    console.error("Export translation error via backend:", error);
    return "";
  }
};
