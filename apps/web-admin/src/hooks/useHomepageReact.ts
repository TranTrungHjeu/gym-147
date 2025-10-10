import { useEffect, useState } from 'react';
import { useMobileMenu } from './useMobileMenu';
import { useModal } from './useModal';

export const useHomepageReact = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [searchIconClicked, setSearchIconClicked] = useState(false);
  const searchModal = useModal();
  const mobileMenu = useMobileMenu();

  const handleSearchClick = () => {
    setSearchIconClicked(true);
    setTimeout(() => {
      searchModal.openModal();
      setSearchIconClicked(false);
    }, 200);
  };

  useEffect(() => {
    // Preloader effect
    const timer = setTimeout(() => {
      setIsLoaded(true);
      const preloader = document.getElementById('preloder');
      if (preloader) {
        preloader.style.opacity = '0';
        setTimeout(() => {
          preloader.style.display = 'none';
        }, 300);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return {
    isLoaded,
    searchModal,
    mobileMenu,
    searchIconClicked,
    handleSearchClick,
  };
};
