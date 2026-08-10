import { NextResponse } from 'next/server';
import { isOnTopic } from '@/lib/topic-guard';
import { callGeminiStream, callGroqStream } from '@/lib/ai';

export async function POST(req: Request) {
  try {
    const { messages, provider, image, attachment } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
    }

    const lastMessage = messages[messages.length - 1];
    const userQuery = typeof lastMessage.content === 'string' ? lastMessage.content : '';
    const mediaPayload = attachment || image;

    // 1. Topic Guardrail Check
    if (!isOnTopic(userQuery) && !mediaPayload) {
      const redirectText = "I'm **HabitBot**, your specialized AI habit and high-performance coach! 🎯\n\nI can help you build atomic habits, beat procrastination, optimize morning/evening routines, and design daily productivity systems. How can I help you level up your daily routine today?";
      return new Response(redirectText, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    const groqKey = process.env.GROQ_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    // 2. Multimodal File/Image (Images, PDFs) or Explicit Gemini Request -> Route to Google Gemini API
    if ((mediaPayload || provider === 'gemini') && geminiKey) {
      try {
        return await callGeminiStream(messages, geminiKey, mediaPayload, 'gemini-1.5-flash');
      } catch (geminiErr: any) {
        console.error('Gemini error, attempting Groq fallback if text-only:', geminiErr);
        if (!mediaPayload && groqKey) {
          return await callGroqStream(messages, groqKey);
        }
        return NextResponse.json({ error: geminiErr.message }, { status: 500 });
      }
    }

    // 3. Fast Streaming with Groq API (for text messages)
    if (groqKey && provider !== 'gemini') {
      try {
        return await callGroqStream(messages, groqKey);
      } catch (groqErr: any) {
        console.error('Groq error, attempting Gemini fallback:', groqErr);
        if (geminiKey) {
          return await callGeminiStream(messages, geminiKey, mediaPayload, 'gemini-1.5-flash');
        }
        return NextResponse.json({ error: groqErr.message }, { status: 500 });
      }
    }

    // 4. If only Gemini key is configured
    if (geminiKey) {
      return await callGeminiStream(messages, geminiKey, mediaPayload, 'gemini-1.5-flash');
    }

    // 5. Fallback placeholder if no keys are found
    const fallbackText = "🤖 **HabitBot AI Coach Connected!**\n\nTo activate real-time AI responses, please provide your `GROQ_API_KEY` or `GEMINI_API_KEY` in `.env.local` or Vercel Environment Variables.\n\n*Atomic Habits Tip*: Focus on small 1% improvements every single day. Consistency beats intensity!";
    return new Response(fallbackText, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
