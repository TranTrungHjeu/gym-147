// a4fSearch.service.ts
const A4F_API_KEY = import.meta.env.VITE_A4F_API_KEY || 'ddc-a4f-87933f2111994f48a5ed59ef87d14481';
const A4F_URL = 'https://api.a4f.co/v1/chat/completions';

class A4FSearchService {
  private static instance: A4FSearchService;

  static getInstance(): A4FSearchService {
    if (!A4FSearchService.instance) {
      A4FSearchService.instance = new A4FSearchService();
    }
    return A4FSearchService.instance;
  }

  async search(query: string): Promise<string> {
    try {
      // Kiểm tra API key
      if (!A4F_API_KEY) {
        console.warn('A4F API key not configured, using fallback response');
        return this.getFallbackResponse(query);
      }

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
        const errorData = await res.json();
        console.error('A4F API Error Details:', errorData);
        throw new Error(
          `A4F API error: ${res.status} - ${errorData.error?.message || 'Unknown error'}`
        );
      }

      const data = await res.json();
      return data.choices?.[0]?.message?.content || 'Không có kết quả từ A4F API.';
    } catch (error) {
      console.error('A4F Search Error:', error);
      return this.getFallbackResponse(query);
    }
  }

  private getFallbackResponse(query: string): string {
    const fallbackResponses = [
      `Tìm kiếm "${query}" liên quan đến gym và fitness. Hãy thử các từ khóa như: workout plans, gym equipment, personal training, nutrition advice.`,
      `Để có kết quả tìm kiếm tốt hơn về "${query}", hãy thử: gym exercises, fitness tips, workout routines, health advice.`,
      `Tìm kiếm "${query}" trong lĩnh vực gym. Gợi ý: strength training, cardio workouts, gym membership, fitness classes.`,
    ];

    return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
  }
}

// 👉 Export instance để dùng ở ngoài
export const a4fSearchService = A4FSearchService.getInstance();
