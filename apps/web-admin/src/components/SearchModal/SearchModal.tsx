import { Bot, Lightbulb, Link, Search, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import {
  A4FRecommendation,
  a4fRecommendationService,
} from '../../services/geminiRecommendation.service';
import { a4fSearchService } from '../../services/geminiSearch.service';
import { googleSuggestService } from '../../services/googleSuggest.service';
import { SearchLoading } from '../ui/AppLoading';

// Hook để detect mobile
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  return isMobile;
};

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [show, setShow] = useState(isOpen);
  const [closing, setClosing] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<A4FRecommendation[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  // Mở / đóng modal
  useEffect(() => {
    if (isOpen) {
      setShow(true);
      setClosing(false);
      // Vô hiệu hóa scroll của body khi mở modal
      document.body.style.overflow = 'hidden';
    } else {
      setClosing(true);
      setTimeout(() => {
        setShow(false);
        // Khôi phục scroll của body khi đóng modal
        document.body.style.overflow = 'unset';
      }, 300);
    }
  }, [isOpen]);

  // Focus input khi mở modal
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Cleanup: Khôi phục scroll khi component unmount
  useEffect(() => {
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Xử lý ESC key để đóng modal
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen]);

  // Submit search → gọi A4F API
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setIsSearching(true);
      setIsLoadingResults(true);
      setSearchResults([]); // Clear previous results

      try {
        const resultText = await a4fSearchService.search(searchQuery);

        setSearchResults([
          {
            title: searchQuery,
            snippet: resultText,
            link: '#',
            displayLink: 'A4F AI',
          },
        ]);

        // lưu lịch sử + gọi recommendation
        const currentHistory = a4fRecommendationService.getHistory();
        const newHistory = [searchQuery, ...currentHistory];
        a4fRecommendationService.setHistory(newHistory);

        const recs = await a4fRecommendationService.getRecommendations();
        setRecommendations(recs);

        setShowSuggestions(false);
      } catch (error) {
        console.error('A4F search error:', error);
      } finally {
        setIsSearching(false);
        setIsLoadingResults(false);
      }
    }
  };

  // Click vào suggestion → search lại
  const handleSuggestionClick = async (suggestion: string) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
    setIsSearching(true);
    setIsLoadingResults(true);
    setSearchResults([]); // Clear previous results

    try {
      const resultText = await a4fSearchService.search(suggestion);

      setSearchResults([
        {
          title: suggestion,
          snippet: resultText,
          link: '#',
          displayLink: 'A4F AI',
        },
      ]);

      // lưu lịch sử + gọi recommendation
      const currentHistory = a4fRecommendationService.getHistory();
      const newHistory = [suggestion, ...currentHistory];
      a4fRecommendationService.setHistory(newHistory);

      const recs = await a4fRecommendationService.getRecommendations();
      setRecommendations(recs);
    } catch (error) {
      console.error('A4F search error:', error);
    } finally {
      setIsSearching(false);
      setIsLoadingResults(false);
    }
  };

  // Xử lý input change → gọi Suggest API
  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (value.length > 1) {
      try {
        const suggest = await googleSuggestService.getSuggestions(value);
        setSuggestions(suggest);
        setShowSuggestions(true);
      } catch (error) {
        console.error('Suggest error:', error);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Đóng modal
  const handleClose = () => {
    setClosing(true);
    // Khôi phục scroll ngay lập tức khi bắt đầu đóng
    document.body.style.overflow = 'unset';
    setTimeout(() => {
      setShow(false);
      onClose();
    }, 300);
  };

  if (!show) return null;

  return (
    <div
      className={`fixed inset-0 bg-gradient-to-br from-slate-900/98 via-black/95 to-orange-900/90 backdrop-blur-xl flex items-center justify-center z-[1000] p-2.5 transition-all duration-500 ${
        closing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
      }`}
      style={{
        backgroundImage:
          'radial-gradient(circle at 20% 80%, rgba(255, 107, 53, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 107, 53, 0.1) 0%, transparent 50%)',
      }}
    >
      <div className='w-full h-full flex items-center justify-center'>
        {/* Nút đóng */}
        <div
          className='fixed top-2 right-2 sm:top-6 sm:right-6 w-8 h-8 sm:w-12 sm:h-12 rounded-full border-2 border-white/30 bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-xl flex items-center justify-center text-white text-lg cursor-pointer transition-all duration-300 ease-in-out z-[1001] shadow-2xl hover:bg-gradient-to-br hover:from-red-500/30 hover:to-red-600/20 hover:border-red-400/50 hover:scale-110 hover:shadow-red-500/25'
          onClick={handleClose}
        >
          <X
            size={isMobile ? 14 : 20}
            className='transition-transform duration-200 hover:rotate-90'
          />
        </div>

        {/* Search box */}
        <div
          className={`relative w-full max-w-5xl px-2 sm:px-4 z-[1003] mt-12 sm:mt-20 animate-fade-in-up ${
            searchResults.length > 0 || recommendations.length > 0 || isLoadingResults
              ? 'max-h-[90vh] overflow-y-scroll'
              : ''
          }`}
        >
          <form
            className='mb-6 sm:mb-10 relative z-[1004] animate-scale-in'
            onSubmit={handleSubmit}
          >
            <div className='relative z-[1005]'>
              <input
                ref={inputRef}
                type='text'
                id='search-input'
                placeholder={
                  isSearching ? 'AI đang tìm kiếm...' : 'Tìm kiếm thông tin gym, fitness...'
                }
                value={searchQuery}
                onChange={handleInputChange}
                disabled={isSearching}
                className={`w-full ${isMobile ? 'h-14  pl-16 pr-20' : 'h-20 pl-24 pr-28'} ${
                  isSearching
                    ? 'border-2 border-orange-400 bg-gradient-to-r from-orange-500/20 to-orange-600/15'
                    : 'border-2 border-white/30 bg-gradient-to-r from-white/15 to-white/5'
                } ${
                  showSuggestions ? 'rounded-t-2xl sm:rounded-t-3xl' : 'rounded-2xl sm:rounded-3xl'
                } text-white backdrop-blur-xl outline-none transition-all duration-500 ease-in-out ${
                  isSearching ? 'opacity-90' : 'opacity-100'
                } ${showSuggestions ? 'shadow-2xl z-[1003]' : 'shadow-2xl'} placeholder-white/60 font-normal`}
                onFocus={() => setShowSuggestions(true)}
                style={{
                  boxShadow: showSuggestions
                    ? '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 107, 53, 0.2)'
                    : '0 25px 50px -12px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)',
                  fontSize: isMobile ? '14px' : '18 px',
                }}
              />

              {/* Search Icon */}
              <Search
                size={isMobile ? 18 : 24}
                className={`absolute ${isMobile ? 'left-4' : 'left-8'} top-1/2 -translate-y-1/2 transition-all duration-500 ease-in-out ${
                  isSearching ? 'text-orange-400' : 'text-white/70'
                }`}
              />

              {/* Submit Button */}
              <button
                type='submit'
                disabled={isSearching || !searchQuery.trim()}
                style={{
                  boxShadow: isSearching
                    ? '0 10px 25px -5px rgba(255, 107, 53, 0.2)'
                    : '0 20px 40px -10px rgba(255, 107, 53, 0.4)',
                  border: 'none',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  borderRadius: '50%',
                  width: isMobile ? '40px' : '45px',
                  height: isMobile ? '40px' : '45px',
                }}
                className={`absolute ${isMobile ? 'right-2' : 'right-5'} top-1/2 -translate-y-1/2 rounded-full border-none text-white flex items-center justify-center transition-all duration-500 ease-in-out ${
                  isMobile ? 'w-10 h-10' : 'w-14 h-14'
                } ${
                  isSearching
                    ? 'bg-gradient-to-br from-orange-500/40 to-orange-600/30 cursor-not-allowed opacity-70'
                    : 'bg-gradient-to-br from-orange-500 to-red-500 cursor-pointer opacity-100 hover:scale-110 hover:shadow-2xl hover:shadow-orange-500/25'
                } shadow-xl`}
              >
                <Search size={isMobile ? 18 : 20} />
              </button>
            </div>

            {/* Suggestions */}
            {showSuggestions && suggestions.length > 0 && (
              <div className='absolute top-full left-0 right-0 bg-gradient-to-b from-slate-900/98 to-black/95 backdrop-blur-xl rounded-b-2xl sm:rounded-b-3xl mt-0 py-3 sm:py-6 shadow-2xl border border-white/20 border-t-0 animate-slide-down z-[1006]'>
                {suggestions.slice(0, 3).map((s, index) => (
                  <div
                    key={index}
                    onClick={() => handleSuggestionClick(s)}
                    className={`${isMobile ? 'px-3 py-2 text-xs' : 'px-6 py-3 text-sm'} text-white cursor-pointer transition-all duration-300 ease-in-out flex items-center hover:bg-gradient-to-r hover:from-orange-500/20 hover:to-red-500/15 hover:pl-6 sm:hover:pl-8 hover:translate-x-1 group ${
                      index < suggestions.length - 1 ? 'border-b border-white/10' : ''
                    }`}
                  >
                    <Search
                      size={isMobile ? 12 : 14}
                      className={`${isMobile ? 'mr-2' : 'mr-3'} opacity-70 text-orange-400 transition-all duration-300 group-hover:scale-110 group-hover:text-orange-300`}
                    />
                    <span className='flex-1 font-normal transition-all duration-300 group-hover:text-orange-100'>
                      {s}
                    </span>
                    <i className='fa fa-arrow-up opacity-50 text-xs rotate-45 transition-all duration-300 group-hover:opacity-80 group-hover:translate-x-1'></i>
                  </div>
                ))}
              </div>
            )}
          </form>

          {/* Loading Results */}
          {isLoadingResults && (
            <div className='bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-6 sm:p-12 mt-4 sm:mt-8 shadow-2xl border border-white/30 text-center relative z-[1000] animate-fade-in-up'>
              <div className='relative'>
                <SearchLoading />
              </div>
            </div>
          )}

          {/* Search Results */}
          {searchResults.length > 0 && !isLoadingResults && (
            <div className='bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-8 mt-4 sm:mt-8 shadow-2xl border border-white/30 relative z-[1000] animate-fade-in-up'>
              <h3
                className={`text-white mb-4 sm:mb-6 ${isMobile ? 'text-xl' : 'text-3xl'} flex items-center font-bold`}
              >
                <Bot size={isMobile ? 20 : 28} className='mr-2 sm:mr-3 text-orange-400' />
                <span className='bg-gradient-to-r from-white to-orange-100 bg-clip-text text-transparent'>
                  Kết quả AI
                </span>
              </h3>
              {searchResults.map((result, index) => (
                <div
                  key={index}
                  className='bg-gradient-to-br from-white/10 to-white/5 rounded-2xl sm:rounded-3xl p-4 sm:p-6 mb-4 sm:mb-6 border border-white/20 transition-all duration-500 ease-in-out hover:bg-gradient-to-br hover:from-orange-500 hover:to-red-500 hover:-translate-y-1 hover:shadow-2xl group'
                  style={{
                    boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.3)',
                  }}
                >
                  <h4
                    className={`text-orange-400 mb-2 sm:mb-3 ${isMobile ? 'text-base' : 'text-xl'} font-semibold transition-colors duration-500 group-hover:text-white`}
                  >
                    {result.title}
                  </h4>
                  <div
                    className={`text-white/90 leading-relaxed ${isMobile ? 'text-sm' : 'text-lg'} max-h-48 sm:max-h-56 overflow-y-auto pr-2 sm:pr-3 transition-colors duration-500 group-hover:text-white/95`}
                  >
                    {result.snippet}
                  </div>
                  <div
                    className={`text-white/60 ${isMobile ? 'text-xs' : 'text-base'} mt-3 sm:mt-4 transition-colors duration-500 group-hover:text-white/90 flex items-center font-medium`}
                  >
                    <Link size={isMobile ? 12 : 14} className='mr-1 sm:mr-2' />
                    {result.displayLink}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Recommendations */}
          {recommendations.length > 0 && !isLoadingResults && (
            <div className='bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-8 mt-4 sm:mt-8 shadow-2xl border border-white/30 relative z-[1000] animate-fade-in-up'>
              <h3
                className={`text-white mb-4 sm:mb-6 ${isMobile ? 'text-xl' : 'text-3xl'} flex items-center font-bold`}
              >
                <Lightbulb size={isMobile ? 20 : 28} className='mr-2 sm:mr-3 text-orange-400' />
                <span className='bg-gradient-to-r from-white to-orange-100 bg-clip-text text-transparent'>
                  Gợi ý cho bạn
                </span>
              </h3>
              <div
                className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6'}`}
              >
                {recommendations.map((rec, index) => (
                  <div
                    key={index}
                    onClick={() => handleSuggestionClick(rec.query)}
                    className='bg-gradient-to-br from-white/10 to-white/5 rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-white/20 cursor-pointer transition-all duration-500 ease-in-out hover:bg-gradient-to-br hover:from-orange-500 hover:to-red-500 hover:-translate-y-1 sm:hover:-translate-y-2 hover:shadow-2xl group'
                    style={{
                      boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.3)',
                    }}
                  >
                    <h4
                      className={`text-white mb-2 sm:mb-3 ${isMobile ? 'text-sm' : 'text-lg'} font-semibold transition-colors duration-500 group-hover:text-white`}
                    >
                      {rec.title}
                    </h4>
                    <p
                      className={`text-white/70 ${isMobile ? 'text-xs' : 'text-base'} transition-colors duration-500 group-hover:text-white/90`}
                    >
                      {rec.query}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
