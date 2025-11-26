import type React from "react";
import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface DropdownProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  isOpen,
  onClose,
  children,
  className = "",
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Check if click is outside dropdown and not on toggle button
      const isClickOnToggle = target.closest(".dropdown-toggle");
      const isClickInsideDropdown = dropdownRef.current?.contains(target);
      
      if (!isClickInsideDropdown && !isClickOnToggle) {
        onClose();
      }
    };

    // Use capture phase to handle event before it bubbles
    document.addEventListener("mousedown", handleClickOutside, true);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside, true);
    };
  }, [isOpen, onClose]);

  // Animation variants - improved smooth animations
  const dropdownVariants = {
    hidden: {
      opacity: 0,
      y: -8,
      scale: 0.96,
      filter: 'blur(4px)',
      transition: {
        duration: 0.2,
        ease: [0.4, 0, 0.2, 1],
      },
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: 'blur(0px)',
      transition: {
        duration: 0.25,
        ease: [0.34, 1.56, 0.64, 1], // Elastic ease-out for smooth bounce
        staggerChildren: 0.04,
        delayChildren: 0.06,
      },
    },
    exit: {
      opacity: 0,
      y: -8,
      scale: 0.96,
      filter: 'blur(4px)',
      transition: {
        duration: 0.18,
        ease: [0.4, 0, 0.2, 1],
      },
    },
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          ref={dropdownRef}
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={dropdownVariants}
          className={`absolute z-40 right-0 mt-2 rounded-xl border border-gray-200 bg-white shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark ${className}`}
          style={{
            transformOrigin: "top right",
          }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
