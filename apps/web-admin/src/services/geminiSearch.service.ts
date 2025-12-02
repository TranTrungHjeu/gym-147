// a4fSearch.service.ts
const A4F_API_KEY = import.meta.env.VITE_A4F_API_KEY;
const A4F_URL = import.meta.env.VITE_A4F_URL;

if (!A4F_API_KEY) {
  throw new Error('VITE_A4F_API_KEY is required. Please set it in your .env file.');
}

if (!A4F_URL) {
  throw new Error('VITE_A4F_URL is required. Please set it in your .env file.');
}

class A4FSearchService {
  private static instance: A4FSearchService;

  static getInstance(): A4FSearchService {
    if (!A4FSearchService.instance) {
      A4FSearchService.instance = new A4FSearchService();
    }
    return A4FSearchService.instance;
  }

  async search(query: string): Promise<string> {
    const res = await fetch(A4F_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${A4F_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'provider-3/gpt-4.1-nano',
        messages: [
          {
            role: 'user',
            content: `Tìm kiếm thông tin về: ${query} trong lĩnh vực gym và fitness. Hãy đưa ra lời khuyên hữu ích và chi tiết.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      console.error('A4F API Error Details:', errorData);
      throw new Error(
        `A4F API error: ${res.status} - ${errorData.error?.message || 'Unknown error'}`
      );
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('A4F API returned empty response');
    }
    
    return content;
  }
}

// Export instance để dùng ở ngoài
export const a4fSearchService = A4FSearchService.getInstance();
