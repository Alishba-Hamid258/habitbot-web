/**
 * Universal High-Fidelity Document & PDF Text Extractor for HabitBot
 * Powered by Mozilla PDF.js engine via unpdf for complete extraction of stories,
 * paragraphs, handouts, and coaching exercises, plus in-browser OCR for images.
 */

export async function extractTextFromFile(file: File): Promise<{
  text: string;
  isPdf: boolean;
  charCount: number;
  totalPages?: number;
}> {
  const fileName = file.name.toLowerCase();
  const isPdf = fileName.endsWith('.pdf') || file.type === 'application/pdf';

  if (isPdf) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const { extractText } = await import('unpdf');
      const result = await extractText(new Uint8Array(arrayBuffer), { mergePages: true });

      const rawText = Array.isArray(result.text) ? result.text.join('\n\n') : (result.text || '');
      const cleanText = rawText.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

      if (cleanText.length > 20) {
        return {
          text: cleanText.slice(0, 32000), // Provide up to 32k characters for deep document context
          isPdf: true,
          charCount: cleanText.length,
          totalPages: result.totalPages || 1,
        };
      }
    } catch (e) {
      console.warn('unpdf parser notice:', e);
    }

    return {
      text: `[PDF Document: ${file.name}]`,
      isPdf: true,
      charCount: 0,
    };
  }

  // Plain text document formats (.txt, .csv, .md, .json, .log)
  try {
    const rawText = await file.text();
    return {
      text: rawText.slice(0, 32000),
      isPdf: false,
      charCount: rawText.length,
    };
  } catch (err) {
    return {
      text: `[Document: ${file.name}]`,
      isPdf: false,
      charCount: 0,
    };
  }
}

/**
 * In-browser OCR text recognition for images (extracts quotes, schedule charts, text posters)
 */
export async function extractTextFromImage(file: File): Promise<string> {
  try {
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('eng');
    const ret = await worker.recognize(file);
    await worker.terminate();
    const text = ret.data?.text?.trim() || '';
    return text;
  } catch (err) {
    console.warn('Image OCR notice (non-fatal):', err);
    return '';
  }
}
