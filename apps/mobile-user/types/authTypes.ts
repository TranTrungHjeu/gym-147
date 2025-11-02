export interface User {
  // Identity Service fields
  id: string;
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'TRAINER' | 'MEMBER';
  isActive: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;

  // Member Service fields
  membershipNumber?: string;
  dateOfBirth?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  address?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  height?: number; // in cm
  weight?: number; // in kg
  bodyFatPercent?: number;
  fitnessGoals?: string[]; // Array of goals
  medicalConditions?: string[];
  allergies?: string[];
  membershipStatus?:
    | 'ACTIVE'
    | 'EXPIRED'
    | 'SUSPENDED'
    | 'CANCELLED'
    | 'PENDING';
  membershipType?: 'BASIC' | 'PREMIUM' | 'VIP' | 'STUDENT';
  joinedAt?: string;
  expiresAt?: string;
  profilePhoto?: string;

  // Computed fields
  name?: string; // firstName + lastName
  fullName?: string; // firstName + lastName

  // Timestamps
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  identifier: string; // Can be email or phone
  password: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface ForgotPasswordData {
  email: string;
}

export interface ResetPasswordData {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface AuthContextType {
  // State
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  hasMember: boolean | null; // null = not checked yet, true = has member, false = no member
  member: { id: string } | null; // Store member.id for easy access (member_id from member service)

  // Actions
  login: (credentials: LoginCredentials) => Promise<{
    hasMember: boolean;
    user: any;
    accessToken: string;
    refreshToken?: string;
    registrationStatus?: {
      hasSubscription: boolean;
      hasCompletedProfile: boolean;
    };
  }>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (data: ForgotPasswordData) => Promise<void>;
  resetPassword: (data: ResetPasswordData) => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  setTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  loadMemberProfile: () => Promise<void>; // Load member profile and store member.id
  checkRegistrationStatus: () => Promise<{
    hasMember: boolean;
    registrationStatus: {
      hasSubscription: boolean;
      hasCompletedProfile: boolean;
    };
  }>;
  clearError: () => void;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  message?: string;
  errors?: ValidationError[];
}
