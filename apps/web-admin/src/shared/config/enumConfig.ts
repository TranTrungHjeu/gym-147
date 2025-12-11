/**
 * Unified Enum Configuration
 *
 * Centralized configuration for all enum types used in the system
 * Includes colors, icons, and translation keys for consistent badge design
 */

import {
  Activity,
  AlertCircle,
  Award,
  Ban,
  Bell,
  CheckCircle2,
  Clock,
  CreditCard,
  Dumbbell,
  GraduationCap,
  Heart,
  HeartPulse,
  Lock,
  QrCode,
  Shield,
  Smartphone,
  Sparkles,
  User,
  UserCheck,
  UserCog,
  UserX,
  Wrench,
  XCircle,
  Zap,
  Calendar,
  DollarSign,
  FileText,
  Package,
  PlayCircle,
  PauseCircle,
  RotateCcw,
  Settings,
  Star,
  Target,
  TrendingUp,
  Users,
  Wallet,
  Weight,
} from 'lucide-react';
import { LucideIcon } from 'lucide-react';

export type EnumType =
  | 'ROLE'
  | 'EQUIPMENT_STATUS'
  | 'EQUIPMENT_CATEGORY'
  | 'MEMBERSHIP_STATUS'
  | 'MEMBERSHIP_TYPE'
  | 'TRAINER_STATUS'
  | 'CLASS_CATEGORY'
  | 'BOOKING_STATUS'
  | 'SCHEDULE_STATUS'
  | 'PAYMENT_STATUS'
  | 'PAYMENT_METHOD'
  | 'REFUND_STATUS'
  | 'REFUND_REASON'
  | 'SUBSCRIPTION_STATUS'
  | 'QUEUE_STATUS'
  | 'ISSUE_TYPE'
  | 'SEVERITY'
  | 'REPORT_STATUS'
  | 'CERTIFICATION_LEVEL'
  | 'VERIFICATION_STATUS'
  | 'DIFFICULTY'
  | 'GENDER'
  | 'ACCESS_METHOD';

export interface EnumConfig {
  value: string;
  label: string; // Translation key
  color: {
    bg: string;
    text: string;
    border: string;
    dark?: {
      bg: string;
      text: string;
      border: string;
    };
  };
  icon?: LucideIcon;
  variant?: 'default' | 'gradient' | 'solid' | 'outline';
}

export const enumConfigs: Record<EnumType, Record<string, EnumConfig>> = {
  ROLE: {
    SUPER_ADMIN: {
      value: 'SUPER_ADMIN',
      label: 'enum.role.superAdmin',
      color: {
        bg: 'bg-gradient-to-r from-orange-600 via-orange-700 to-orange-600',
        text: 'text-white',
        border: 'border-orange-700',
        dark: {
          bg: 'dark:from-orange-800 dark:via-orange-900 dark:to-orange-800',
          text: 'dark:text-orange-100',
          border: 'dark:border-orange-600',
        },
      },
      icon: Shield,
      variant: 'gradient',
    },
    ADMIN: {
      value: 'ADMIN',
      label: 'enum.role.admin',
      color: {
        bg: 'bg-gradient-to-r from-orange-100 via-orange-200 to-orange-100',
        text: 'text-orange-800',
        border: 'border-orange-300',
        dark: {
          bg: 'dark:from-orange-900/30 dark:via-orange-800/40 dark:to-orange-900/30',
          text: 'dark:text-orange-300',
          border: 'dark:border-orange-700',
        },
      },
      icon: UserCog,
      variant: 'gradient',
    },
    TRAINER: {
      value: 'TRAINER',
      label: 'enum.role.trainer',
      color: {
        bg: 'bg-gradient-to-r from-orange-100 via-amber-50 to-orange-100',
        text: 'text-orange-700',
        border: 'border-orange-200',
        dark: {
          bg: 'dark:from-orange-900/30 dark:via-amber-900/20 dark:to-orange-900/30',
          text: 'dark:text-orange-300',
          border: 'dark:border-orange-700',
        },
      },
      icon: Award,
      variant: 'gradient',
    },
    MEMBER: {
      value: 'MEMBER',
      label: 'enum.role.member',
      color: {
        bg: 'bg-gradient-to-r from-gray-700 via-gray-800 to-gray-700',
        text: 'text-white',
        border: 'border-gray-900',
        dark: {
          bg: 'dark:from-gray-800 dark:via-gray-900 dark:to-gray-800',
          text: 'dark:text-gray-100',
          border: 'dark:border-gray-700',
        },
      },
      icon: User,
      variant: 'gradient',
    },
  },

  EQUIPMENT_STATUS: {
    AVAILABLE: {
      value: 'AVAILABLE',
      label: 'enum.equipmentStatus.available',
      color: {
        bg: 'bg-green-100',
        text: 'text-green-700',
        border: 'border-green-300',
        dark: {
          bg: 'dark:bg-green-900/30',
          text: 'dark:text-green-400',
          border: 'dark:border-green-700',
        },
      },
      icon: CheckCircle2,
      variant: 'default',
    },
    IN_USE: {
      value: 'IN_USE',
      label: 'enum.equipmentStatus.inUse',
      color: {
        bg: 'bg-orange-100',
        text: 'text-orange-700',
        border: 'border-orange-300',
        dark: {
          bg: 'dark:bg-orange-900/30',
          text: 'dark:text-orange-400',
          border: 'dark:border-orange-700',
        },
      },
      icon: Activity,
      variant: 'default',
    },
    MAINTENANCE: {
      value: 'MAINTENANCE',
      label: 'enum.equipmentStatus.maintenance',
      color: {
        bg: 'bg-yellow-100',
        text: 'text-yellow-700',
        border: 'border-yellow-300',
        dark: {
          bg: 'dark:bg-yellow-900/30',
          text: 'dark:text-yellow-400',
          border: 'dark:border-yellow-700',
        },
      },
      icon: Wrench,
      variant: 'default',
    },
    OUT_OF_ORDER: {
      value: 'OUT_OF_ORDER',
      label: 'enum.equipmentStatus.outOfOrder',
      color: {
        bg: 'bg-red-100',
        text: 'text-red-700',
        border: 'border-red-300',
        dark: {
          bg: 'dark:bg-red-900/30',
          text: 'dark:text-red-400',
          border: 'dark:border-red-700',
        },
      },
      icon: XCircle,
      variant: 'default',
    },
    RESERVED: {
      value: 'RESERVED',
      label: 'enum.equipmentStatus.reserved',
      color: {
        bg: 'bg-blue-100',
        text: 'text-blue-700',
        border: 'border-blue-300',
        dark: {
          bg: 'dark:bg-blue-900/30',
          text: 'dark:text-blue-400',
          border: 'dark:border-blue-700',
        },
      },
      icon: Lock,
      variant: 'default',
    },
  },

  EQUIPMENT_CATEGORY: {
    CARDIO: {
      value: 'CARDIO',
      label: 'enum.equipmentCategory.cardio',
      color: {
        bg: 'bg-red-100',
        text: 'text-red-700',
        border: 'border-red-300',
        dark: {
          bg: 'dark:bg-red-900/30',
          text: 'dark:text-red-400',
          border: 'dark:border-red-700',
        },
      },
      icon: HeartPulse,
      variant: 'default',
    },
    STRENGTH: {
      value: 'STRENGTH',
      label: 'enum.equipmentCategory.strength',
      color: {
        bg: 'bg-blue-100',
        text: 'text-blue-700',
        border: 'border-blue-300',
        dark: {
          bg: 'dark:bg-blue-900/30',
          text: 'dark:text-blue-400',
          border: 'dark:border-blue-700',
        },
      },
      icon: Dumbbell,
      variant: 'default',
    },
    FREE_WEIGHTS: {
      value: 'FREE_WEIGHTS',
      label: 'enum.equipmentCategory.freeWeights',
      color: {
        bg: 'bg-purple-100',
        text: 'text-purple-700',
        border: 'border-purple-300',
        dark: {
          bg: 'dark:bg-purple-900/30',
          text: 'dark:text-purple-400',
          border: 'dark:border-purple-700',
        },
      },
      icon: Weight,
      variant: 'default',
    },
    FUNCTIONAL: {
      value: 'FUNCTIONAL',
      label: 'enum.equipmentCategory.functional',
      color: {
        bg: 'bg-amber-100',
        text: 'text-amber-700',
        border: 'border-amber-300',
        dark: {
          bg: 'dark:bg-amber-900/30',
          text: 'dark:text-amber-400',
          border: 'dark:border-amber-700',
        },
      },
      icon: Zap,
      variant: 'default',
    },
    STRETCHING: {
      value: 'STRETCHING',
      label: 'enum.equipmentCategory.stretching',
      color: {
        bg: 'bg-teal-100',
        text: 'text-teal-700',
        border: 'border-teal-300',
        dark: {
          bg: 'dark:bg-teal-900/30',
          text: 'dark:text-teal-400',
          border: 'dark:border-teal-700',
        },
      },
      icon: Sparkles,
      variant: 'default',
    },
    RECOVERY: {
      value: 'RECOVERY',
      label: 'enum.equipmentCategory.recovery',
      color: {
        bg: 'bg-indigo-100',
        text: 'text-indigo-700',
        border: 'border-indigo-300',
        dark: {
          bg: 'dark:bg-indigo-900/30',
          text: 'dark:text-indigo-400',
          border: 'dark:border-indigo-700',
        },
      },
      icon: Heart,
      variant: 'default',
    },
    SPECIALIZED: {
      value: 'SPECIALIZED',
      label: 'enum.equipmentCategory.specialized',
      color: {
        bg: 'bg-gray-100',
        text: 'text-gray-700',
        border: 'border-gray-300',
        dark: {
          bg: 'dark:bg-gray-800/30',
          text: 'dark:text-gray-400',
          border: 'dark:border-gray-700',
        },
      },
      icon: Settings,
      variant: 'default',
    },
  },

  MEMBERSHIP_STATUS: {
    ACTIVE: {
      value: 'ACTIVE',
      label: 'enum.membershipStatus.active',
      color: {
        bg: 'bg-green-100',
        text: 'text-green-700',
        border: 'border-green-300',
        dark: {
          bg: 'dark:bg-green-900/30',
          text: 'dark:text-green-400',
          border: 'dark:border-green-700',
        },
      },
      icon: CheckCircle2,
      variant: 'default',
    },
    EXPIRED: {
      value: 'EXPIRED',
      label: 'enum.membershipStatus.expired',
      color: {
        bg: 'bg-gray-100',
        text: 'text-gray-700',
        border: 'border-gray-300',
        dark: {
          bg: 'dark:bg-gray-800/30',
          text: 'dark:text-gray-400',
          border: 'dark:border-gray-700',
        },
      },
      icon: Clock,
      variant: 'default',
    },
    SUSPENDED: {
      value: 'SUSPENDED',
      label: 'enum.membershipStatus.suspended',
      color: {
        bg: 'bg-yellow-100',
        text: 'text-yellow-700',
        border: 'border-yellow-300',
        dark: {
          bg: 'dark:bg-yellow-900/30',
          text: 'dark:text-yellow-400',
          border: 'dark:border-yellow-700',
        },
      },
      icon: PauseCircle,
      variant: 'default',
    },
    CANCELLED: {
      value: 'CANCELLED',
      label: 'enum.membershipStatus.cancelled',
      color: {
        bg: 'bg-red-100',
        text: 'text-red-700',
        border: 'border-red-300',
        dark: {
          bg: 'dark:bg-red-900/30',
          text: 'dark:text-red-400',
          border: 'dark:border-red-700',
        },
      },
      icon: XCircle,
      variant: 'default',
    },
    PENDING: {
      value: 'PENDING',
      label: 'enum.membershipStatus.pending',
      color: {
        bg: 'bg-blue-100',
        text: 'text-blue-700',
        border: 'border-blue-300',
        dark: {
          bg: 'dark:bg-blue-900/30',
          text: 'dark:text-blue-400',
          border: 'dark:border-blue-700',
        },
      },
      icon: Clock,
      variant: 'default',
    },
    INACTIVE: {
      value: 'INACTIVE',
      label: 'enum.membershipStatus.inactive',
      color: {
        bg: 'bg-gray-100',
        text: 'text-gray-700',
        border: 'border-gray-300',
        dark: {
          bg: 'dark:bg-gray-800/30',
          text: 'dark:text-gray-400',
          border: 'dark:border-gray-700',
        },
      },
      icon: UserX,
      variant: 'default',
    },
  },

  MEMBERSHIP_TYPE: {
    BASIC: {
      value: 'BASIC',
      label: 'enum.membershipType.basic',
      color: {
        bg: 'bg-gray-100',
        text: 'text-gray-700',
        border: 'border-gray-300',
        dark: {
          bg: 'dark:bg-gray-800/30',
          text: 'dark:text-gray-400',
          border: 'dark:border-gray-700',
        },
      },
      icon: User,
      variant: 'default',
    },
    PREMIUM: {
      value: 'PREMIUM',
      label: 'enum.membershipType.premium',
      color: {
        bg: 'bg-gradient-to-r from-orange-100 via-orange-200 to-orange-100',
        text: 'text-orange-700',
        border: 'border-orange-300',
        dark: {
          bg: 'dark:from-orange-900/30 dark:via-orange-800/40 dark:to-orange-900/30',
          text: 'dark:text-orange-300',
          border: 'dark:border-orange-700',
        },
      },
      icon: Star,
      variant: 'gradient',
    },
    VIP: {
      value: 'VIP',
      label: 'enum.membershipType.vip',
      color: {
        bg: 'bg-gradient-to-r from-amber-100 via-yellow-100 to-amber-100',
        text: 'text-amber-700',
        border: 'border-amber-300',
        dark: {
          bg: 'dark:from-amber-900/30 dark:via-yellow-900/20 dark:to-amber-900/30',
          text: 'dark:text-amber-300',
          border: 'dark:border-amber-700',
        },
      },
      icon: Sparkles,
      variant: 'gradient',
    },
    STUDENT: {
      value: 'STUDENT',
      label: 'enum.membershipType.student',
      color: {
        bg: 'bg-blue-100',
        text: 'text-blue-700',
        border: 'border-blue-300',
        dark: {
          bg: 'dark:bg-blue-900/30',
          text: 'dark:text-blue-400',
          border: 'dark:border-blue-700',
        },
      },
      icon: GraduationCap,
      variant: 'default',
    },
  },

  TRAINER_STATUS: {
    ACTIVE: {
      value: 'ACTIVE',
      label: 'enum.trainerStatus.active',
      color: {
        bg: 'bg-green-100',
        text: 'text-green-700',
        border: 'border-green-300',
        dark: {
          bg: 'dark:bg-green-900/30',
          text: 'dark:text-green-400',
          border: 'dark:border-green-700',
        },
      },
      icon: CheckCircle2,
      variant: 'default',
    },
    INACTIVE: {
      value: 'INACTIVE',
      label: 'enum.trainerStatus.inactive',
      color: {
        bg: 'bg-gray-100',
        text: 'text-gray-700',
        border: 'border-gray-300',
        dark: {
          bg: 'dark:bg-gray-800/30',
          text: 'dark:text-gray-400',
          border: 'dark:border-gray-700',
        },
      },
      icon: UserX,
      variant: 'default',
    },
    ON_LEAVE: {
      value: 'ON_LEAVE',
      label: 'enum.trainerStatus.onLeave',
      color: {
        bg: 'bg-yellow-100',
        text: 'text-yellow-700',
        border: 'border-yellow-300',
        dark: {
          bg: 'dark:bg-yellow-900/30',
          text: 'dark:text-yellow-400',
          border: 'dark:border-yellow-700',
        },
      },
      icon: Calendar,
      variant: 'default',
    },
    TERMINATED: {
      value: 'TERMINATED',
      label: 'enum.trainerStatus.terminated',
      color: {
        bg: 'bg-red-100',
        text: 'text-red-700',
        border: 'border-red-300',
        dark: {
          bg: 'dark:bg-red-900/30',
          text: 'dark:text-red-400',
          border: 'dark:border-red-700',
        },
      },
      icon: Ban,
      variant: 'default',
    },
  },

  CLASS_CATEGORY: {
    CARDIO: {
      value: 'CARDIO',
      label: 'enum.classCategory.cardio',
      color: {
        bg: 'bg-red-100',
        text: 'text-red-700',
        border: 'border-red-300',
        dark: {
          bg: 'dark:bg-red-900/30',
          text: 'dark:text-red-400',
          border: 'dark:border-red-700',
        },
      },
      icon: HeartPulse,
      variant: 'default',
    },
    STRENGTH: {
      value: 'STRENGTH',
      label: 'enum.classCategory.strength',
      color: {
        bg: 'bg-blue-100',
        text: 'text-blue-700',
        border: 'border-blue-300',
        dark: {
          bg: 'dark:bg-blue-900/30',
          text: 'dark:text-blue-400',
          border: 'dark:border-blue-700',
        },
      },
      icon: Dumbbell,
      variant: 'default',
    },
    YOGA: {
      value: 'YOGA',
      label: 'enum.classCategory.yoga',
      color: {
        bg: 'bg-purple-100',
        text: 'text-purple-700',
        border: 'border-purple-300',
        dark: {
          bg: 'dark:bg-purple-900/30',
          text: 'dark:text-purple-400',
          border: 'dark:border-purple-700',
        },
      },
      icon: Sparkles,
      variant: 'default',
    },
    PILATES: {
      value: 'PILATES',
      label: 'enum.classCategory.pilates',
      color: {
        bg: 'bg-pink-100',
        text: 'text-pink-700',
        border: 'border-pink-300',
        dark: {
          bg: 'dark:bg-pink-900/30',
          text: 'dark:text-pink-400',
          border: 'dark:border-pink-700',
        },
      },
      icon: Target,
      variant: 'default',
    },
    DANCE: {
      value: 'DANCE',
      label: 'enum.classCategory.dance',
      color: {
        bg: 'bg-fuchsia-100',
        text: 'text-fuchsia-700',
        border: 'border-fuchsia-300',
        dark: {
          bg: 'dark:bg-fuchsia-900/30',
          text: 'dark:text-fuchsia-400',
          border: 'dark:border-fuchsia-700',
        },
      },
      icon: Sparkles,
      variant: 'default',
    },
    MARTIAL_ARTS: {
      value: 'MARTIAL_ARTS',
      label: 'enum.classCategory.martialArts',
      color: {
        bg: 'bg-orange-100',
        text: 'text-orange-700',
        border: 'border-orange-300',
        dark: {
          bg: 'dark:bg-orange-900/30',
          text: 'dark:text-orange-400',
          border: 'dark:border-orange-700',
        },
      },
      icon: Shield,
      variant: 'default',
    },
    AQUA: {
      value: 'AQUA',
      label: 'enum.classCategory.aqua',
      color: {
        bg: 'bg-cyan-100',
        text: 'text-cyan-700',
        border: 'border-cyan-300',
        dark: {
          bg: 'dark:bg-cyan-900/30',
          text: 'dark:text-cyan-400',
          border: 'dark:border-cyan-700',
        },
      },
      icon: Sparkles,
      variant: 'default',
    },
    FUNCTIONAL: {
      value: 'FUNCTIONAL',
      label: 'enum.classCategory.functional',
      color: {
        bg: 'bg-amber-100',
        text: 'text-amber-700',
        border: 'border-amber-300',
        dark: {
          bg: 'dark:bg-amber-900/30',
          text: 'dark:text-amber-400',
          border: 'dark:border-amber-700',
        },
      },
      icon: Zap,
      variant: 'default',
    },
    RECOVERY: {
      value: 'RECOVERY',
      label: 'enum.classCategory.recovery',
      color: {
        bg: 'bg-indigo-100',
        text: 'text-indigo-700',
        border: 'border-indigo-300',
        dark: {
          bg: 'dark:bg-indigo-900/30',
          text: 'dark:text-indigo-400',
          border: 'dark:border-indigo-700',
        },
      },
      icon: Heart,
      variant: 'default',
    },
    SPECIALIZED: {
      value: 'SPECIALIZED',
      label: 'enum.classCategory.specialized',
      color: {
        bg: 'bg-gray-100',
        text: 'text-gray-700',
        border: 'border-gray-300',
        dark: {
          bg: 'dark:bg-gray-800/30',
          text: 'dark:text-gray-400',
          border: 'dark:border-gray-700',
        },
      },
      icon: Settings,
      variant: 'default',
    },
  },

  BOOKING_STATUS: {
    CONFIRMED: {
      value: 'CONFIRMED',
      label: 'enum.bookingStatus.confirmed',
      color: {
        bg: 'bg-green-100',
        text: 'text-green-700',
        border: 'border-green-300',
        dark: {
          bg: 'dark:bg-green-900/30',
          text: 'dark:text-green-400',
          border: 'dark:border-green-700',
        },
      },
      icon: CheckCircle2,
      variant: 'default',
    },
    CANCELLED: {
      value: 'CANCELLED',
      label: 'enum.bookingStatus.cancelled',
      color: {
        bg: 'bg-red-100',
        text: 'text-red-700',
        border: 'border-red-300',
        dark: {
          bg: 'dark:bg-red-900/30',
          text: 'dark:text-red-400',
          border: 'dark:border-red-700',
        },
      },
      icon: XCircle,
      variant: 'default',
    },
    WAITLIST: {
      value: 'WAITLIST',
      label: 'enum.bookingStatus.waitlist',
      color: {
        bg: 'bg-yellow-100',
        text: 'text-yellow-700',
        border: 'border-yellow-300',
        dark: {
          bg: 'dark:bg-yellow-900/30',
          text: 'dark:text-yellow-400',
          border: 'dark:border-yellow-700',
        },
      },
      icon: Clock,
      variant: 'default',
    },
    NO_SHOW: {
      value: 'NO_SHOW',
      label: 'enum.bookingStatus.noShow',
      color: {
        bg: 'bg-gray-100',
        text: 'text-gray-700',
        border: 'border-gray-300',
        dark: {
          bg: 'dark:bg-gray-800/30',
          text: 'dark:text-gray-400',
          border: 'dark:border-gray-700',
        },
      },
      icon: UserX,
      variant: 'default',
    },
    COMPLETED: {
      value: 'COMPLETED',
      label: 'enum.bookingStatus.completed',
      color: {
        bg: 'bg-blue-100',
        text: 'text-blue-700',
        border: 'border-blue-300',
        dark: {
          bg: 'dark:bg-blue-900/30',
          text: 'dark:text-blue-400',
          border: 'dark:border-blue-700',
        },
      },
      icon: CheckCircle2,
      variant: 'default',
    },
  },

  SCHEDULE_STATUS: {
    SCHEDULED: {
      value: 'SCHEDULED',
      label: 'enum.scheduleStatus.scheduled',
      color: {
        bg: 'bg-blue-100',
        text: 'text-blue-700',
        border: 'border-blue-300',
        dark: {
          bg: 'dark:bg-blue-900/30',
          text: 'dark:text-blue-400',
          border: 'dark:border-blue-700',
        },
      },
      icon: Calendar,
      variant: 'default',
    },
    IN_PROGRESS: {
      value: 'IN_PROGRESS',
      label: 'enum.scheduleStatus.inProgress',
      color: {
        bg: 'bg-orange-100',
        text: 'text-orange-700',
        border: 'border-orange-300',
        dark: {
          bg: 'dark:bg-orange-900/30',
          text: 'dark:text-orange-400',
          border: 'dark:border-orange-700',
        },
      },
      icon: PlayCircle,
      variant: 'default',
    },
    COMPLETED: {
      value: 'COMPLETED',
      label: 'enum.scheduleStatus.completed',
      color: {
        bg: 'bg-green-100',
        text: 'text-green-700',
        border: 'border-green-300',
        dark: {
          bg: 'dark:bg-green-900/30',
          text: 'dark:text-green-400',
          border: 'dark:border-green-700',
        },
      },
      icon: CheckCircle2,
      variant: 'default',
    },
    CANCELLED: {
      value: 'CANCELLED',
      label: 'enum.scheduleStatus.cancelled',
      color: {
        bg: 'bg-red-100',
        text: 'text-red-700',
        border: 'border-red-300',
        dark: {
          bg: 'dark:bg-red-900/30',
          text: 'dark:text-red-400',
          border: 'dark:border-red-700',
        },
      },
      icon: XCircle,
      variant: 'default',
    },
    POSTPONED: {
      value: 'POSTPONED',
      label: 'enum.scheduleStatus.postponed',
      color: {
        bg: 'bg-yellow-100',
        text: 'text-yellow-700',
        border: 'border-yellow-300',
        dark: {
          bg: 'dark:bg-yellow-900/30',
          text: 'dark:text-yellow-400',
          border: 'dark:border-yellow-700',
        },
      },
      icon: Clock,
      variant: 'default',
    },
  },

  PAYMENT_STATUS: {
    PENDING: {
      value: 'PENDING',
      label: 'enum.paymentStatus.pending',
      color: {
        bg: 'bg-yellow-100',
        text: 'text-yellow-700',
        border: 'border-yellow-300',
        dark: {
          bg: 'dark:bg-yellow-900/30',
          text: 'dark:text-yellow-400',
          border: 'dark:border-yellow-700',
        },
      },
      icon: Clock,
      variant: 'default',
    },
    PROCESSING: {
      value: 'PROCESSING',
      label: 'enum.paymentStatus.processing',
      color: {
        bg: 'bg-blue-100',
        text: 'text-blue-700',
        border: 'border-blue-300',
        dark: {
          bg: 'dark:bg-blue-900/30',
          text: 'dark:text-blue-400',
          border: 'dark:border-blue-700',
        },
      },
      icon: RotateCcw,
      variant: 'default',
    },
    COMPLETED: {
      value: 'COMPLETED',
      label: 'enum.paymentStatus.completed',
      color: {
        bg: 'bg-green-100',
        text: 'text-green-700',
        border: 'border-green-300',
        dark: {
          bg: 'dark:bg-green-900/30',
          text: 'dark:text-green-400',
          border: 'dark:border-green-700',
        },
      },
      icon: CheckCircle2,
      variant: 'default',
    },
    FAILED: {
      value: 'FAILED',
      label: 'enum.paymentStatus.failed',
      color: {
        bg: 'bg-red-100',
        text: 'text-red-700',
        border: 'border-red-300',
        dark: {
          bg: 'dark:bg-red-900/30',
          text: 'dark:text-red-400',
          border: 'dark:border-red-700',
        },
      },
      icon: XCircle,
      variant: 'default',
    },
    CANCELLED: {
      value: 'CANCELLED',
      label: 'enum.paymentStatus.cancelled',
      color: {
        bg: 'bg-gray-100',
        text: 'text-gray-700',
        border: 'border-gray-300',
        dark: {
          bg: 'dark:bg-gray-800/30',
          text: 'dark:text-gray-400',
          border: 'dark:border-gray-700',
        },
      },
      icon: Ban,
      variant: 'default',
    },
    REFUNDED: {
      value: 'REFUNDED',
      label: 'enum.paymentStatus.refunded',
      color: {
        bg: 'bg-purple-100',
        text: 'text-purple-700',
        border: 'border-purple-300',
        dark: {
          bg: 'dark:bg-purple-900/30',
          text: 'dark:text-purple-400',
          border: 'dark:border-purple-700',
        },
      },
      icon: RotateCcw,
      variant: 'default',
    },
    PARTIALLY_REFUNDED: {
      value: 'PARTIALLY_REFUNDED',
      label: 'enum.paymentStatus.partiallyRefunded',
      color: {
        bg: 'bg-orange-100',
        text: 'text-orange-700',
        border: 'border-orange-300',
        dark: {
          bg: 'dark:bg-orange-900/30',
          text: 'dark:text-orange-400',
          border: 'dark:border-orange-700',
        },
      },
      icon: RotateCcw,
      variant: 'default',
    },
  },

  PAYMENT_METHOD: {
    CREDIT_CARD: {
      value: 'CREDIT_CARD',
      label: 'enum.paymentMethod.creditCard',
      color: {
        bg: 'bg-blue-100',
        text: 'text-blue-700',
        border: 'border-blue-300',
        dark: {
          bg: 'dark:bg-blue-900/30',
          text: 'dark:text-blue-400',
          border: 'dark:border-blue-700',
        },
      },
      icon: CreditCard,
      variant: 'default',
    },
    DEBIT_CARD: {
      value: 'DEBIT_CARD',
      label: 'enum.paymentMethod.debitCard',
      color: {
        bg: 'bg-indigo-100',
        text: 'text-indigo-700',
        border: 'border-indigo-300',
        dark: {
          bg: 'dark:bg-indigo-900/30',
          text: 'dark:text-indigo-400',
          border: 'dark:border-indigo-700',
        },
      },
      icon: CreditCard,
      variant: 'default',
    },
    BANK_TRANSFER: {
      value: 'BANK_TRANSFER',
      label: 'enum.paymentMethod.bankTransfer',
      color: {
        bg: 'bg-green-100',
        text: 'text-green-700',
        border: 'border-green-300',
        dark: {
          bg: 'dark:bg-green-900/30',
          text: 'dark:text-green-400',
          border: 'dark:border-green-700',
        },
      },
      icon: Wallet,
      variant: 'default',
    },
    VNPAY: {
      value: 'VNPAY',
      label: 'enum.paymentMethod.vnpay',
      color: {
        bg: 'bg-blue-100',
        text: 'text-blue-700',
        border: 'border-blue-300',
        dark: {
          bg: 'dark:bg-blue-900/30',
          text: 'dark:text-blue-400',
          border: 'dark:border-blue-700',
        },
      },
      icon: CreditCard,
      variant: 'default',
    },
    MOMO: {
      value: 'MOMO',
      label: 'enum.paymentMethod.momo',
      color: {
        bg: 'bg-pink-100',
        text: 'text-pink-700',
        border: 'border-pink-300',
        dark: {
          bg: 'dark:bg-pink-900/30',
          text: 'dark:text-pink-400',
          border: 'dark:border-pink-700',
        },
      },
      icon: Wallet,
      variant: 'default',
    },
    ZALO_PAY: {
      value: 'ZALO_PAY',
      label: 'enum.paymentMethod.zaloPay',
      color: {
        bg: 'bg-blue-100',
        text: 'text-blue-700',
        border: 'border-blue-300',
        dark: {
          bg: 'dark:bg-blue-900/30',
          text: 'dark:text-blue-400',
          border: 'dark:border-blue-700',
        },
      },
      icon: Wallet,
      variant: 'default',
    },
    CASH: {
      value: 'CASH',
      label: 'enum.paymentMethod.cash',
      color: {
        bg: 'bg-gray-100',
        text: 'text-gray-700',
        border: 'border-gray-300',
        dark: {
          bg: 'dark:bg-gray-800/30',
          text: 'dark:text-gray-400',
          border: 'dark:border-gray-700',
        },
      },
      icon: DollarSign,
      variant: 'default',
    },
    CRYPTO: {
      value: 'CRYPTO',
      label: 'enum.paymentMethod.crypto',
      color: {
        bg: 'bg-amber-100',
        text: 'text-amber-700',
        border: 'border-amber-300',
        dark: {
          bg: 'dark:bg-amber-900/30',
          text: 'dark:text-amber-400',
          border: 'dark:border-amber-700',
        },
      },
      icon: TrendingUp,
      variant: 'default',
    },
  },

  REFUND_STATUS: {
    PENDING: {
      value: 'PENDING',
      label: 'enum.refundStatus.pending',
      color: {
        bg: 'bg-yellow-100',
        text: 'text-yellow-700',
        border: 'border-yellow-300',
        dark: {
          bg: 'dark:bg-yellow-900/30',
          text: 'dark:text-yellow-400',
          border: 'dark:border-yellow-700',
        },
      },
      icon: Clock,
      variant: 'default',
    },
    APPROVED: {
      value: 'APPROVED',
      label: 'enum.refundStatus.approved',
      color: {
        bg: 'bg-blue-100',
        text: 'text-blue-700',
        border: 'border-blue-300',
        dark: {
          bg: 'dark:bg-blue-900/30',
          text: 'dark:text-blue-400',
          border: 'dark:border-blue-700',
        },
      },
      icon: CheckCircle2,
      variant: 'default',
    },
    PROCESSED: {
      value: 'PROCESSED',
      label: 'enum.refundStatus.processed',
      color: {
        bg: 'bg-green-100',
        text: 'text-green-700',
        border: 'border-green-300',
        dark: {
          bg: 'dark:bg-green-900/30',
          text: 'dark:text-green-400',
          border: 'dark:border-green-700',
        },
      },
      icon: CheckCircle2,
      variant: 'default',
    },
    FAILED: {
      value: 'FAILED',
      label: 'enum.refundStatus.failed',
      color: {
        bg: 'bg-red-100',
        text: 'text-red-700',
        border: 'border-red-300',
        dark: {
          bg: 'dark:bg-red-900/30',
          text: 'dark:text-red-400',
          border: 'dark:border-red-700',
        },
      },
      icon: XCircle,
      variant: 'default',
    },
    CANCELLED: {
      value: 'CANCELLED',
      label: 'enum.refundStatus.cancelled',
      color: {
        bg: 'bg-gray-100',
        text: 'text-gray-700',
        border: 'border-gray-300',
        dark: {
          bg: 'dark:bg-gray-800/30',
          text: 'dark:text-gray-400',
          border: 'dark:border-gray-700',
        },
      },
      icon: Ban,
      variant: 'default',
    },
  },

  REFUND_REASON: {
    CANCELLATION: {
      value: 'CANCELLATION',
      label: 'enum.refundReason.cancellation',
      color: {
        bg: 'bg-orange-100',
        text: 'text-orange-700',
        border: 'border-orange-300',
        dark: {
          bg: 'dark:bg-orange-900/30',
          text: 'dark:text-orange-400',
          border: 'dark:border-orange-700',
        },
      },
      icon: RotateCcw,
      variant: 'default',
    },
    DOWNGRADE: {
      value: 'DOWNGRADE',
      label: 'enum.refundReason.downgrade',
      color: {
        bg: 'bg-blue-100',
        text: 'text-blue-700',
        border: 'border-blue-300',
        dark: {
          bg: 'dark:bg-blue-900/30',
          text: 'dark:text-blue-400',
          border: 'dark:border-blue-700',
        },
      },
      icon: TrendingUp,
      variant: 'default',
    },
    OTHER: {
      value: 'OTHER',
      label: 'enum.refundReason.other',
      color: {
        bg: 'bg-gray-100',
        text: 'text-gray-700',
        border: 'border-gray-300',
        dark: {
          bg: 'dark:bg-gray-800/30',
          text: 'dark:text-gray-400',
          border: 'dark:border-gray-700',
        },
      },
      icon: FileText,
      variant: 'default',
    },
  },

  SUBSCRIPTION_STATUS: {
    TRIAL: {
      value: 'TRIAL',
      label: 'enum.subscriptionStatus.trial',
      color: {
        bg: 'bg-blue-100',
        text: 'text-blue-700',
        border: 'border-blue-300',
        dark: {
          bg: 'dark:bg-blue-900/30',
          text: 'dark:text-blue-400',
          border: 'dark:border-blue-700',
        },
      },
      icon: Clock,
      variant: 'default',
    },
    ACTIVE: {
      value: 'ACTIVE',
      label: 'enum.subscriptionStatus.active',
      color: {
        bg: 'bg-green-100',
        text: 'text-green-700',
        border: 'border-green-300',
        dark: {
          bg: 'dark:bg-green-900/30',
          text: 'dark:text-green-400',
          border: 'dark:border-green-700',
        },
      },
      icon: CheckCircle2,
      variant: 'default',
    },
    PAST_DUE: {
      value: 'PAST_DUE',
      label: 'enum.subscriptionStatus.pastDue',
      color: {
        bg: 'bg-yellow-100',
        text: 'text-yellow-700',
        border: 'border-yellow-300',
        dark: {
          bg: 'dark:bg-yellow-900/30',
          text: 'dark:text-yellow-400',
          border: 'dark:border-yellow-700',
        },
      },
      icon: AlertCircle,
      variant: 'default',
    },
    CANCELLED: {
      value: 'CANCELLED',
      label: 'enum.subscriptionStatus.cancelled',
      color: {
        bg: 'bg-red-100',
        text: 'text-red-700',
        border: 'border-red-300',
        dark: {
          bg: 'dark:bg-red-900/30',
          text: 'dark:text-red-400',
          border: 'dark:border-red-700',
        },
      },
      icon: XCircle,
      variant: 'default',
    },
    EXPIRED: {
      value: 'EXPIRED',
      label: 'enum.subscriptionStatus.expired',
      color: {
        bg: 'bg-gray-100',
        text: 'text-gray-700',
        border: 'border-gray-300',
        dark: {
          bg: 'dark:bg-gray-800/30',
          text: 'dark:text-gray-400',
          border: 'dark:border-gray-700',
        },
      },
      icon: Clock,
      variant: 'default',
    },
    SUSPENDED: {
      value: 'SUSPENDED',
      label: 'enum.subscriptionStatus.suspended',
      color: {
        bg: 'bg-orange-100',
        text: 'text-orange-700',
        border: 'border-orange-300',
        dark: {
          bg: 'dark:bg-orange-900/30',
          text: 'dark:text-orange-400',
          border: 'dark:border-orange-700',
        },
      },
      icon: PauseCircle,
      variant: 'default',
    },
    PENDING: {
      value: 'PENDING',
      label: 'enum.subscriptionStatus.pending',
      color: {
        bg: 'bg-blue-100',
        text: 'text-blue-700',
        border: 'border-blue-300',
        dark: {
          bg: 'dark:bg-blue-900/30',
          text: 'dark:text-blue-400',
          border: 'dark:border-blue-700',
        },
      },
      icon: Clock,
      variant: 'default',
    },
  },

  QUEUE_STATUS: {
    WAITING: {
      value: 'WAITING',
      label: 'enum.queueStatus.waiting',
      color: {
        bg: 'bg-yellow-100',
        text: 'text-yellow-700',
        border: 'border-yellow-300',
        dark: {
          bg: 'dark:bg-yellow-900/30',
          text: 'dark:text-yellow-400',
          border: 'dark:border-yellow-700',
        },
      },
      icon: Clock,
      variant: 'default',
    },
    NOTIFIED: {
      value: 'NOTIFIED',
      label: 'enum.queueStatus.notified',
      color: {
        bg: 'bg-blue-100',
        text: 'text-blue-700',
        border: 'border-blue-300',
        dark: {
          bg: 'dark:bg-blue-900/30',
          text: 'dark:text-blue-400',
          border: 'dark:border-blue-700',
        },
      },
      icon: Bell,
      variant: 'default',
    },
    EXPIRED: {
      value: 'EXPIRED',
      label: 'enum.queueStatus.expired',
      color: {
        bg: 'bg-gray-100',
        text: 'text-gray-700',
        border: 'border-gray-300',
        dark: {
          bg: 'dark:bg-gray-800/30',
          text: 'dark:text-gray-400',
          border: 'dark:border-gray-700',
        },
      },
      icon: Clock,
      variant: 'default',
    },
    CANCELLED: {
      value: 'CANCELLED',
      label: 'enum.queueStatus.cancelled',
      color: {
        bg: 'bg-red-100',
        text: 'text-red-700',
        border: 'border-red-300',
        dark: {
          bg: 'dark:bg-red-900/30',
          text: 'dark:text-red-400',
          border: 'dark:border-red-700',
        },
      },
      icon: XCircle,
      variant: 'default',
    },
    COMPLETED: {
      value: 'COMPLETED',
      label: 'enum.queueStatus.completed',
      color: {
        bg: 'bg-green-100',
        text: 'text-green-700',
        border: 'border-green-300',
        dark: {
          bg: 'dark:bg-green-900/30',
          text: 'dark:text-green-400',
          border: 'dark:border-green-700',
        },
      },
      icon: CheckCircle2,
      variant: 'default',
    },
  },

  ISSUE_TYPE: {
    BROKEN: {
      value: 'BROKEN',
      label: 'enum.issueType.broken',
      color: {
        bg: 'bg-red-100',
        text: 'text-red-700',
        border: 'border-red-300',
        dark: {
          bg: 'dark:bg-red-900/30',
          text: 'dark:text-red-400',
          border: 'dark:border-red-700',
        },
      },
      icon: AlertCircle,
      variant: 'default',
    },
    DAMAGED: {
      value: 'DAMAGED',
      label: 'enum.issueType.damaged',
      color: {
        bg: 'bg-orange-100',
        text: 'text-orange-700',
        border: 'border-orange-300',
        dark: {
          bg: 'dark:bg-orange-900/30',
          text: 'dark:text-orange-400',
          border: 'dark:border-orange-700',
        },
      },
      icon: AlertCircle,
      variant: 'default',
    },
    DIRTY: {
      value: 'DIRTY',
      label: 'enum.issueType.dirty',
      color: {
        bg: 'bg-yellow-100',
        text: 'text-yellow-700',
        border: 'border-yellow-300',
        dark: {
          bg: 'dark:bg-yellow-900/30',
          text: 'dark:text-yellow-400',
          border: 'dark:border-yellow-700',
        },
      },
      icon: AlertCircle,
      variant: 'default',
    },
    MISSING_PARTS: {
      value: 'MISSING_PARTS',
      label: 'enum.issueType.missingParts',
      color: {
        bg: 'bg-amber-100',
        text: 'text-amber-700',
        border: 'border-amber-300',
        dark: {
          bg: 'dark:bg-amber-900/30',
          text: 'dark:text-amber-400',
          border: 'dark:border-amber-700',
        },
      },
      icon: Package,
      variant: 'default',
    },
    UNSAFE: {
      value: 'UNSAFE',
      label: 'enum.issueType.unsafe',
      color: {
        bg: 'bg-red-100',
        text: 'text-red-700',
        border: 'border-red-300',
        dark: {
          bg: 'dark:bg-red-900/30',
          text: 'dark:text-red-400',
          border: 'dark:border-red-700',
        },
      },
      icon: AlertCircle,
      variant: 'default',
    },
    OTHER: {
      value: 'OTHER',
      label: 'enum.issueType.other',
      color: {
        bg: 'bg-gray-100',
        text: 'text-gray-700',
        border: 'border-gray-300',
        dark: {
          bg: 'dark:bg-gray-800/30',
          text: 'dark:text-gray-400',
          border: 'dark:border-gray-700',
        },
      },
      icon: FileText,
      variant: 'default',
    },
  },

  SEVERITY: {
    LOW: {
      value: 'LOW',
      label: 'enum.severity.low',
      color: {
        bg: 'bg-green-100',
        text: 'text-green-700',
        border: 'border-green-300',
        dark: {
          bg: 'dark:bg-green-900/30',
          text: 'dark:text-green-400',
          border: 'dark:border-green-700',
        },
      },
      icon: AlertCircle,
      variant: 'default',
    },
    MEDIUM: {
      value: 'MEDIUM',
      label: 'enum.severity.medium',
      color: {
        bg: 'bg-yellow-100',
        text: 'text-yellow-700',
        border: 'border-yellow-300',
        dark: {
          bg: 'dark:bg-yellow-900/30',
          text: 'dark:text-yellow-400',
          border: 'dark:border-yellow-700',
        },
      },
      icon: AlertCircle,
      variant: 'default',
    },
    HIGH: {
      value: 'HIGH',
      label: 'enum.severity.high',
      color: {
        bg: 'bg-orange-100',
        text: 'text-orange-700',
        border: 'border-orange-300',
        dark: {
          bg: 'dark:bg-orange-900/30',
          text: 'dark:text-orange-400',
          border: 'dark:border-orange-700',
        },
      },
      icon: AlertCircle,
      variant: 'default',
    },
    CRITICAL: {
      value: 'CRITICAL',
      label: 'enum.severity.critical',
      color: {
        bg: 'bg-red-100',
        text: 'text-red-700',
        border: 'border-red-300',
        dark: {
          bg: 'dark:bg-red-900/30',
          text: 'dark:text-red-400',
          border: 'dark:border-red-700',
        },
      },
      icon: AlertCircle,
      variant: 'default',
    },
  },

  REPORT_STATUS: {
    PENDING: {
      value: 'PENDING',
      label: 'enum.reportStatus.pending',
      color: {
        bg: 'bg-yellow-100',
        text: 'text-yellow-700',
        border: 'border-yellow-300',
        dark: {
          bg: 'dark:bg-yellow-900/30',
          text: 'dark:text-yellow-400',
          border: 'dark:border-yellow-700',
        },
      },
      icon: Clock,
      variant: 'default',
    },
    IN_PROGRESS: {
      value: 'IN_PROGRESS',
      label: 'enum.reportStatus.inProgress',
      color: {
        bg: 'bg-blue-100',
        text: 'text-blue-700',
        border: 'border-blue-300',
        dark: {
          bg: 'dark:bg-blue-900/30',
          text: 'dark:text-blue-400',
          border: 'dark:border-blue-700',
        },
      },
      icon: RotateCcw,
      variant: 'default',
    },
    RESOLVED: {
      value: 'RESOLVED',
      label: 'enum.reportStatus.resolved',
      color: {
        bg: 'bg-green-100',
        text: 'text-green-700',
        border: 'border-green-300',
        dark: {
          bg: 'dark:bg-green-900/30',
          text: 'dark:text-green-400',
          border: 'dark:border-green-700',
        },
      },
      icon: CheckCircle2,
      variant: 'default',
    },
    CLOSED: {
      value: 'CLOSED',
      label: 'enum.reportStatus.closed',
      color: {
        bg: 'bg-gray-100',
        text: 'text-gray-700',
        border: 'border-gray-300',
        dark: {
          bg: 'dark:bg-gray-800/30',
          text: 'dark:text-gray-400',
          border: 'dark:border-gray-700',
        },
      },
      icon: CheckCircle2,
      variant: 'default',
    },
    REJECTED: {
      value: 'REJECTED',
      label: 'enum.reportStatus.rejected',
      color: {
        bg: 'bg-red-100',
        text: 'text-red-700',
        border: 'border-red-300',
        dark: {
          bg: 'dark:bg-red-900/30',
          text: 'dark:text-red-400',
          border: 'dark:border-red-700',
        },
      },
      icon: XCircle,
      variant: 'default',
    },
  },

  CERTIFICATION_LEVEL: {
    BASIC: {
      value: 'BASIC',
      label: 'enum.certificationLevel.basic',
      color: {
        bg: 'bg-gray-100',
        text: 'text-gray-700',
        border: 'border-gray-300',
        dark: {
          bg: 'dark:bg-gray-800/30',
          text: 'dark:text-gray-400',
          border: 'dark:border-gray-700',
        },
      },
      icon: Award,
      variant: 'default',
    },
    INTERMEDIATE: {
      value: 'INTERMEDIATE',
      label: 'enum.certificationLevel.intermediate',
      color: {
        bg: 'bg-blue-100',
        text: 'text-blue-700',
        border: 'border-blue-300',
        dark: {
          bg: 'dark:bg-blue-900/30',
          text: 'dark:text-blue-400',
          border: 'dark:border-blue-700',
        },
      },
      icon: Award,
      variant: 'default',
    },
    ADVANCED: {
      value: 'ADVANCED',
      label: 'enum.certificationLevel.advanced',
      color: {
        bg: 'bg-orange-100',
        text: 'text-orange-700',
        border: 'border-orange-300',
        dark: {
          bg: 'dark:bg-orange-900/30',
          text: 'dark:text-orange-400',
          border: 'dark:border-orange-700',
        },
      },
      icon: Award,
      variant: 'default',
    },
    EXPERT: {
      value: 'EXPERT',
      label: 'enum.certificationLevel.expert',
      color: {
        bg: 'bg-gradient-to-r from-amber-100 via-yellow-100 to-amber-100',
        text: 'text-amber-700',
        border: 'border-amber-300',
        dark: {
          bg: 'dark:from-amber-900/30 dark:via-yellow-900/20 dark:to-amber-900/30',
          text: 'dark:text-amber-300',
          border: 'dark:border-amber-700',
        },
      },
      icon: Star,
      variant: 'gradient',
    },
  },

  VERIFICATION_STATUS: {
    PENDING: {
      value: 'PENDING',
      label: 'enum.verificationStatus.pending',
      color: {
        bg: 'bg-yellow-100',
        text: 'text-yellow-700',
        border: 'border-yellow-300',
        dark: {
          bg: 'dark:bg-yellow-900/30',
          text: 'dark:text-yellow-400',
          border: 'dark:border-yellow-700',
        },
      },
      icon: Clock,
      variant: 'default',
    },
    VERIFIED: {
      value: 'VERIFIED',
      label: 'enum.verificationStatus.verified',
      color: {
        bg: 'bg-green-100',
        text: 'text-green-700',
        border: 'border-green-300',
        dark: {
          bg: 'dark:bg-green-900/30',
          text: 'dark:text-green-400',
          border: 'dark:border-green-700',
        },
      },
      icon: CheckCircle2,
      variant: 'default',
    },
    REJECTED: {
      value: 'REJECTED',
      label: 'enum.verificationStatus.rejected',
      color: {
        bg: 'bg-red-100',
        text: 'text-red-700',
        border: 'border-red-300',
        dark: {
          bg: 'dark:bg-red-900/30',
          text: 'dark:text-red-400',
          border: 'dark:border-red-700',
        },
      },
      icon: XCircle,
      variant: 'default',
    },
    EXPIRED: {
      value: 'EXPIRED',
      label: 'enum.verificationStatus.expired',
      color: {
        bg: 'bg-gray-100',
        text: 'text-gray-700',
        border: 'border-gray-300',
        dark: {
          bg: 'dark:bg-gray-800/30',
          text: 'dark:text-gray-400',
          border: 'dark:border-gray-700',
        },
      },
      icon: Clock,
      variant: 'default',
    },
    SUSPENDED: {
      value: 'SUSPENDED',
      label: 'enum.verificationStatus.suspended',
      color: {
        bg: 'bg-orange-100',
        text: 'text-orange-700',
        border: 'border-orange-300',
        dark: {
          bg: 'dark:bg-orange-900/30',
          text: 'dark:text-orange-400',
          border: 'dark:border-orange-700',
        },
      },
      icon: PauseCircle,
      variant: 'default',
    },
  },

  DIFFICULTY: {
    BEGINNER: {
      value: 'BEGINNER',
      label: 'enum.difficulty.beginner',
      color: {
        bg: 'bg-green-100',
        text: 'text-green-700',
        border: 'border-green-300',
        dark: {
          bg: 'dark:bg-green-900/30',
          text: 'dark:text-green-400',
          border: 'dark:border-green-700',
        },
      },
      icon: Target,
      variant: 'default',
    },
    INTERMEDIATE: {
      value: 'INTERMEDIATE',
      label: 'enum.difficulty.intermediate',
      color: {
        bg: 'bg-yellow-100',
        text: 'text-yellow-700',
        border: 'border-yellow-300',
        dark: {
          bg: 'dark:bg-yellow-900/30',
          text: 'dark:text-yellow-400',
          border: 'dark:border-yellow-700',
        },
      },
      icon: TrendingUp,
      variant: 'default',
    },
    ADVANCED: {
      value: 'ADVANCED',
      label: 'enum.difficulty.advanced',
      color: {
        bg: 'bg-orange-100',
        text: 'text-orange-700',
        border: 'border-orange-300',
        dark: {
          bg: 'dark:bg-orange-900/30',
          text: 'dark:text-orange-400',
          border: 'dark:border-orange-700',
        },
      },
      icon: Zap,
      variant: 'default',
    },
    ALL_LEVELS: {
      value: 'ALL_LEVELS',
      label: 'enum.difficulty.allLevels',
      color: {
        bg: 'bg-blue-100',
        text: 'text-blue-700',
        border: 'border-blue-300',
        dark: {
          bg: 'dark:bg-blue-900/30',
          text: 'dark:text-blue-400',
          border: 'dark:border-blue-700',
        },
      },
      icon: Users,
      variant: 'default',
    },
    EXPERT: {
      value: 'EXPERT',
      label: 'enum.difficulty.expert',
      color: {
        bg: 'bg-red-100',
        text: 'text-red-700',
        border: 'border-red-300',
        dark: {
          bg: 'dark:bg-red-900/30',
          text: 'dark:text-red-400',
          border: 'dark:border-red-700',
        },
      },
      icon: Star,
      variant: 'default',
    },
  },

  GENDER: {
    MALE: {
      value: 'MALE',
      label: 'enum.gender.male',
      color: {
        bg: 'bg-blue-100',
        text: 'text-blue-700',
        border: 'border-blue-300',
        dark: {
          bg: 'dark:bg-blue-900/30',
          text: 'dark:text-blue-400',
          border: 'dark:border-blue-700',
        },
      },
      icon: User,
      variant: 'default',
    },
    FEMALE: {
      value: 'FEMALE',
      label: 'enum.gender.female',
      color: {
        bg: 'bg-pink-100',
        text: 'text-pink-700',
        border: 'border-pink-300',
        dark: {
          bg: 'dark:bg-pink-900/30',
          text: 'dark:text-pink-400',
          border: 'dark:border-pink-700',
        },
      },
      icon: User,
      variant: 'default',
    },
    OTHER: {
      value: 'OTHER',
      label: 'enum.gender.other',
      color: {
        bg: 'bg-gray-100',
        text: 'text-gray-700',
        border: 'border-gray-300',
        dark: {
          bg: 'dark:bg-gray-800/30',
          text: 'dark:text-gray-400',
          border: 'dark:border-gray-700',
        },
      },
      icon: User,
      variant: 'default',
    },
  },

  ACCESS_METHOD: {
    RFID: {
      value: 'RFID',
      label: 'enum.accessMethod.rfid',
      color: {
        bg: 'bg-blue-100',
        text: 'text-blue-700',
        border: 'border-blue-300',
        dark: {
          bg: 'dark:bg-blue-900/30',
          text: 'dark:text-blue-400',
          border: 'dark:border-blue-700',
        },
      },
      icon: CreditCard,
      variant: 'default',
    },
    QR_CODE: {
      value: 'QR_CODE',
      label: 'enum.accessMethod.qrCode',
      color: {
        bg: 'bg-purple-100',
        text: 'text-purple-700',
        border: 'border-purple-300',
        dark: {
          bg: 'dark:bg-purple-900/30',
          text: 'dark:text-purple-400',
          border: 'dark:border-purple-700',
        },
      },
      icon: QrCode,
      variant: 'default',
    },
    FACE_RECOGNITION: {
      value: 'FACE_RECOGNITION',
      label: 'enum.accessMethod.faceRecognition',
      color: {
        bg: 'bg-green-100',
        text: 'text-green-700',
        border: 'border-green-300',
        dark: {
          bg: 'dark:bg-green-900/30',
          text: 'dark:text-green-400',
          border: 'dark:border-green-700',
        },
      },
      icon: UserCheck,
      variant: 'default',
    },
    MANUAL: {
      value: 'MANUAL',
      label: 'enum.accessMethod.manual',
      color: {
        bg: 'bg-gray-100',
        text: 'text-gray-700',
        border: 'border-gray-300',
        dark: {
          bg: 'dark:bg-gray-800/30',
          text: 'dark:text-gray-400',
          border: 'dark:border-gray-700',
        },
      },
      icon: User,
      variant: 'default',
    },
    MOBILE_APP: {
      value: 'MOBILE_APP',
      label: 'enum.accessMethod.mobileApp',
      color: {
        bg: 'bg-indigo-100',
        text: 'text-indigo-700',
        border: 'border-indigo-300',
        dark: {
          bg: 'dark:bg-indigo-900/30',
          text: 'dark:text-indigo-400',
          border: 'dark:border-indigo-700',
        },
      },
      icon: Smartphone,
      variant: 'default',
    },
  },
};

// Helper function to get enum config
export function getEnumConfig(type: EnumType, value: string): EnumConfig | null {
  const configs = enumConfigs[type];
  if (!configs) return null;
  return configs[value] || null;
}

// Helper function to get all values for an enum type
export function getEnumValues(type: EnumType): string[] {
  const configs = enumConfigs[type];
  if (!configs) return [];
  return Object.keys(configs);
}

// Helper function to get background color classes for icon containers
export function getEnumBackgroundColor(type: EnumType, value: string): string {
  const config = getEnumConfig(type, value);
  if (!config) {
    return 'bg-gray-50 dark:bg-gray-800';
  }
  return `${config.color.bg} ${config.color.dark?.bg || ''}`;
}

