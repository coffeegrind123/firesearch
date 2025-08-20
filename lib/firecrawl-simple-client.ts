/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Custom Firecrawl client that adapts to our firecrawl-simple API
 * instead of the official Firecrawl cloud service
 */
export class FirecrawlSimpleClient {
  private baseUrl: string;

  constructor(options: { apiUrl?: string } = {}) {
    this.baseUrl = options.apiUrl || process.env.FIRECRAWL_API_URL || 'http://localhost:3002';
  }

  async scrapeUrl(url: string, options?: any, timeoutMs: number = 15000) {
    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Scraping timeout')), timeoutMs);
      });

      const scrapePromise = fetch(`${this.baseUrl}/v1/scrape`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          formats: options?.formats || ['markdown'],
          ...options
        })
      });

      const response = await Promise.race([scrapePromise, timeoutPromise]) as Response;
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Scrape failed');
      }

      return {
        markdown: result.data?.markdown || '',
        html: result.data?.rawHtml || '',
        metadata: result.data?.metadata || {},
        success: true,
      };
    } catch (error: any) {
      if (error?.message === 'Scraping timeout') {
        return {
          markdown: '',
          html: '',
          metadata: {
            error: 'Scraping took too long and was stopped',
            timeout: true,
          },
          success: false,
          error: 'timeout',
        };
      }

      if (error?.status === 403 || error?.message?.includes('403')) {
        return {
          markdown: '',
          html: '',
          metadata: {
            error: 'This website is not supported by Firecrawl',
            statusCode: 403,
          },
          success: false,
          error: 'unsupported',
        };
      }

      return {
        markdown: '',
        html: '',
        metadata: {
          error: error?.message || 'Failed to scrape URL',
          statusCode: error?.status,
        },
        success: false,
        error: 'failed',
      };
    }
  }

  async search(query: string, options?: { limit?: number; scrapeOptions?: any }) {
    try {
      // Convert Firesearch parameters to firecrawl-simple format
      const searchParams: any = {
        query,
        maxResults: options?.limit || 10, // Convert limit -> maxResults
      };

      // Add scrapeOptions to get content with search results
      if (options?.scrapeOptions !== false) {
        searchParams.scrapeOptions = {
          formats: ['markdown'],
          ...options?.scrapeOptions
        };
      }

      const response = await fetch(`${this.baseUrl}/v1/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchParams)
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Search failed');
      }

      // Transform firecrawl-simple response to match Firesearch expectations
      const transformedData = (result.results || []).map((item: any) => {
        // Try to extract favicon from URL
        let favicon = null;
        if (item.href) {
          try {
            const domain = new URL(item.href).hostname;
            favicon = `https://${domain}/favicon.ico`;
          } catch {
            // Ignore invalid URLs
          }
        }

        return {
          url: item.href, // Convert href -> url
          title: item.title || 'Untitled',
          description: item.snippet || item.body || '',
          markdown: item.content?.markdown || '', // Extract from content object
          html: item.content?.rawHtml || '',
          links: [],
          screenshot: item.content?.screenshot || null,
          metadata: {
            title: item.title,
            description: item.snippet || item.body,
            favicon: favicon,
            screenshot: item.content?.screenshot
          },
          scraped: !!item.content, // Mark as scraped if content exists
          content: item.content?.markdown || '', // For compatibility
          favicon: favicon
        };
      });

      return {
        success: true,
        data: transformedData, // Return as 'data' array (what Firesearch expects)
        results: transformedData, // Also include as 'results' for backward compatibility
        metadata: {
          query,
          total: transformedData.length,
          page: 1
        },
      };
    } catch (error) {
      throw error;
    }
  }

  async mapUrl(url: string, options?: { search?: string; limit?: number }) {
    // Note: Our firecrawl-simple doesn't have a map endpoint, so we'll simulate it
    // by scraping the URL and extracting links
    try {
      const scrapeResult = await this.scrapeUrl(url, { formats: ['markdown'] });
      
      if (!scrapeResult.success) {
        throw new Error('Failed to map URL');
      }

      // Extract links from markdown content (simple regex approach)
      const markdown = scrapeResult.markdown || '';
      const linkRegex = /\[([^\]]*)\]\(([^)]+)\)/g;
      const links: string[] = [];
      let match;

      while ((match = linkRegex.exec(markdown)) !== null) {
        const linkUrl = match[2];
        if (linkUrl.startsWith('http')) {
          links.push(linkUrl);
        }
      }

      // Filter by search term if provided
      let filteredLinks = links;
      if (options?.search) {
        const searchTerm = options.search.toLowerCase();
        filteredLinks = links.filter(link => 
          link.toLowerCase().includes(searchTerm)
        );
      }

      // Limit results
      const limitedLinks = filteredLinks.slice(0, options?.limit || 10);

      return {
        links: limitedLinks,
        metadata: {
          total: limitedLinks.length,
          sourceUrl: url
        },
      };
    } catch (error) {
      throw error;
    }
  }
}