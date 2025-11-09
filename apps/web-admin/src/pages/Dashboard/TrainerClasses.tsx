import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import CustomSelect from '../../components/common/CustomSelect';
import Button from '../../components/ui/Button/Button';
import { GymClass, scheduleService } from '../../services/schedule.service';
import { socketService } from '../../services/socket.service';

// Icons for better information display
const ClockIcon = () => (
  <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
    <path
      strokeLinecap='round'
      strokeLinejoin='round'
      strokeWidth={2}
      d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
    />
  </svg>
);

const UsersIcon = () => (
  <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
    <path
      strokeLinecap='round'
      strokeLinejoin='round'
      strokeWidth={2}
      d='M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z'
    />
  </svg>
);

const StarIcon = () => (
  <svg className='w-4 h-4' fill='currentColor' viewBox='0 0 24 24'>
    <path d='M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' />
  </svg>
);

const CurrencyIcon = () => (
  <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
    <path
      strokeLinecap='round'
      strokeLinejoin='round'
      strokeWidth={2}
      d='M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1'
    />
  </svg>
);

const TrendingUpIcon = () => (
  <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
    <path
      strokeLinecap='round'
      strokeLinejoin='round'
      strokeWidth={2}
      d='M13 7h8m0 0v8m0-8l-8 8-4-4-6 6'
    />
  </svg>
);

export default function TrainerClasses() {
  const [classes, setClasses] = useState<GymClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const response = await scheduleService.getTrainerClasses();

      if (response.success && response.data) {
        // response.data should be { classes: GymClass[] }
        const classesData = response.data as { classes: GymClass[] };
        
        if (classesData && Array.isArray(classesData.classes)) {
          setClasses(classesData.classes);
        } else if (Array.isArray(response.data)) {
          // Fallback: if response.data is directly an array
          setClasses(response.data as unknown as GymClass[]);
        } else {
          console.warn('Unexpected response structure:', response.data);
          setClasses([]);
        }
      } else {
        throw new Error(response.message || 'Lỗi tải danh sách lớp học');
      }
    } catch (error: any) {
      console.error('Error fetching classes:', error);
      setClasses([]);
      if (window.showToast) {
        window.showToast({
          type: 'error',
          message: error?.message || 'Lỗi tải danh sách lớp học',
          duration: 3000,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredClasses = classes.filter(cls => {
    if (!cls) return false;
    const matchesSearch =
      (cls.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (cls.description?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesCategory = !categoryFilter || cls.category === categoryFilter;
    const matchesDifficulty = !difficultyFilter || cls.difficulty === difficultyFilter;
    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  // Sort classes
  const sortedClasses = [...filteredClasses].sort((a, b) => {
    if (!a || !b) return 0;
    switch (sortBy) {
      case 'name':
        return (a.name || '').localeCompare(b.name || '');
      case 'price':
        return (a.price || 0) - (b.price || 0);
      case 'difficulty':
        const difficultyOrder: { [key: string]: number } = {
          BEGINNER: 1,
          INTERMEDIATE: 2,
          ADVANCED: 3,
          ALL_LEVELS: 0,
        };
        return (difficultyOrder[a.difficulty] || 0) - (difficultyOrder[b.difficulty] || 0);
      case 'rating':
        return (b.rating_average || 0) - (a.rating_average || 0);
      default:
        return 0;
    }
  });

  const clearFilters = () => {
    setSearchTerm('');
    setCategoryFilter('');
    setDifficultyFilter('');
    setSortBy('name');
  };

  const getCategoryLabel = (category?: string) => {
    if (!category) return 'Chưa phân loại';
    const categories: { [key: string]: string } = {
      CARDIO: 'Cardio',
      STRENGTH: 'Sức mạnh',
      YOGA: 'Yoga',
      PILATES: 'Pilates',
      DANCE: 'Khiêu vũ',
      MARTIAL_ARTS: 'Võ thuật',
      AQUA: 'Bơi lội',
      FUNCTIONAL: 'Chức năng',
      RECOVERY: 'Phục hồi',
      SPECIALIZED: 'Chuyên biệt',
    };
    return categories[category] || category;
  };

  const getDifficultyLabel = (difficulty?: string) => {
    if (!difficulty) return 'Chưa xác định';
    const difficulties: { [key: string]: string } = {
      BEGINNER: 'Người mới bắt đầu',
      INTERMEDIATE: 'Trung bình',
      ADVANCED: 'Nâng cao',
      ALL_LEVELS: 'Tất cả cấp độ',
    };
    return difficulties[difficulty] || difficulty;
  };

  const getDifficultyColor = (difficulty?: string) => {
    if (!difficulty) return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    const colors: { [key: string]: string } = {
      BEGINNER: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      INTERMEDIATE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      ADVANCED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      ALL_LEVELS: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    };
    return colors[difficulty] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  };

  const getCategoryColor = (category?: string) => {
    if (!category) return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    const colors: { [key: string]: string } = {
      CARDIO: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      STRENGTH: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      YOGA: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      PILATES: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
      DANCE: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
      MARTIAL_ARTS: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      AQUA: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
      FUNCTIONAL: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
      RECOVERY: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
      SPECIALIZED: 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200',
    };
    return colors[category] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  };

  // Function to get class background image based on category
  const getClassBackgroundImage = (category?: string) => {
    if (!category) return '/images/gymclass/functional.jpg';
    const imageMap: { [key: string]: string } = {
      CARDIO: '/images/gymclass/cadio.webp',
      STRENGTH: '/images/gymclass/strength.jpg',
      YOGA: '/images/gymclass/yoga.jpg',
      PILATES: '/images/gymclass/pilates.webp',
      DANCE: '/images/gymclass/dance.jpg',
      MARTIAL_ARTS: '/images/gymclass/martial_arts.jpg',
      AQUA: '/images/gymclass/aqua.jpg',
      FUNCTIONAL: '/images/gymclass/functional.jpg',
      RECOVERY: '/images/gymclass/recovery.jpg',
      SPECIALIZED: '/images/gymclass/specialized.jpg',
    };
    const imageUrl = imageMap[category] || '/images/gymclass/functional.jpg';
    return imageUrl;
  };

  // Function to get level image
  const getLevelImage = (difficulty?: string) => {
    if (!difficulty) return '/images/level/ALL_LEVELS.png';
    const levelMap: { [key: string]: string } = {
      BEGINNER: '/images/level/BEGINNER.png',
      INTERMEDIATE: '/images/level/INTERMEDIATE.png',
      ADVANCED: '/images/level/ADVANCED.png',
      ALL_LEVELS: '/images/level/ALL_LEVELS.png',
    };
    return levelMap[difficulty] || '/images/level/ALL_LEVELS.png';
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<StarIcon key={i} />);
    }

    if (hasHalfStar) {
      stars.push(
        <div key='half' className='relative'>
          <StarIcon />
          <div className='absolute inset-0 overflow-hidden w-1/2'>
            <StarIcon />
          </div>
        </div>
      );
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <svg
          key={`empty-${i}`}
          className='w-4 h-4 text-gray-300'
          fill='currentColor'
          viewBox='0 0 24 24'
        >
          <path d='M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' />
        </svg>
      );
    }

    return stars;
  };

  // Skeleton loading component
  const SkeletonCard = () => (
    <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden animate-pulse'>
      <div className='h-48 bg-gray-200 dark:bg-gray-700'></div>
      <div className='p-4'>
        <div className='h-5 bg-gray-200 dark:bg-gray-700 rounded mb-2'></div>
        <div className='h-3 bg-gray-200 dark:bg-gray-700 rounded mb-2'></div>
        <div className='h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3'></div>
        <div className='space-y-2 mb-3'>
          <div className='h-3 bg-gray-200 dark:bg-gray-700 rounded'></div>
          <div className='h-3 bg-gray-200 dark:bg-gray-700 rounded'></div>
          <div className='h-3 bg-gray-200 dark:bg-gray-700 rounded'></div>
        </div>
        <div className='h-8 bg-gray-200 dark:bg-gray-700 rounded'></div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className='p-6 space-y-6'>
        {/* Header Skeleton */}
        <div className='p-6 pb-0'>
          <div className='h-7 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-2 animate-pulse'></div>
          <div className='h-4 bg-gray-200 dark:bg-gray-700 rounded w-64 animate-pulse'></div>
        </div>

        {/* Filter Skeleton */}
        <div className='px-6'>
          <div className='bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm p-3 animate-pulse'>
            <div className='grid grid-cols-1 md:grid-cols-4 gap-3'>
              <div className='md:col-span-2 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg'></div>
              <div className='h-10 bg-gray-200 dark:bg-gray-700 rounded-lg'></div>
              <div className='h-10 bg-gray-200 dark:bg-gray-700 rounded-lg'></div>
            </div>
          </div>
        </div>

        {/* Cards Skeleton */}
        <div className='px-6 pb-6'>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
            {Array.from({ length: 6 }).map((_, index) => (
              <SkeletonCard key={index} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className='p-6 pb-0'>
        <div className='flex justify-between items-start'>
          <div>
            <h1 className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-tight'>
              Quản lý lớp học
            </h1>
            <p className='text-theme-xs text-gray-600 dark:text-gray-400 font-inter leading-tight mt-0.5'>
              Xem và quản lý các lớp học bạn đang dạy
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className='px-6'>
        <div className='bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm p-3'>
          <div className='grid grid-cols-1 md:grid-cols-4 gap-3 mb-3'>
            {/* Search Input */}
            <div className='md:col-span-2 group relative'>
              <Search className='absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500 group-focus-within:text-orange-500 transition-colors duration-200' />
              <input
                type='text'
                placeholder='Tìm kiếm lớp học...'
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className='w-full py-2 pl-9 pr-3 text-[11px] border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200 font-inter shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'
              />
            </div>

            {/* Category Filter */}
            <div>
              <CustomSelect
                options={[
                  { value: '', label: 'Tất cả danh mục' },
                  { value: 'CARDIO', label: 'Cardio' },
                  { value: 'STRENGTH', label: 'Sức mạnh' },
                  { value: 'YOGA', label: 'Yoga' },
                  { value: 'PILATES', label: 'Pilates' },
                  { value: 'DANCE', label: 'Khiêu vũ' },
                  { value: 'MARTIAL_ARTS', label: 'Võ thuật' },
                  { value: 'AQUA', label: 'Bơi lội' },
                  { value: 'FUNCTIONAL', label: 'Chức năng' },
                  { value: 'RECOVERY', label: 'Phục hồi' },
                  { value: 'SPECIALIZED', label: 'Chuyên biệt' },
                ]}
                value={categoryFilter}
                onChange={setCategoryFilter}
                placeholder='Tất cả danh mục'
                className='font-inter'
              />
            </div>

            {/* Difficulty Filter */}
            <div>
              <CustomSelect
                options={[
                  { value: '', label: 'Tất cả độ khó' },
                  { value: 'BEGINNER', label: 'Người mới bắt đầu' },
                  { value: 'INTERMEDIATE', label: 'Trung bình' },
                  { value: 'ADVANCED', label: 'Nâng cao' },
                  { value: 'ALL_LEVELS', label: 'Tất cả cấp độ' },
                ]}
                value={difficultyFilter}
                onChange={setDifficultyFilter}
                placeholder='Tất cả độ khó'
                className='font-inter'
              />
            </div>
          </div>

          {/* Results count and actions */}
          <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-3 border-t border-gray-200 dark:border-gray-700'>
            <div className='flex items-center gap-4 flex-wrap'>
              <span className='text-[11px] font-inter text-gray-600 dark:text-gray-400'>
                Hiển thị {sortedClasses.length}/{classes.length} lớp học
              </span>
              {(searchTerm || categoryFilter || difficultyFilter) && (
                <button
                  onClick={clearFilters}
                  className='text-[11px] font-inter text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 transition-colors duration-200'
                >
                  Xóa bộ lọc
                </button>
              )}
            </div>

            {/* View mode toggle and sort */}
            <div className='flex items-center gap-3'>
              <div className='w-32'>
                <CustomSelect
                  options={[
                    { value: 'name', label: 'Sắp xếp theo tên' },
                    { value: 'price', label: 'Sắp xếp theo giá' },
                    { value: 'difficulty', label: 'Sắp xếp theo độ khó' },
                    { value: 'rating', label: 'Sắp xếp theo đánh giá' },
                  ]}
                  value={sortBy}
                  onChange={setSortBy}
                  placeholder='Sắp xếp'
                  className='font-inter'
                />
              </div>
              <div className='flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1'>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded transition-all duration-200 ${
                    viewMode === 'grid'
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z'
                    />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded transition-all duration-200 ${
                    viewMode === 'list'
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M4 6h16M4 10h16M4 14h16M4 18h16'
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Classes Grid */}
      <div className='px-6 pb-6'>
        {sortedClasses.length > 0 ? (
          <div
            className={`${viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}`}
          >
            {sortedClasses.map((cls, index) => (
              <div
                key={cls.id}
                className={`group bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden ${
                  viewMode === 'list' ? 'flex' : ''
                }`}
              >
                {/* Class Image */}
                <div
                  className={`${viewMode === 'list' ? 'w-64 flex-shrink-0' : ''} h-48 relative overflow-hidden bg-gray-100 dark:bg-gray-800`}
                >
                  {/* Background Image */}
                  <img
                    src={getClassBackgroundImage(cls.category)}
                    alt={cls.name}
                    className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-300'
                    onError={e => {
                      // Fallback to gradient if image fails to load
                      e.currentTarget.style.display = 'none';
                      const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                      if (nextElement) {
                        nextElement.style.display = 'flex';
                      }
                    }}
                  />

                  {/* Fallback Gradient */}
                  <div className='w-full h-full bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900 dark:to-orange-800 items-center justify-center hidden'>
                    <div className='text-center'>
                      <svg
                        className='w-12 h-12 text-orange-500 mx-auto mb-2'
                        fill='none'
                        stroke='currentColor'
                        viewBox='0 0 24 24'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10'
                        />
                      </svg>
                      <p className='text-orange-600 dark:text-orange-400 font-heading text-sm font-medium'>
                        {getCategoryLabel(cls.category)}
                      </p>
                    </div>
                  </div>

                  {/* Overlay for better text readability */}
                  <div className='absolute inset-0 bg-black/20'></div>

                  {/* Category Badge - Top Left */}
                  <div className='absolute top-2 left-2 z-10'>
                    <span className='px-2 py-1 rounded-md text-[10px] font-heading font-semibold bg-white/95 dark:bg-gray-900/95 text-orange-600 dark:text-orange-400 shadow-sm'>
                      {getCategoryLabel(cls.category)}
                    </span>
                  </div>

                  {/* Level Image - Top Right */}
                  <div className='absolute top-2 right-2 z-10'>
                    <div className='relative animate-bounce'>
                      <img
                        src={getLevelImage(cls.difficulty)}
                        alt={`Level ${getDifficultyLabel(cls.difficulty)}`}
                        className='w-16 h-14 object-contain drop-shadow-lg'
                        onError={e => {
                          // Hide image if it fails to load
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  </div>

                  {/* Difficulty Badge - Bottom Right */}
                  <div className='absolute bottom-2 right-2 z-10'>
                    <span
                      className={`px-2 py-1 rounded-md text-[10px] font-heading font-semibold bg-white/95 dark:bg-gray-900/95 ${getDifficultyColor(cls.difficulty)}`}
                    >
                      {getDifficultyLabel(cls.difficulty)}
                    </span>
                  </div>
                </div>

                {/* Class Info */}
                <div className={`${viewMode === 'list' ? 'flex-1' : ''} p-4`}>
                  <div className='mb-3'>
                    <h3 className='text-base font-bold font-heading text-gray-900 dark:text-white leading-tight mb-2'>
                      {cls.name || 'Chưa có tên'}
                    </h3>
                    <p className='text-[11px] font-inter text-gray-600 dark:text-gray-400 line-clamp-2 leading-tight'>
                      {cls.description || 'Chưa có mô tả'}
                    </p>
                  </div>

                  {/* Class Details */}
                  <div className='space-y-2 mb-4'>
                    <div className='flex items-center justify-between text-[11px]'>
                      <div className='flex items-center gap-1.5 text-gray-600 dark:text-gray-400 font-inter'>
                        <ClockIcon />
                        <span>Thời lượng:</span>
                      </div>
                      <span className='text-gray-900 dark:text-white font-heading font-semibold'>
                        {cls.duration || 0} phút
                      </span>
                    </div>
                    <div className='flex items-center justify-between text-[11px]'>
                      <div className='flex items-center gap-1.5 text-gray-600 dark:text-gray-400 font-inter'>
                        <UsersIcon />
                        <span>Sức chứa:</span>
                      </div>
                      <span className='text-gray-900 dark:text-white font-heading font-semibold'>
                        {cls.max_capacity || 0} người
                      </span>
                    </div>
                    <div className='flex items-center justify-between text-[11px]'>
                      <div className='flex items-center gap-1.5 text-gray-600 dark:text-gray-400 font-inter'>
                        <CurrencyIcon />
                        <span>Giá:</span>
                      </div>
                      <span className='text-orange-600 dark:text-orange-400 font-heading font-bold'>
                        {formatPrice(cls.price || 0)}
                      </span>
                    </div>
                    {cls.rating_average && cls.rating_average > 0 && (
                      <div className='flex items-center justify-between text-[11px]'>
                        <div className='flex items-center gap-1.5 text-gray-600 dark:text-gray-400 font-inter'>
                          <StarIcon />
                          <span>Đánh giá:</span>
                        </div>
                        <div className='flex items-center gap-1'>
                          <div className='flex items-center text-yellow-500'>
                            {renderStars(cls.rating_average)}
                          </div>
                          <span className='text-gray-900 dark:text-white font-heading font-semibold'>
                            {cls.rating_average.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Status and Actions */}
                  <div className='flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700'>
                    <div className='flex items-center gap-2'>
                      <div
                        className={`w-2 h-2 rounded-full ${cls.is_active ? 'bg-green-500' : 'bg-gray-400'}`}
                      ></div>
                      <span className='text-[11px] font-inter text-gray-600 dark:text-gray-400'>
                        {cls.is_active ? 'Hoạt động' : 'Tạm dừng'}
                      </span>
                    </div>
                    <Link
                      to={`/trainerdashboard/schedule?classId=${cls.id}`}
                      className='inline-block'
                    >
                      <Button
                        variant='outline'
                        size='sm'
                        className='text-[11px] font-heading px-3 py-1.5'
                        type='button'
                        onClick={e => {
                          // Allow Link navigation
                          e.stopPropagation();
                        }}
                      >
                        Xem chi tiết
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className='text-center py-12'>
            <div className='max-w-md mx-auto'>
              <div className='w-16 h-16 mx-auto mb-4 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center'>
                <svg
                  className='w-8 h-8 text-orange-500 dark:text-orange-400'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10'
                  />
                </svg>
              </div>
              <h3 className='text-lg font-bold font-heading text-gray-900 dark:text-white mb-2'>
                {searchTerm || categoryFilter || difficultyFilter
                  ? 'Không tìm thấy lớp học phù hợp'
                  : 'Chưa có lớp học nào'}
              </h3>
              <p className='text-sm font-inter text-gray-600 dark:text-gray-400 mb-4'>
                {searchTerm || categoryFilter || difficultyFilter
                  ? 'Thử thay đổi bộ lọc tìm kiếm hoặc xóa bộ lọc để xem tất cả lớp học'
                  : 'Bạn chưa có lớp học nào được gán. Liên hệ quản trị viên để được phân công lớp học.'}
              </p>
              {(searchTerm || categoryFilter || difficultyFilter) && (
                <Button
                  onClick={clearFilters}
                  variant='primary'
                  size='sm'
                  className='text-[11px] font-heading'
                >
                  Xóa bộ lọc
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
