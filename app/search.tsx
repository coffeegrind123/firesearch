'use server';

import { createStreamableValue } from 'ai/rsc';
import { FirecrawlClient } from '@/lib/firecrawl';
import { LangGraphSearchEngine as SearchEngine, SearchEvent } from '@/lib/langgraph-search-engine';

export async function search(query: string, context?: { query: string; response: string }[], customEndpoint?: { url: string; apiKey: string; model: string }) {
  const stream = createStreamableValue<SearchEvent>();
  
  // Create FirecrawlClient (no API key needed for firecrawl-simple)
  const firecrawl = new FirecrawlClient();
  
  // Auto-detect first available model if no custom endpoint provided
  const defaultEndpoint = {
    url: 'http://host.docker.internal:8081/v1',
    apiKey: '',
    model: 'qwen3-coder-plus' // Fallback model
  };
  
  // eslint-disable-next-line prefer-const
  let endpoint = customEndpoint ? { ...customEndpoint } : { ...defaultEndpoint };
  
  // If no custom endpoint provided, try to fetch first available model
  if (!customEndpoint) {
    try {
      const modelsUrl = endpoint.url.replace(/\/v1\/?$/, '') + '/v1/models';
      const response = await fetch(modelsUrl, {
        headers: {
          'Authorization': `Bearer ${endpoint.apiKey || 'test'}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const models = data.data?.map((model: { id: string }) => model.id) || [];
        if (models.length > 0) {
          console.log('[firesearch] Auto-detected first available model:', models[0]);
          endpoint.model = models[0];
        }
      } else {
        console.warn('[firesearch] Could not fetch models, using fallback model');
      }
    } catch (error) {
      console.warn('[firesearch] Error fetching models, using fallback model:', error);
    }
  }
  
  const searchEngine = new SearchEngine(firecrawl, {
    enableCheckpointing: false,
    customEndpoint: endpoint
  });

  // Run search in background
  (async () => {
    try {
      // Stream events as they happen
      await searchEngine.search(query, (event) => {
        stream.update(event);
      }, context);
      
      stream.done();
    } catch (error) {
      stream.error(error);
    }
  })();

  return { stream: stream.value };
}