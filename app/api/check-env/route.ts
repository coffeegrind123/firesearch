import { NextResponse } from 'next/server';

export async function GET() {
  const environmentStatus = {
    FIRECRAWL_API_URL: !!process.env.FIRECRAWL_API_URL,
    // OPENAI_API_KEY and ANTHROPIC_API_KEY are optional when using custom endpoints
    OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
    ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
    SUPPORTS_CUSTOM_ENDPOINTS: true, // Indicates this version supports custom LLM endpoints
  };

  return NextResponse.json({ 
    environmentStatus,
    message: 'Firesearch supports custom LLM endpoints - API keys are optional'
  });
} 