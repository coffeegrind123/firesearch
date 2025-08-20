import { NextRequest, NextResponse } from 'next/server';
import { LangGraphSearchEngine, Source } from '../../../lib/langgraph-search-engine';
import { FirecrawlClient } from '../../../lib/firecrawl';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, customEndpoint } = body;

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

    // Collect results from the event-based search
    const results = {
      sources: [] as Source[],
      subQueries: [] as string[],
      totalSources: 0,
      finalAnswer: '',
      followUpQuestions: [] as string[]
    };

    // Perform search with event collection
    await searchEngine.search(
      query,
      (event) => {
        console.log(`[Firesearch API] Event:`, event.type);
        
        // Collect results from events
        if (event.type === 'found') {
          results.sources.push(...event.sources);
          results.totalSources = event.sources.length;
        }
        if (event.type === 'final-result') {
          results.finalAnswer = event.content;
          results.sources = event.sources;
          results.followUpQuestions = event.followUpQuestions || [];
          results.totalSources = event.sources.length;
        }
      }
    );

    return NextResponse.json({
      success: true,
      query,
      ...results
    });

  } catch (error: unknown) {
    console.error('[Firesearch API] Search error:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Search failed',
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