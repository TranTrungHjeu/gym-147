import React, { useEffect, useState } from 'react';
import { AIRecommendation, aiRecommendationService } from '../../services/aiRecommendation.service';
import { googleSearchService } from '../../services/googleSearch.service';

interface SearchSuggestionsProps {
  query: string;
  onSuggestionClick: (suggestion: string) => void;
  onRecommendationClick: (recommendation: AIRecommendation) => void;
}

export const SearchSuggestions: React.FC<SearchSuggestionsProps> = ({
  query,
  onSuggestionClick,
  onRecommendationClick,
}) => {
  const [trendingKeywords, setTrendingKeywords] = useState<string[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (query.trim()) {
      loadRecommendations(query);
    }
  }, [query]);

  const loadInitialData = async () => {
    try {
      const [trending, history] = await Promise.all([
        googleSearchService.getTrendingGymKeywords(),
        Promise.resolve(googleSearchService.getSearchHistory()),
      ]);

      setTrendingKeywords(trending);
      setSearchHistory(history);
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };

  const loadRecommendations = async (searchQuery: string) => {
    setLoading(true);
    try {
      const userProfile = await aiRecommendationService.analyzeUserInterests(searchHistory);
      const recs = await aiRecommendationService.getPersonalizedRecommendations(searchQuery);
      setRecommendations(recs);
    } catch (error) {
      console.error('Error loading recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons: { [key: string]: string } = {
      workout_plans: 'fa-dumbbell',
      nutrition: 'fa-apple-alt',
      equipment: 'fa-cogs',
      tips: 'fa-lightbulb',
      programs: 'fa-calendar-alt',
    };
    return icons[category] || 'fa-star';
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      workout_plans: '#ff6b6b',
      nutrition: '#4ecdc4',
      equipment: '#45b7d1',
      tips: '#f9ca24',
      programs: '#6c5ce7',
    };
    return colors[category] || '#74b9ff';
  };

  if (!query.trim() && trendingKeywords.length === 0 && searchHistory.length === 0) {
    return null;
  }

  return (
    <div className='search-suggestions'>
      {/* Trending Keywords */}
      {!query.trim() && trendingKeywords.length > 0 && (
        <div className='suggestion-section'>
          <h4 className='suggestion-title'>
            <i className='fa fa-fire'></i> Từ khóa phổ biến
          </h4>
          <div className='suggestion-tags'>
            {trendingKeywords.map((keyword, index) => (
              <span
                key={index}
                className='suggestion-tag trending'
                onClick={() => onSuggestionClick(keyword)}
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Search History */}
      {!query.trim() && searchHistory.length > 0 && (
        <div className='suggestion-section'>
          <h4 className='suggestion-title'>
            <i className='fa fa-history'></i> Lịch sử tìm kiếm
          </h4>
          <div className='suggestion-tags'>
            {searchHistory.map((item, index) => (
              <span
                key={index}
                className='suggestion-tag history'
                onClick={() => onSuggestionClick(item)}
              >
                <i className='fa fa-clock'></i> {item}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* AI Recommendations */}
      {query.trim() && (
        <div className='suggestion-section'>
          <h4 className='suggestion-title'>
            <i className='fa fa-robot'></i> Gợi ý cá nhân hóa
            {loading && <i className='fa fa-spinner fa-spin'></i>}
          </h4>
          {loading ? (
            <div className='loading-suggestions'>
              <i className='fa fa-spinner fa-spin'></i> Đang phân tích...
            </div>
          ) : (
            <div className='recommendation-list'>
              {recommendations.map((rec, index) => (
                <div
                  key={index}
                  className='recommendation-item'
                  onClick={() => onRecommendationClick(rec)}
                  style={{ borderLeftColor: getCategoryColor(rec.category) }}
                >
                  <div className='recommendation-icon'>
                    <i className={`fa ${getCategoryIcon(rec.category)}`}></i>
                  </div>
                  <div className='recommendation-content'>
                    <h5 className='recommendation-title'>{rec.title}</h5>
                    <p className='recommendation-description'>{rec.description}</p>
                    <div className='recommendation-meta'>
                      <span className='relevance-score'>
                        Độ liên quan: {Math.round(rec.relevanceScore * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <style>{`
        .search-suggestions {
          background: rgba(255, 255, 255, 0.95);
          border-radius: 20px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
          padding: 25px;
          margin-top: 20px;
          max-height: 500px;
          overflow-y: auto;
          backdropfilter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .suggestion-section {
          margin-bottom: 20px;
        }

        .suggestion-section:last-child {
          margin-bottom: 0;
        }

        .suggestion-title {
          font-size: 16px;
          font-weight: 700;
          color: #2c3e50;
          margin-bottom: 15px;
          display: flex;
          align-items: center;
          gap: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .suggestion-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .suggestion-tag {
          padding: 10px 18px;
          border-radius: 25px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 6px;
          text-transform: capitalize;
          letter-spacing: 0.3px;
        }

        .suggestion-tag.trending {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
        }

        .suggestion-tag.history {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          color: white;
          box-shadow: 0 4px 15px rgba(240, 147, 251, 0.3);
        }

        .suggestion-tag:hover {
          transform: translateY(-3px) scale(1.05);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
        }

        .recommendation-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .recommendation-item {
          display: flex;
          align-items: flex-start;
          gap: 15px;
          padding: 20px;
          border-radius: 15px;
          border-left: 5px solid #74b9ff;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .recommendation-item::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(
            135deg,
            rgba(116, 185, 255, 0.1) 0%,
            rgba(116, 185, 255, 0.05) 100%
          );
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .recommendation-item:hover {
          background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
          transform: translateX(8px) translateY(-2px);
          box-shadow: 0 10px 30px rgba(116, 185, 255, 0.3);
        }

        .recommendation-item:hover::before {
          opacity: 1;
        }

        .recommendation-icon {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 16px;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
          flex-shrink: 0;
        }

        .recommendation-content {
          flex: 1;
        }

        .recommendation-title {
          font-size: 16px;
          font-weight: 700;
          color: #2c3e50;
          margin: 0 0 8px 0;
          line-height: 1.3;
        }

        .recommendation-description {
          font-size: 14px;
          color: #5a6c7d;
          margin: 0 0 12px 0;
          line-height: 1.5;
        }

        .recommendation-meta {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .relevance-score {
          font-size: 11px;
          color: #28a745;
          font-weight: 500;
        }

        .loading-suggestions {
          text-align: center;
          padding: 20px;
          color: #666;
        }
      `}</style>
    </div>
  );
};
