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
    if (!query || query.trim().length < 2) return [];

    // Sử dụng Vite proxy thay vì gọi trực tiếp
    const res = await fetch(
      `/api/suggest/complete/search?client=firefox&q=gym ${encodeURIComponent(query)}`
    );

    if (!res.ok) {
      throw new Error(`Suggest API error: ${res.status}`);
    }

    const data = await res.json();

    // data[1] là danh sách gợi ý
    const suggestions = (data[1] as string[]) || [];

    return suggestions.filter(suggestion => suggestion.toLowerCase().includes('gym')).slice(0, 8);
  }
}

export const googleSuggestService = GoogleSuggestService.getInstance();
