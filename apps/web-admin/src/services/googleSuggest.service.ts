// googleSuggest.service.ts
export class GoogleSuggestService {
  private static instance: GoogleSuggestService;

  static getInstance(): GoogleSuggestService {
    if (!GoogleSuggestService.instance) {
      GoogleSuggestService.instance = new GoogleSuggestService();
    }
    return GoogleSuggestService.instance;
  }

  async getSuggestions(query: string): Promise<string[]> {
    try {
      if (!query || query.trim().length < 2) return [];

      // Sử dụng Vite proxy thay vì gọi trực tiếp
      const res = await fetch(
        `/api/suggest/complete/search?client=firefox&q=gym ${encodeURIComponent(query)}`
      );

      if (!res.ok) throw new Error(`Suggest API error: ${res.status}`);
      const data = await res.json();

      // data[1] là danh sách gợi ý
      const suggestions = (data[1] as string[]) || [];

      return suggestions.filter(suggestion => suggestion.toLowerCase().includes('gym')).slice(0, 8);
    } catch (error) {
      console.error('Google Suggest API Error:', error);
      return this.getFallbackSuggestions(query);
    }
  }

  private getFallbackSuggestions(query: string): string[] {
    const fallbackSuggestions = [
      'gym workout plans',
      'gym equipment',
      'gym membership',
      'gym trainer',
      'gym nutrition',
      'gym exercises',
      'gym safety',
      'gym motivation',
      'gym tips',
      'gym programs',
      'gym classes',
      'gym schedule',
      'gym pricing',
      'gym location',
      'gym reviews',
      'gym benefits',
      'gym beginners',
      'gym advanced',
      'gym cardio',
      'gym strength',
      'gym yoga',
      'gym pilates',
      'gym crossfit',
      'gym boxing',
      'gym swimming',
      'gym running',
      'gym cycling',
      'gym dancing',
      'gym martial arts',
      'gym aerobics',
    ];

    return fallbackSuggestions
      .filter(suggestion => suggestion.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 8);
  }
}

export const googleSuggestService = GoogleSuggestService.getInstance();
