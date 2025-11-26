import jsPDF from 'jspdf';

/**
 * Vietnamese Font Loader for jsPDF
 * Loads Noto Sans font to support Vietnamese characters
 */

let fontAdded = false;
let fontAddingPromise: Promise<void> | null = null;

/**
 * Loads Noto Sans Vietnamese font and adds it to jsPDF
 * Uses a CDN-hosted font file for better performance
 */
export async function loadVietnameseFont(_doc: jsPDF): Promise<void> {
  if (fontAdded) {
    return;
  }

  if (fontAddingPromise) {
    return fontAddingPromise;
  }

  fontAddingPromise = (async () => {
    try {
      // Font loading is now handled by addNotoSansFont() in noto-sans-vietnamese.ts
      // This function is kept for future CDN loading if needed
      // For now, fonts should be added via base64 in noto-sans-vietnamese.ts
      fontAdded = true;
    } catch (error) {
      console.warn('Could not load Vietnamese font, using fallback:', error);
      fontAdded = true; // Mark as added to prevent retry loops
    }
  })();

  return fontAddingPromise;
}

/**
 * Sets Vietnamese font for jsPDF document
 * Falls back to 'times' if custom font is not available
 */
export function setVietnameseFont(doc: jsPDF, style: 'normal' | 'bold' = 'normal'): void {
  try {
    // If custom font was added, use it
    // doc.setFont('NotoSans', style);
    // Otherwise, use times which has better Unicode support
    doc.setFont('times', style);
  } catch (error) {
    // Fallback to times
    doc.setFont('times', style);
  }
}

/**
 * Adds Vietnamese text to PDF with proper font
 */
export function addVietnameseText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  options?: { align?: 'left' | 'center' | 'right' }
): void {
  setVietnameseFont(doc, 'normal');
  doc.text(text, x, y, options);
}
