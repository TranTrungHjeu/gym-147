// a4fRecommendation.service.ts
const A4F_API_KEY = import.meta.env.VITE_A4F_API_KEY;
const A4F_URL = import.meta.env.VITE_A4F_URL;

if (!A4F_API_KEY) {
  throw new Error('VITE_A4F_API_KEY is required. Please set it in your .env file.');
}

if (!A4F_URL) {
  throw new Error('VITE_A4F_URL is required. Please set it in your .env file.');
}

export interface A4FRecommendation {
  title: string;
  query: string;
}

export class A4FRecommendationService {
  private static instance: A4FRecommendationService;
  private history: string[] = [];

  static getInstance(): A4FRecommendationService {
    if (!A4FRecommendationService.instance) {
      A4FRecommendationService.instance = new A4FRecommendationService();
    }
    return A4FRecommendationService.instance;
  }

  setHistory(history: string[]) {
    this.history = history;
    localStorage.setItem('searchHistory', JSON.stringify(history));
  }

  getHistory(): string[] {
    const stored = localStorage.getItem('searchHistory');
    return stored ? JSON.parse(stored) : this.history;
  }

  async getRecommendations(): Promise<A4FRecommendation[]> {
    const history = this.getHistory();
    if (history.length === 0) return [];

    const prompt = `
      Người dùng đã tìm các chủ đề: ${history.join(', ')}.
      Hãy đề xuất 5 gợi ý tìm kiếm tiếp theo liên quan đến gym, tập luyện, cải thiện sức khỏe.
      Trả về JSON array với format:
      [
        {"title": "Gợi ý hiển thị", "query": "Truy vấn để gửi A4F"}
      ]
    `;

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
            content: prompt,
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
    const text = data.choices?.[0]?.message?.content || '[]';
    return JSON.parse(text);
  }
}

export const a4fRecommendationService = A4FRecommendationService.getInstance();
