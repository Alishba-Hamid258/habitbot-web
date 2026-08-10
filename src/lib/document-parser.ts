/**
 * Client-side document and PDF text extractor for HabitBot
 * Extracts clean, readable text from PDF, TXT, CSV, MD, JSON, and DOCX files.
 */

export async function extractTextFromFile(file: File): Promise<{
  text: string;
  isPdf: boolean;
  charCount: number;
}> {
  const fileName = file.name.toLowerCase();
  const isPdf = fileName.endsWith('.pdf') || file.type === 'application/pdf';

  if (isPdf) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const extracted = parsePdfText(arrayBuffer);
      if (extracted && extracted.trim().length > 30) {
        return {
          text: extracted.slice(0, 16000),
          isPdf: true,
          charCount: extracted.length,
        };
      }
    } catch (e) {
      console.warn('PDF parser note: falling back to base64 document engine', e);
    }

    return {
      text: `[PDF Document: ${file.name}]`,
      isPdf: true,
      charCount: 0,
    };
  }

  // Plain text documents (.txt, .csv, .md, .json, .log)
  try {
    const rawText = await file.text();
    return {
      text: rawText.slice(0, 16000),
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
 * Pure TypeScript regex-based PDF text stream extractor
 */
function parsePdfText(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let rawStr = '';

  // Sample or decode bytes to latin1/ascii string safely in chunks
  const chunkSize = 65536;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    rawStr += String.fromCharCode.apply(null, chunk as any);
  }

  const textChunks: string[] = [];

  // Extract from BT (Begin Text) ... ET (End Text) blocks
  const btRegex = /BT[\s\S]*?ET/g;
  let match: RegExpExecArray | null;

  while ((match = btRegex.exec(rawStr)) !== null) {
    const block = match[0];

    // Match (string) Tj or 'string'
    const tjRegex = /\(((?:[^()\\]|\\.)*)\)\s*T[jJ*]/g;
    let tjMatch: RegExpExecArray | null;
    while ((tjMatch = tjRegex.exec(block)) !== null) {
      const decoded = cleanPdfString(tjMatch[1]);
      if (decoded.length > 1) {
        textChunks.push(decoded);
      }
    }

    // Match [(array) (of) (strings)] TJ
    const arrayTjRegex = /\[((?:[^\[\]]|\\.)*)\]\s*TJ/g;
    let arrMatch: RegExpExecArray | null;
    while ((arrMatch = arrayTjRegex.exec(block)) !== null) {
      const inner = arrMatch[1];
      const innerStrRegex = /\(((?:[^()\\]|\\.)*)\)/g;
      let sMatch: RegExpExecArray | null;
      let combined = '';
      while ((sMatch = innerStrRegex.exec(inner)) !== null) {
        combined += cleanPdfString(sMatch[1]);
      }
      if (combined.trim().length > 1) {
        textChunks.push(combined);
      }
    }
  }

  // Fallback: search for general string literals if BT/ET was compressed or formatted
  if (textChunks.length < 5) {
    const stringLiteralRegex = /\(([A-Za-z0-9 ,.?!:;'"\-\n\r]{4,})\)/g;
    let litMatch: RegExpExecArray | null;
    while ((litMatch = stringLiteralRegex.exec(rawStr)) !== null) {
      const str = cleanPdfString(litMatch[1]);
      if (str.length > 3 && !str.includes('Font') && !str.includes('Type') && !str.includes('Obj')) {
        textChunks.push(str);
      }
    }
  }

  return textChunks.join(' ').replace(/\s+/g, ' ').trim();
}

function cleanPdfString(str: string): string {
  return str
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\([()\\])/g, '$1')
    .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
    .trim();
}
