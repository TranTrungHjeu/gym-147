/**
 * Error Handler Service
 * Maps error codes to user-friendly messages and modal types
 */

export enum ErrorCode {
  // Authentication Errors
  ACCOUNT_DELETED = 'ACCOUNT_DELETED',
  ACCOUNT_INACTIVE = 'ACCOUNT_INACTIVE',
  ACCOUNT_SUSPENDED = 'ACCOUNT_SUSPENDED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // Registration Errors
  EMAIL_EXISTS = 'EMAIL_EXISTS',
  PHONE_EXISTS = 'PHONE_EXISTS',
  WEAK_PASSWORD = 'WEAK_PASSWORD',
  MEMBER_SERVICE_UNAVAILABLE = 'MEMBER_SERVICE_UNAVAILABLE',
  REGISTRATION_FAILED = 'REGISTRATION_FAILED',

  // Booking Errors
  BOOKING_CAPACITY_FULL = 'BOOKING_CAPACITY_FULL',
  BOOKING_ALREADY_EXISTS = 'BOOKING_ALREADY_EXISTS',
  SCHEDULE_NOT_FOUND = 'SCHEDULE_NOT_FOUND',
  SCHEDULE_EXPIRED = 'SCHEDULE_EXPIRED',
  MEMBER_NOT_FOUND = 'MEMBER_NOT_FOUND',
  SUBSCRIPTION_EXPIRED = 'SUBSCRIPTION_EXPIRED',
  BOOKING_PAYMENT_FAILED = 'BOOKING_PAYMENT_FAILED',
  BOOKING_SERVICE_UNAVAILABLE = 'BOOKING_SERVICE_UNAVAILABLE',

  // Payment Errors
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PAYMENT_TIMEOUT = 'PAYMENT_TIMEOUT',
  PAYMENT_INVALID_AMOUNT = 'PAYMENT_INVALID_AMOUNT',
  PAYMENT_INVALID_SIGNATURE = 'PAYMENT_INVALID_SIGNATURE',
  PAYMENT_DUPLICATE = 'PAYMENT_DUPLICATE',
  SUBSCRIPTION_CREATION_FAILED = 'SUBSCRIPTION_CREATION_FAILED',
  DISCOUNT_CODE_INVALID = 'DISCOUNT_CODE_INVALID',
  DISCOUNT_CODE_EXPIRED = 'DISCOUNT_CODE_EXPIRED',
  DISCOUNT_CODE_LIMIT_REACHED = 'DISCOUNT_CODE_LIMIT_REACHED',
  BILLING_SERVICE_UNAVAILABLE = 'BILLING_SERVICE_UNAVAILABLE',

  // Service Errors
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR = 'DATABASE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',

  // Generic
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface ErrorDetails {
  code: ErrorCode;
  message: string;
  title: string;
  variant: 'error' | 'warning' | 'info';
  showContactSupport?: boolean;
  retryable?: boolean;
}

class ErrorHandlerService {
  private errorMap: Map<ErrorCode, ErrorDetails> = new Map();

  constructor() {
    this.initializeErrorMap();
  }

  private initializeErrorMap() {
    // Authentication Errors
    this.errorMap.set(ErrorCode.ACCOUNT_DELETED, {
      code: ErrorCode.ACCOUNT_DELETED,
      title: 'Tài khoản đã bị xóa',
      message: 'Tài khoản của bạn đã bị xóa. Vui lòng liên hệ quản trị viên để được hỗ trợ.',
      variant: 'error',
      showContactSupport: true,
    });

    this.errorMap.set(ErrorCode.ACCOUNT_INACTIVE, {
      code: ErrorCode.ACCOUNT_INACTIVE,
      title: 'Tài khoản đã bị vô hiệu hóa',
      message: 'Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên để được kích hoạt lại.',
      variant: 'warning',
      showContactSupport: true,
    });

    this.errorMap.set(ErrorCode.INVALID_CREDENTIALS, {
      code: ErrorCode.INVALID_CREDENTIALS,
      title: 'Đăng nhập thất bại',
      message: 'Email/phone hoặc mật khẩu không đúng. Vui lòng thử lại.',
      variant: 'error',
      retryable: true,
    });

    this.errorMap.set(ErrorCode.SESSION_EXPIRED, {
      code: ErrorCode.SESSION_EXPIRED,
      title: 'Phiên đăng nhập đã hết hạn',
      message: 'Phiên đăng nhập của bạn đã hết hạn. Vui lòng đăng nhập lại.',
      variant: 'warning',
      retryable: true,
    });

    this.errorMap.set(ErrorCode.RATE_LIMIT_EXCEEDED, {
      code: ErrorCode.RATE_LIMIT_EXCEEDED,
      title: 'Quá nhiều yêu cầu',
      message: 'Bạn đã thực hiện quá nhiều yêu cầu. Vui lòng đợi vài phút trước khi thử lại.',
      variant: 'warning',
      retryable: true,
    });

    // Registration Errors
    this.errorMap.set(ErrorCode.EMAIL_EXISTS, {
      code: ErrorCode.EMAIL_EXISTS,
      title: 'Email đã tồn tại',
      message: 'Email này đã được sử dụng. Vui lòng sử dụng email khác hoặc đăng nhập.',
      variant: 'warning',
    });

    this.errorMap.set(ErrorCode.PHONE_EXISTS, {
      code: ErrorCode.PHONE_EXISTS,
      title: 'Số điện thoại đã tồn tại',
      message: 'Số điện thoại này đã được sử dụng. Vui lòng sử dụng số điện thoại khác hoặc đăng nhập.',
      variant: 'warning',
    });

    this.errorMap.set(ErrorCode.MEMBER_SERVICE_UNAVAILABLE, {
      code: ErrorCode.MEMBER_SERVICE_UNAVAILABLE,
      title: 'Dịch vụ tạm thời không khả dụng',
      message: 'Dịch vụ đăng ký hiện đang không khả dụng. Vui lòng thử lại sau vài phút.',
      variant: 'warning',
      retryable: true,
      showContactSupport: true,
    });

    // Booking Errors
    this.errorMap.set(ErrorCode.BOOKING_CAPACITY_FULL, {
      code: ErrorCode.BOOKING_CAPACITY_FULL,
      title: 'Lớp học đã đầy',
      message: 'Lớp học đã đạt sức chứa tối đa. Bạn có thể tham gia danh sách chờ hoặc chọn lớp khác.',
      variant: 'warning',
    });

    this.errorMap.set(ErrorCode.BOOKING_ALREADY_EXISTS, {
      code: ErrorCode.BOOKING_ALREADY_EXISTS,
      title: 'Đã đặt lớp này',
      message: 'Bạn đã đặt lớp học này rồi. Vui lòng kiểm tra lại lịch đặt của bạn.',
      variant: 'info',
    });

    this.errorMap.set(ErrorCode.SCHEDULE_NOT_FOUND, {
      code: ErrorCode.SCHEDULE_NOT_FOUND,
      title: 'Lớp học không tồn tại',
      message: 'Lớp học bạn đang cố đặt không còn tồn tại hoặc đã bị xóa.',
      variant: 'error',
    });

    this.errorMap.set(ErrorCode.SUBSCRIPTION_EXPIRED, {
      code: ErrorCode.SUBSCRIPTION_EXPIRED,
      title: 'Gói tập đã hết hạn',
      message: 'Gói tập của bạn đã hết hạn. Vui lòng gia hạn gói tập để tiếp tục đặt lớp.',
      variant: 'warning',
    });

    // Payment Errors
    this.errorMap.set(ErrorCode.PAYMENT_FAILED, {
      code: ErrorCode.PAYMENT_FAILED,
      title: 'Thanh toán thất bại',
      message: 'Không thể xử lý thanh toán. Vui lòng kiểm tra lại thông tin thanh toán và thử lại.',
      variant: 'error',
      retryable: true,
    });

    this.errorMap.set(ErrorCode.PAYMENT_TIMEOUT, {
      code: ErrorCode.PAYMENT_TIMEOUT,
      title: 'Thanh toán quá thời gian',
      message: 'Thanh toán đã vượt quá thời gian cho phép. Vui lòng thử lại. Nếu đã thanh toán thành công, vui lòng liên hệ hỗ trợ.',
      variant: 'warning',
      retryable: true,
      showContactSupport: true,
    });

    this.errorMap.set(ErrorCode.SUBSCRIPTION_CREATION_FAILED, {
      code: ErrorCode.SUBSCRIPTION_CREATION_FAILED,
      title: 'Tạo gói tập thất bại',
      message: 'Thanh toán thành công nhưng không thể tạo gói tập. Vui lòng liên hệ hỗ trợ ngay để được xử lý.',
      variant: 'error',
      showContactSupport: true,
    });

    // Service Errors
    this.errorMap.set(ErrorCode.SERVICE_UNAVAILABLE, {
      code: ErrorCode.SERVICE_UNAVAILABLE,
      title: 'Dịch vụ tạm thời không khả dụng',
      message: 'Dịch vụ hiện đang không khả dụng. Vui lòng thử lại sau vài phút.',
      variant: 'warning',
      retryable: true,
      showContactSupport: true,
    });

    this.errorMap.set(ErrorCode.DATABASE_ERROR, {
      code: ErrorCode.DATABASE_ERROR,
      title: 'Lỗi cơ sở dữ liệu',
      message: 'Đã xảy ra lỗi khi truy cập cơ sở dữ liệu. Vui lòng thử lại sau.',
      variant: 'error',
      retryable: true,
      showContactSupport: true,
    });

    this.errorMap.set(ErrorCode.NETWORK_ERROR, {
      code: ErrorCode.NETWORK_ERROR,
      title: 'Lỗi kết nối mạng',
      message: 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng và thử lại.',
      variant: 'error',
      retryable: true,
    });

    this.errorMap.set(ErrorCode.TIMEOUT_ERROR, {
      code: ErrorCode.TIMEOUT_ERROR,
      title: 'Yêu cầu quá thời gian',
      message: 'Yêu cầu đã vượt quá thời gian cho phép. Vui lòng thử lại.',
      variant: 'warning',
      retryable: true,
    });

    // Generic
    this.errorMap.set(ErrorCode.UNKNOWN_ERROR, {
      code: ErrorCode.UNKNOWN_ERROR,
      title: 'Đã xảy ra lỗi',
      message: 'Đã xảy ra lỗi không xác định. Vui lòng thử lại hoặc liên hệ hỗ trợ.',
      variant: 'error',
      showContactSupport: true,
    });
  }

  /**
   * Get error details by error code
   */
  getErrorDetails(code: ErrorCode | string): ErrorDetails {
    const errorCode = Object.values(ErrorCode).includes(code as ErrorCode)
      ? (code as ErrorCode)
      : ErrorCode.UNKNOWN_ERROR;

    return this.errorMap.get(errorCode) || this.errorMap.get(ErrorCode.UNKNOWN_ERROR)!;
  }

  /**
   * Extract error code from API response
   */
  extractErrorCode(error: any): ErrorCode {
    // Check if error has errorCode property
    if (error?.errorCode && Object.values(ErrorCode).includes(error.errorCode)) {
      return error.errorCode as ErrorCode;
    }

    // Check error message for common patterns
    const message = error?.message || error?.error || String(error).toLowerCase();

    if (message.includes('account deleted') || message.includes('tài khoản đã bị xóa')) {
      return ErrorCode.ACCOUNT_DELETED;
    }
    if (message.includes('account inactive') || message.includes('vô hiệu hóa')) {
      return ErrorCode.ACCOUNT_INACTIVE;
    }
    if (message.includes('invalid credentials') || message.includes('sai mật khẩu')) {
      return ErrorCode.INVALID_CREDENTIALS;
    }
    if (message.includes('session expired') || message.includes('hết hạn')) {
      return ErrorCode.SESSION_EXPIRED;
    }
    if (message.includes('rate limit') || message.includes('quá nhiều')) {
      return ErrorCode.RATE_LIMIT_EXCEEDED;
    }
    if (message.includes('email exists') || message.includes('email đã tồn tại')) {
      return ErrorCode.EMAIL_EXISTS;
    }
    if (message.includes('capacity full') || message.includes('đã đầy')) {
      return ErrorCode.BOOKING_CAPACITY_FULL;
    }
    if (message.includes('payment failed') || message.includes('thanh toán thất bại')) {
      return ErrorCode.PAYMENT_FAILED;
    }
    if (message.includes('service unavailable') || message.includes('không khả dụng')) {
      return ErrorCode.SERVICE_UNAVAILABLE;
    }
    if (message.includes('timeout') || message.includes('quá thời gian')) {
      return ErrorCode.TIMEOUT_ERROR;
    }
    if (message.includes('network') || message.includes('kết nối')) {
      return ErrorCode.NETWORK_ERROR;
    }

    return ErrorCode.UNKNOWN_ERROR;
  }

  /**
   * Check if error is retryable
   */
  isRetryable(error: ErrorCode | string): boolean {
    const details = this.getErrorDetails(error);
    return details.retryable || false;
  }
}

export const errorHandlerService = new ErrorHandlerService();
export default errorHandlerService;

