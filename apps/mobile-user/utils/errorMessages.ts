import { useTranslation } from 'react-i18next';
import { networkManager } from './network';

/**
 * Error message utility for providing user-friendly, actionable error messages
 */

export enum ErrorType {
  NETWORK = 'NETWORK',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  NOT_FOUND = 'NOT_FOUND',
  SERVER_ERROR = 'SERVER_ERROR',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN = 'UNKNOWN',
}

export interface ErrorMessage {
  title: string;
  message: string;
  suggestion?: string;
  action?: string;
  type: ErrorType;
}

class ErrorMessageManager {
  /**
   * Parse error and return user-friendly message
   */
  parseError(error: any): ErrorMessage {
    // Check if it's a network error
    if (networkManager.isNetworkError(error)) {
      return {
        type: ErrorType.NETWORK,
        title: 'Lỗi kết nối mạng',
        message: networkManager.getNetworkErrorMessage(error),
        suggestion: 'Vui lòng kiểm tra kết nối internet và thử lại.',
        action: 'Thử lại',
      };
    }

    // Check HTTP status codes
    const status = error?.response?.status || error?.status;

    if (status === 401) {
      return {
        type: ErrorType.AUTHENTICATION,
        title: 'Xác thực thất bại',
        message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
        suggestion: 'Vui lòng đăng nhập lại để tiếp tục sử dụng.',
        action: 'Đăng nhập',
      };
    }

    if (status === 403) {
      return {
        type: ErrorType.AUTHORIZATION,
        title: 'Không có quyền truy cập',
        message: 'Bạn không có quyền thực hiện thao tác này.',
        suggestion: 'Vui lòng liên hệ quản trị viên nếu bạn cần quyền truy cập.',
      };
    }

    if (status === 404) {
      return {
        type: ErrorType.NOT_FOUND,
        title: 'Không tìm thấy',
        message: 'Không tìm thấy dữ liệu bạn yêu cầu.',
        suggestion: 'Vui lòng kiểm tra lại thông tin và thử lại.',
        action: 'Thử lại',
      };
    }

    if (status >= 500) {
      return {
        type: ErrorType.SERVER_ERROR,
        title: 'Lỗi máy chủ',
        message: 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.',
        suggestion: 'Vui lòng đợi một chút và thử lại.',
        action: 'Thử lại',
      };
    }

    if (status === 422 || status === 400) {
      const errorMessage = error?.response?.data?.message || error?.message;
      return {
        type: ErrorType.VALIDATION,
        title: 'Dữ liệu không hợp lệ',
        message: errorMessage || 'Dữ liệu bạn nhập không hợp lệ.',
        suggestion: 'Vui lòng kiểm tra lại thông tin và thử lại.',
      };
    }

    // Check for timeout
    if (
      error?.message?.includes('timeout') ||
      error?.code === 'ETIMEDOUT'
    ) {
      return {
        type: ErrorType.TIMEOUT,
        title: 'Hết thời gian chờ',
        message: 'Yêu cầu mất quá nhiều thời gian. Vui lòng thử lại.',
        suggestion: 'Vui lòng kiểm tra kết nối mạng và thử lại.',
        action: 'Thử lại',
      };
    }

    // Default error
    const errorMessage = error?.response?.data?.message || error?.message || 'Đã xảy ra lỗi';
    
    return {
      type: ErrorType.UNKNOWN,
      title: 'Đã xảy ra lỗi',
      message: errorMessage,
      suggestion: 'Vui lòng thử lại sau.',
      action: 'Thử lại',
    };
  }

  /**
   * Get localized error message
   */
  getLocalizedError(error: any, t: (key: string, options?: any) => string): ErrorMessage {
    const parsed = this.parseError(error);
    
    // Try to get localized messages
    const localizedTitle = t(`errors.${parsed.type.toLowerCase()}.title`, {
      defaultValue: parsed.title,
    });
    
    const localizedMessage = t(`errors.${parsed.type.toLowerCase()}.message`, {
      defaultValue: parsed.message,
    });
    
    const localizedSuggestion = parsed.suggestion
      ? t(`errors.${parsed.type.toLowerCase()}.suggestion`, {
          defaultValue: parsed.suggestion,
        })
      : undefined;

    return {
      ...parsed,
      title: localizedTitle,
      message: localizedMessage,
      suggestion: localizedSuggestion,
    };
  }
}

export const errorMessageManager = new ErrorMessageManager();

/**
 * Hook for error messages
 */
export const useErrorMessage = () => {
  const { t } = useTranslation();

  const getErrorMessage = (error: any): ErrorMessage => {
    return errorMessageManager.getLocalizedError(error, t);
  };

  const parseError = (error: any): ErrorMessage => {
    return errorMessageManager.parseError(error);
  };

  return {
    getErrorMessage,
    parseError,
  };
};

