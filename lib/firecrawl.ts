/* eslint-disable @typescript-eslint/no-explicit-any */
import { FirecrawlSimpleClient } from './firecrawl-simple-client';

export class FirecrawlClient {
  private client: FirecrawlSimpleClient;

  constructor(providedApiUrl?: string) {
    const apiUrl = providedApiUrl || process.env.FIRECRAWL_API_URL;
    this.client = new FirecrawlSimpleClient({ apiUrl });
  }

  async scrapeUrl(url: string, timeoutMs: number = 15000) {
    try {
      // Use our custom client which already handles timeouts
      const result = await this.client.scrapeUrl(url, {
        formats: ['markdown', 'html'],
      }, timeoutMs);
      
      // Our custom client already handles all error cases and formatting
      return result;
    } catch (error: any) {
      // Just re-throw since our custom client handles all error formatting
      throw error;
    }
  }

  async mapUrl(url: string, options?: { search?: string; limit?: number }) {
    try {
      // Use our custom client which simulates mapUrl functionality
      return await this.client.mapUrl(url, options);
    } catch (error) {
      throw error;
    }
  }

  async search(query: string, options?: { limit?: number; scrapeOptions?: any }) {
    try {
      // Use our custom client which handles the API conversion
      const result = await this.client.search(query, options);
      
      // Our custom client already returns the data in the correct format
      return result;
    } catch (error) {
      throw error;
    }
  }
}