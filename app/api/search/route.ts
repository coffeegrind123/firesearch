import { NextRequest, NextResponse } from 'next/server';
import { LangGraphSearchEngine } from '../../../lib/langgraph-search-engine';
import { FirecrawlClient } from '../../../lib/firecrawl';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, options = {}, customEndpoint } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required and must be a string' },
        { status: 400 }
      );
    }

    console.log('[Firesearch API] Received search request:', {
      query,
      hasCustomEndpoint: !!customEndpoint,
      endpointUrl: customEndpoint?.url
    });

    // Initialize the Firecrawl client
    const firecrawlClient = new FirecrawlClient();
    
    // Initialize the search engine with custom endpoint if provided
    const searchEngine = new LangGraphSearchEngine(firecrawlClient, {
      enableCheckpointing: false,
      customEndpoint: customEndpoint
    });

    // Perform intelligent search
    const results = await searchEngine.intelligentSearch(
      query,
      (message) => {
        // Progress callback - in a real implementation you might want to use WebSockets
        console.log(`[Firesearch API] ${message}`);
      },
      options
    );

    return NextResponse.json({
      success: true,
      query,
      ...results
    });

  } catch (error: any) {
    console.error('[Firesearch API] Search error:', error);
    
    return NextResponse.json(
      { 
        error: error.message || 'Search failed',
        success: false 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Firesearch API - Use POST to /api/search with { query: "your search" }',
    version: '1.0.0'
  });
}