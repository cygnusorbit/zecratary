import { NextResponse } from 'next/server';
import { AIDispatcher } from '@zecratary/ai-engine';

export async function POST(req: Request) {
  try {
    const { action, prompt, engineConfig } = await req.json();

    const dispatcher = new AIDispatcher({
      provider: engineConfig?.provider || (process.env.DEFAULT_AI_PROVIDER as any) || 'gemini',
      geminiApiKey: engineConfig?.geminiKey || process.env.GEMINI_API_KEY,
      geminiModel: engineConfig?.geminiModel || process.env.GEMINI_MODEL || "gemini-1.5-flash",
      openaiApiKey: engineConfig?.openaiKey || process.env.OPENAI_API_KEY,
      openaiModel: engineConfig?.openaiModel || process.env.OPENAI_MODEL || 'gpt-4o',
    });

    if (action === 'generate_recipe') {
      const recipe = await dispatcher.generateRecipe(prompt);
      return NextResponse.json({ success: true, recipe });
    }

    return NextResponse.json({ error: 'Invalid action specified' }, { status: 400 });
  } catch (err: any) {
    console.error('API AI Route Error:', err);
    return NextResponse.json({ error: err.message || 'AI request failed' }, { status: 500 });
  }
}