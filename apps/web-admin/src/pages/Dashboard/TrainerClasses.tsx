import { useEffect, useState } from 'react';
import Input from '../../components/form/input/InputField';
import Button from '../../components/ui/Button/Button';
import { GymClass, scheduleService } from '../../services/schedule.service';

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

      if (response.success) {
        const data = response.data as unknown as { classes: GymClass[] };
        setClasses(Array.isArray(data?.classes) ? data.classes : []);
      } else {
        throw new Error(response.message || 'Lỗi tải danh sách lớp học');
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      if (window.showToast) {
        window.showToast({
          type: 'error',
          message: 'Lỗi tải danh sách lớp học',
          duration: 3000,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredClasses = classes.filter(cls => {
    const matchesSearch =
      (cls.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (cls.description?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesCategory = !categoryFilter || cls.category === categoryFilter;
    const matchesDifficulty = !difficultyFilter || cls.difficulty === difficultyFilter;
    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  // Sort classes
  const sortedClasses = [...filteredClasses].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'price':
        return a.price - b.price;
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

  const getCategoryLabel = (category: string) => {
    const categories: { [key: string]: string } = {
      CARDIO: 'Cardio',
      STRENGTH: 'Tăng cơ',
      YOGA: 'Yoga',
      PILATES: 'Pilates',
      DANCE: 'Nhảy',
      MARTIAL_ARTS: 'Võ thuật',
      AQUA: 'Bợi lội',
      FUNCTIONAL: 'Chức năng',
      RECOVERY: 'Phục hồi',
      SPECIALIZED: 'Chuyên biệt',
    };
    return categories[category] || category;
  };

  const getDifficultyLabel = (difficulty: string) => {
    const difficulties: { [key: string]: string } = {
      BEGINNER: 'Cơ bản',
      INTERMEDIATE: 'Trung bình',
      ADVANCED: 'Nâng cao',
      ALL_LEVELS: 'Phù hợp tất cả mọi người',
    };
    return difficulties[difficulty] || difficulty;
  };

  const getDifficultyColor = (difficulty: string) => {
    const colors: { [key: string]: string } = {
      BEGINNER: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      INTERMEDIATE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      ADVANCED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      ALL_LEVELS: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    };
    return colors[difficulty] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  };

  const getCategoryColor = (category: string) => {
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
  const getClassBackgroundImage = (category: string) => {
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
  const getLevelImage = (difficulty: string) => {
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
    <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden animate-pulse'>
      <div className='h-56 bg-gray-300 dark:bg-gray-600'></div>
      <div className='p-7'>
        <div className='h-6 bg-gray-300 dark:bg-gray-600 rounded mb-3'></div>
        <div className='h-4 bg-gray-300 dark:bg-gray-600 rounded mb-2'></div>
        <div className='h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-4'></div>
        <div className='space-y-2'>
          <div className='h-4 bg-gray-300 dark:bg-gray-600 rounded'></div>
          <div className='h-4 bg-gray-300 dark:bg-gray-600 rounded'></div>
          <div className='h-4 bg-gray-300 dark:bg-gray-600 rounded'></div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-[var(--color-gray-50)] via-[var(--color-white)] to-[var(--color-gray-100)] dark:from-[var(--color-gray-900)] dark:via-[var(--color-gray-800)] dark:to-[var(--color-gray-900)]'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
          {/* Header Skeleton */}
          <div className='mb-6'>
            <div className='h-8 bg-gray-300 dark:bg-gray-600 rounded w-64 mb-2 animate-pulse'></div>
            <div className='h-4 bg-gray-300 dark:bg-gray-600 rounded w-96 animate-pulse'></div>
          </div>

          {/* Filter Skeleton */}
          <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-8 animate-pulse'>
            <div className='flex flex-col sm:flex-row gap-4'>
              <div className='flex-1 h-10 bg-gray-300 dark:bg-gray-600 rounded-lg'></div>
              <div className='sm:w-48 h-10 bg-gray-300 dark:bg-gray-600 rounded-lg'></div>
            </div>
          </div>

          {/* Cards Skeleton */}
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'>
            {Array.from({ length: 6 }).map((_, index) => (
              <SkeletonCard key={index} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-[var(--color-gray-50)] via-[var(--color-white)] to-[var(--color-gray-100)] dark:from-[var(--color-gray-900)] dark:via-[var(--color-gray-800)] dark:to-[var(--color-gray-900)]'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
        {/* Header Section */}
        <div className='mb-6'>
          <h1
            className='text-2xl font-bold text-gray-800 dark:text-white/90 mb-2'
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
          >
            Quản lý lớp học
          </h1>
          <p className='text-gray-600 dark:text-gray-400'>
            Xem và quản lý các lớp học bạn đang dạy
          </p>
        </div>

        {/* Enhanced Filter Bar */}
        <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-8'>
          <div className='flex flex-col lg:flex-row gap-4 mb-4'>
            <div className='flex-1'>
              <Input
                type='text'
                placeholder='Tìm kiếm lớp học...'
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className='w-full'
              />
            </div>
            <div className='sm:w-48'>
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--color-orange-500)] focus:border-transparent transition-all duration-200'
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                <option value=''>Tất cả danh mục</option>
                <option value='CARDIO'>Cardio</option>
                <option value='STRENGTH'>Tăng cơ</option>
                <option value='YOGA'>Yoga</option>
                <option value='PILATES'>Pilates</option>
                <option value='DANCE'>Nhảy</option>
                <option value='MARTIAL_ARTS'>Võ thuật</option>
                <option value='AQUA'>Bơi lội</option>
                <option value='FUNCTIONAL'>Chức năng</option>
                <option value='RECOVERY'>Phục hồi</option>
                <option value='SPECIALIZED'>Chuyên biệt</option>
              </select>
            </div>
            <div className='sm:w-48'>
              <select
                value={difficultyFilter}
                onChange={e => setDifficultyFilter(e.target.value)}
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--color-orange-500)] focus:border-transparent transition-all duration-200'
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                <option value=''>Tất cả độ khó</option>
                <option value='BEGINNER'>Cơ bản</option>
                <option value='INTERMEDIATE'>Trung bình</option>
                <option value='ADVANCED'>Nâng cao</option>
                <option value='ALL_LEVELS'>Tất cả mọi người</option>
              </select>
            </div>
            <div className='sm:w-48'>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--color-orange-500)] focus:border-transparent transition-all duration-200'
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                <option value='name'>Sắp xếp theo tên</option>
                <option value='price'>Sắp xếp theo giá</option>
                <option value='difficulty'>Sắp xếp theo độ khó</option>
                <option value='rating'>Sắp xếp theo đánh giá</option>
              </select>
            </div>
          </div>

          {/* Results count and actions */}
          <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
            <div className='flex items-center gap-4'>
              <span className='text-sm text-gray-600 dark:text-gray-400'>
                Hiển thị {sortedClasses.length}/{classes.length} lớp học
              </span>
              {(searchTerm || categoryFilter || difficultyFilter) && (
                <button
                  onClick={clearFilters}
                  className='text-sm text-[var(--color-orange-600)] hover:text-[var(--color-orange-700)] dark:text-[var(--color-orange-400)] dark:hover:text-[var(--color-orange-300)] transition-colors duration-200'
                >
                  Xóa bộ lọc
                </button>
              )}
            </div>

            {/* View mode toggle */}
            <div className='flex items-center gap-2'>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  viewMode === 'grid'
                    ? 'bg-[var(--color-orange-100)] text-[var(--color-orange-600)] dark:bg-[var(--color-orange-900)] dark:text-[var(--color-orange-400)]'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
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
                className={`p-2 rounded-lg transition-all duration-200 ${
                  viewMode === 'list'
                    ? 'bg-[var(--color-orange-100)] text-[var(--color-orange-600)] dark:bg-[var(--color-orange-900)] dark:text-[var(--color-orange-400)]'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
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

        {/* Classes Grid */}
        {sortedClasses.length > 0 ? (
          <div
            className={`${viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8' : 'space-y-6'}`}
          >
            {sortedClasses.map((cls, index) => (
              <div
                key={cls.id}
                className={`group bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-2xl transition-all duration-300 overflow-hidden transform hover:scale-[1.02] ${
                  viewMode === 'list' ? 'flex' : ''
                }`}
                style={{
                  animationDelay: `${index * 100}ms`,
                  animation: 'fadeInUp 0.6s ease-out forwards',
                }}
              >
                {/* Class Image */}
                <div
                  className={`${viewMode === 'list' ? 'w-80 h-48' : 'h-56'} relative overflow-hidden`}
                >
                  {/* Background Image */}
                  <img
                    src={getClassBackgroundImage(cls.category)}
                    alt={cls.name}
                    className='w-full h-full object-cover absolute inset-0 z-0 group-hover:scale-110 transition-transform duration-500'
                    style={{ display: 'block' }}
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
                  <div className='w-full h-full bg-gradient-to-br from-[var(--color-orange-100)] to-[var(--color-orange-200)] dark:from-[var(--color-orange-900)] dark:to-[var(--color-orange-800)] items-center justify-center hidden'>
                    <div className='text-center'>
                      <svg
                        className='w-16 h-16 text-[var(--color-orange-500)] mx-auto mb-2'
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
                      <p
                        className='text-[var(--color-orange-600)] dark:text-[var(--color-orange-400)] font-medium'
                        style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                      >
                        {getCategoryLabel(cls.category)}
                      </p>
                    </div>
                  </div>

                  {/* Overlay for better text readability */}
                  <div
                    className='absolute inset-0 z-10'
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                  ></div>

                  {/* Category Badge - Top Left */}
                  <div className='absolute top-3 left-3 z-20'>
                    <span className='px-3 py-1 rounded-full text-xs font-medium bg-white bg-opacity-95 backdrop-blur-sm text-[var(--color-orange-600)] shadow-sm border border-white border-opacity-50'>
                      {getCategoryLabel(cls.category)}
                    </span>
                  </div>

                  {/* Level Badge with Animation - Top Right */}
                  <div className='absolute top-3 right-3 z-20'>
                    <div className='relative animate-bounce'>
                      <img
                        src={getLevelImage(cls.difficulty)}
                        alt={`Level ${getDifficultyLabel(cls.difficulty)}`}
                        className='w-22 h-18 drop-shadow-lg'
                      />
                    </div>
                  </div>

                  {/* Difficulty Text Badge - Bottom Right */}
                  <div className='absolute bottom-3 right-3 z-20'>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm shadow-sm ${getDifficultyColor(cls.difficulty)}`}
                      title={`Độ khó: ${getDifficultyLabel(cls.difficulty)}`}
                    >
                      {getDifficultyLabel(cls.difficulty)}
                    </span>
                  </div>
                </div>

                {/* Class Info */}
                <div className={`${viewMode === 'list' ? 'flex-1' : ''} p-7`}>
                  <div className='flex items-start justify-between mb-4'>
                    <h3
                      className='text-xl font-bold text-gray-900 dark:text-white flex-1 leading-tight'
                      style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                    >
                      {cls.name}
                    </h3>
                    {viewMode === 'grid' && (
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getCategoryColor(cls.category)}`}
                      >
                        {getCategoryLabel(cls.category)}
                      </span>
                    )}
                  </div>

                  <p className='text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2 leading-relaxed'>
                    {cls.description}
                  </p>

                  {/* Rating Display */}
                  {cls.rating_average && cls.rating_average > 0 && (
                    <div className='flex items-center gap-2 mb-4'>
                      <div className='flex items-center text-yellow-500'>
                        {renderStars(cls.rating_average)}
                      </div>
                      <span className='text-sm text-gray-600 dark:text-gray-400'>
                        ({cls.rating_average.toFixed(1)})
                      </span>
                    </div>
                  )}

                  {/* Class Details */}
                  <div className='space-y-3 mb-6'>
                    <div className='flex items-center justify-between text-sm'>
                      <div className='flex items-center gap-2 text-gray-500 dark:text-gray-400'>
                        <ClockIcon />
                        <span>Thời lượng:</span>
                      </div>
                      <span className='text-gray-900 dark:text-white font-semibold'>
                        {cls.duration} phút
                      </span>
                    </div>
                    <div className='flex items-center justify-between text-sm'>
                      <div className='flex items-center gap-2 text-gray-500 dark:text-gray-400'>
                        <UsersIcon />
                        <span>Sức chứa:</span>
                      </div>
                      <span className='text-gray-900 dark:text-white font-semibold'>
                        {cls.max_capacity} người
                      </span>
                    </div>
                    <div className='flex items-center justify-between text-sm'>
                      <div className='flex items-center gap-2 text-gray-500 dark:text-gray-400'>
                        <TrendingUpIcon />
                        <span>Độ khó:</span>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getDifficultyColor(cls.difficulty)}`}
                      >
                        {getDifficultyLabel(cls.difficulty)}
                      </span>
                    </div>
                    <div className='flex items-center justify-between text-sm'>
                      <div className='flex items-center gap-2 text-gray-500 dark:text-gray-400'>
                        <CurrencyIcon />
                        <span>Giá:</span>
                      </div>
                      <span className='text-[var(--color-orange-600)] dark:text-[var(--color-orange-400)] font-bold text-lg'>
                        {formatPrice(cls.price)}
                      </span>
                    </div>
                  </div>

                  {/* Status and Actions */}
                  <div className='flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700'>
                    <div className='flex items-center'>
                      <div
                        className={`w-3 h-3 rounded-full mr-3 ${cls.is_active ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}
                      ></div>
                      <span className='text-sm font-medium text-gray-600 dark:text-gray-400'>
                        {cls.is_active ? 'Hoạt động' : 'Tạm dừng'}
                      </span>
                    </div>
                    <div className='flex items-center gap-2'>
                      <Button
                        variant='outline'
                        size='sm'
                        className='text-[var(--color-orange-600)] border-[var(--color-orange-600)] hover:bg-[var(--color-orange-50)] dark:text-[var(--color-orange-400)] dark:border-[var(--color-orange-400)] dark:hover:bg-[var(--color-orange-900)] transition-all duration-200 hover:scale-105'
                      >
                        Xem chi tiết
                      </Button>
                      <button
                        className='p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors duration-200'
                        title='Thêm vào yêu thích'
                      >
                        <svg
                          className='w-5 h-5'
                          fill='none'
                          stroke='currentColor'
                          viewBox='0 0 24 24'
                        >
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z'
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className='text-center py-16'>
            <div className='max-w-md mx-auto'>
              <div className='w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-[var(--color-orange-100)] to-[var(--color-orange-200)] dark:from-[var(--color-orange-900)] dark:to-[var(--color-orange-800)] rounded-full flex items-center justify-center'>
                <svg
                  className='w-12 h-12 text-[var(--color-orange-500)]'
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
              <h3
                className='text-2xl font-bold text-gray-900 dark:text-white mb-3'
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                {searchTerm || categoryFilter || difficultyFilter
                  ? 'Không tìm thấy lớp học phù hợp'
                  : 'Chưa có lớp học nào'}
              </h3>
              <p className='text-gray-600 dark:text-gray-400 mb-6 leading-relaxed'>
                {searchTerm || categoryFilter || difficultyFilter
                  ? 'Thử thay đổi bộ lọc tìm kiếm hoặc xóa bộ lọc để xem tất cả lớp học'
                  : 'Bạn chưa có lớp học nào được gán. Liên hệ quản trị viên để được phân công lớp học.'}
              </p>
              {(searchTerm || categoryFilter || difficultyFilter) && (
                <Button
                  onClick={clearFilters}
                  className='bg-[var(--color-orange-500)] hover:bg-[var(--color-orange-600)] text-white transition-all duration-200 hover:scale-105'
                >
                  Xóa bộ lọc
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
