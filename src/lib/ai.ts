import { SYSTEM_PROMPT } from './prompts';

export interface ChatPayloadMessage {
  role: string;
  content: string;
}

/**
 * Call Google Gemini API with SSE streaming and multimodal image support
 */
export async function callGeminiStream(
  messages: ChatPayloadMessage[],
  apiKey: string,
  imageData?: { mimeType: string; base64: string },
  modelName: string = 'gemini-1.5-flash'
): Promise<Response> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?alt=sse&key=${apiKey}`;

  // Map messages to Gemini format
  const contents = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  // Attach image to the last user message if provided
  if (imageData && contents.length > 0) {
    for (let i = contents.length - 1; i >= 0; i--) {
      if (contents[i].role === 'user') {
        contents[i].parts.push({
          inlineData: {
            mimeType: imageData.mimeType,
            data: imageData.base64,
          },
        } as any);
        break;
      }
    }
  }

  const payload = {
    contents,
    systemInstruction: {
      parts: [{ text: SYSTEM_PROMPT }],
    },
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google Gemini API Error (${response.status}): ${errText}`);
  }

  // Transform Gemini SSE stream into plain text chunks
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const transformStream = new TransformStream({
    transform(chunk, controller) {
      const text = decoder.decode(chunk);
      const lines = text.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          try {
            const data = JSON.parse(trimmed.slice(6));
            const partText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            if (partText) {
              // Clean out think tags if any
              const clean = partText.replace(/<think>[\s\S]*?<\/think>/g, '').replace(/<\/?think>/g, '');
              if (clean) {
                controller.enqueue(encoder.encode(clean));
              }
            }
          } catch {
            // Ignore incomplete JSON chunks
          }
        }
      }
    },
  });

  return new Response(response.body?.pipeThrough(transformStream), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    },
  });
}

/**
 * Call Groq API with SSE streaming
 */
export async function callGroqStream(
  messages: ChatPayloadMessage[],
  apiKey: string,
  modelName: string = 'llama-3.1-8b-instant'
): Promise<Response> {
  const url = 'https://api.groq.com/openai/v1/chat/completions';

  const payload = {
    model: modelName,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
    temperature: 0.7,
    max_tokens: 1024,
    stream: true,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq API Error (${response.status}): ${errText}`);
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const transformStream = new TransformStream({
    transform(chunk, controller) {
      const text = decoder.decode(chunk);
      const lines = text.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;
        if (trimmed.startsWith('data: ')) {
          try {
            const json = JSON.parse(trimmed.slice(6));
            const content = json.choices?.[0]?.delta?.content || '';
            if (content) {
              const clean = content.replace(/<think>[\s\S]*?<\/think>/g, '').replace(/<\/?think>/g, '');
              if (clean) {
                controller.enqueue(encoder.encode(clean));
              }
            }
          } catch {
            // Ignore incomplete JSON chunks
          }
        }
      }
    },
  });

  return new Response(response.body?.pipeThrough(transformStream), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    },
  });
}
