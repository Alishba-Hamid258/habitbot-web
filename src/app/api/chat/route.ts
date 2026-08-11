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

    // 1. Topic Guardrail Check (passes if media attached, or ongoing conversation, or on-topic)
    if (!isOnTopic(userQuery, Boolean(mediaPayload), messages.length)) {
      const redirectText = "I'm **HabitBot**, your specialized AI habit and high-performance coach! 🎯\n\nI can help you build atomic habits, beat procrastination, optimize morning/evening routines, and design daily productivity systems. How can I help you level up your daily routine today?";
      return new Response(redirectText, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    // Read keys from request headers (if configured in UI) or Vercel environment variables
    const customGroqKey = req.headers.get('x-groq-key');
    const customGeminiKey = req.headers.get('x-gemini-key');

    const groqKey = customGroqKey || process.env.GROQ_API_KEY;
    const geminiKey = customGeminiKey || process.env.GEMINI_API_KEY;

    // 2. Multimodal Request (Images, PDF) or Explicit Gemini Request
    if ((mediaPayload || provider === 'gemini') && geminiKey && geminiKey.startsWith('AIzaSy')) {
      try {
        return await callGeminiStream(messages, geminiKey, mediaPayload, 'gemini-1.5-flash');
      } catch (geminiErr: any) {
        console.error('Gemini stream error, falling back to Groq:', geminiErr);
        if (groqKey) {
          return await callGroqStream(messages, groqKey, 'llama-3.3-70b-versatile');
        }
      }
    }

    // 3. Fast Streaming with Groq API (High Performance Llama 3.3 Engine)
    if (groqKey) {
      try {
        return await callGroqStream(messages, groqKey, 'llama-3.3-70b-versatile');
      } catch (groqErr: any) {
        console.error('Groq error, attempting Gemini fallback:', groqErr);
        if (geminiKey && geminiKey.startsWith('AIzaSy')) {
          return await callGeminiStream(messages, geminiKey, mediaPayload, 'gemini-1.5-flash');
        }
        return NextResponse.json({ error: groqErr.message }, { status: 500 });
      }
    }

    // 4. If Gemini key is available
    if (geminiKey && geminiKey.startsWith('AIzaSy')) {
      return await callGeminiStream(messages, geminiKey, mediaPayload, 'gemini-1.5-flash');
    }

    // 5. Fallback placeholder if no keys are found
    const fallbackText = "🤖 **HabitBot AI Coach Connected!**\n\nTo activate real-time AI responses on your Vercel deployment:\n1. Open your **Vercel Project Dashboard** ➡️ **Settings** ➡️ **Environment Variables**.\n2. Add `GROQ_API_KEY` (or `GEMINI_API_KEY`).\n3. Click **Redeploy** in Vercel!\n\nOr click **⚙️ Key Settings** in the top bar to connect your key instantly!";
    return new Response(fallbackText, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
