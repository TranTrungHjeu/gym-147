import React, { useState } from 'react';
import {
  Activity,
  Dumbbell,
  Heart,
  Zap,
  Shield,
  Wrench,
  Package,
} from 'lucide-react';

interface EquipmentIconProps {
  category: string;
  className?: string;
  use3DIcon?: boolean;
  iconUrl?: string;
}

/**
 * Equipment Icon Component
 * 
 * This component renders 3D icons for equipment categories from Figma.
 * 
 * To use 3D icons:
 * 1. Download icons from Figma: https://www.figma.com/design/akcC7NBRsBGiWSjXD0foCR/3D-Icon-Pack--Fitness---Gym--Community-?node-id=3-126&m=dev
 * 2. Export icons as PNG (recommended size: 128x128 or 256x256)
 * 3. Place icons in: apps/web-admin/public/icons/equipment/
 * 4. Name files according to category:
 *    - cardio.png
 *    - strength.png
 *    - free-weights.png
 *    - functional.png
 *    - stretching.png
 *    - recovery.png
 *    - specialized.png
 *    - default.png
 * 
 * Or use iconUrl prop to load from external URL/CDN
 */
const EquipmentIcon: React.FC<EquipmentIconProps> = ({
  category,
  className = 'w-10 h-10',
  use3DIcon = true,
  iconUrl,
}) => {
  const [imageError, setImageError] = useState(false);

  // Map category to icon filename
  const getIconPath = (cat: string): string => {
    const iconMap: Record<string, string> = {
      CARDIO: 'cardio',
      STRENGTH: 'strength',
      FREE_WEIGHTS: 'free-weights',
      FUNCTIONAL: 'functional',
      STRETCHING: 'stretching',
      RECOVERY: 'recovery',
      SPECIALIZED: 'specialized',
    };

    const iconName = iconMap[cat] || 'default';
    // Icons are served from public folder in Vite
    return `/icons/equipment/${iconName}.png`;
  };

  // Fallback to Lucide icons if 3D icons are not available
  const getFallbackIcon = (cat: string) => {
    switch (cat) {
      case 'CARDIO':
        return <Activity className={className} />;
      case 'STRENGTH':
        return <Dumbbell className={className} />;
      case 'FREE_WEIGHTS':
        return <Dumbbell className={className} />;
      case 'FUNCTIONAL':
        return <Zap className={className} />;
      case 'STRETCHING':
        return <Heart className={className} />;
      case 'RECOVERY':
        return <Shield className={className} />;
      case 'SPECIALIZED':
        return <Wrench className={className} />;
      default:
        return <Package className={className} />;
    }
  };

  // If using external URL
  if (iconUrl) {
    return (
      <img
        src={iconUrl}
        alt={`${category} equipment icon`}
        className={`object-contain ${className}`}
        onError={() => setImageError(true)}
      />
    );
  }

  // If 3D icons are enabled and not errored, try to load from assets
  if (use3DIcon && !imageError) {
    const iconPath = getIconPath(category);
    return (
      <img
        src={iconPath}
        alt={`${category} equipment icon`}
        className={`object-contain ${className}`}
        onError={() => {
          setImageError(true);
        }}
      />
    );
  }

  // Fallback to Lucide icons
  return <div className={className}>{getFallbackIcon(category)}</div>;
};

export default EquipmentIcon;

