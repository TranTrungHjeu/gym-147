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

// Declare module for video files
declare module '*.mp4' {
  const src: string;
  export default src;
}

declare module '*.webm' {
  const src: string;
  export default src;
}

declare module '*.ogg' {
  const src: string;
  export default src;
}

// Declare module for image files
declare module '*.jpg' {
  const src: string;
  export default src;
}

declare module '*.jpeg' {
  const src: string;
  export default src;
}

declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.gif' {
  const src: string;
  export default src;
}

declare module '*.svg' {
  const src: string;
  export default src;
}

export {};
