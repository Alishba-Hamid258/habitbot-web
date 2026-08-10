import { NextResponse } from 'next/server';
import { SYSTEM_PROMPT } from '@/lib/prompts';
import { isOnTopic } from '@/lib/topic-guard';

export async function POST(req: Request) {
  try {
    const { messages, user_id } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
    }

    const lastMessage = messages[messages.length - 1];
    const userQuery = typeof lastMessage.content === 'string' ? lastMessage.content : '';

    // 1. Topic Guardrail Check
    if (!isOnTopic(userQuery)) {
      const redirectText = "I'm **HabitBot**, your specialized AI habit and high-performance coach! 🎯\n\nI can help you build atomic habits, beat procrastination, optimize morning/evening routines, and design daily productivity systems. How can I help you level up your daily routine today?";
      return new Response(redirectText, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    const groqKey = process.env.GROQ_API_KEY;

    // 2. Fallback if no API key is set yet
    if (!groqKey) {
      const fallbackText = "🤖 **HabitBot AI Coach Connected!**\n\nTo enable real-time LLM streaming responses, please add your `GROQ_API_KEY` in `.env.local`.\n\n*Atomic Habits Tip*: Focus on small 1% improvements every single day. Consistency beats intensity!";
      return new Response(fallbackText, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    // 3. Call Groq API with Streaming
    const payload = {
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages.map((m: { role: string; content: string }) => ({
          role: m.role,
          content: m.content,
        })),
      ],
      temperature: 0.7,
      max_tokens: 1024,
      stream: true,
    };

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${groqKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      return NextResponse.json({ error: `Groq API Error: ${errText}` }, { status: groqRes.status });
    }

    // 4. Transform Groq SSE stream and remove <think> tags on the fly
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
                // Filter out think tags
                const clean = content.replace(/<think>[\s\S]*?<\/think>/g, '').replace(/<\/?think>/g, '');
                if (clean) {
                  controller.enqueue(encoder.encode(clean));
                }
              }
            } catch {
              // Ignore partial JSON chunks
            }
          }
        }
      },
    });

    return new Response(groqRes.body?.pipeThrough(transformStream), {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
