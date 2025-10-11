declare global {
  interface Window {
    showToast: (toast: {
      type: 'error' | 'success' | 'warning' | 'info';
      message: string;
      duration?: number;
      countdown?: number;
    }) => void;
  }
}

export {};
