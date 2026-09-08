import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

export interface AIServiceConfig {
  provider: 'gemini' | 'openai';
  geminiApiKey?: string;
  geminiModel?: string;
  openaiApiKey?: string;
  openaiModel?: string;
}

export class AIDispatcher {
  private config: AIServiceConfig;

  constructor(config?: Partial<AIServiceConfig>) {
    this.config = {
      provider: config?.provider || (process.env.DEFAULT_AI_PROVIDER as any) || 'gemini',
      geminiApiKey: config?.geminiApiKey || process.env.GEMINI_API_KEY,
      geminiModel: config?.geminiModel || process.env.GEMINI_MODEL || "gemini-1.5-flash",
      openaiApiKey: config?.openaiApiKey || process.env.OPENAI_API_KEY,
      openaiModel: config?.openaiModel || process.env.OPENAI_MODEL || 'gpt-4o',
    };
  }

  async executeJson(prompt: string, systemInstruction: string): Promise<any> {
    if (this.config.provider === 'gemini') {
      const genAI = new GoogleGenerativeAI(this.config.geminiApiKey!);
      const model = genAI.getGenerativeModel({
        model: this.config.geminiModel!,
        systemInstruction,
        generationConfig: { responseMimeType: 'application/json' },
      });
      const res = await model.generateContent(prompt);
      return JSON.parse(res.response.text());
    } else {
      const openai = new OpenAI({ apiKey: this.config.openaiApiKey! });
      const res = await openai.chat.completions.create({
        model: this.config.openaiModel!,
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
      });
      return JSON.parse(res.choices[0].message.content || '{}');
    }
  }

  async generateRecipe(prompt: string, dietaryProfile?: string): Promise<any> {
    const sysPrompt = `You are Chef Zecratary. Output strictly valid JSON conforming to:
    {
      "title": string,
      "description": string,
      "servings": number,
      "prepTimeMinutes": number,
      "cookTimeMinutes": number,
      "calories": number,
      "proteinGrams": number,
      "carbsGrams": number,
      "fatGrams": number,
      "fiberGrams": number,
      "tags": string[],
      "ingredients": [{"item": string, "quantity": string, "category": string}],
      "instructions": string[]
    }`;
    const userPrompt = `${prompt}\nDietary Restrictions/Allergies: ${dietaryProfile || 'None'}`;
    return this.executeJson(userPrompt, sysPrompt);
  }
}
