/**
 * Topic Guardrail for HabitBot
 * Verifies if user message is within the domain of habits, routines, productivity, mindset, and identity.
 */
export function isOnTopic(message: string): boolean {
  const text = message.toLowerCase().trim();
  
  // Allow short greetings & conversational markers
  const greetings = [
    'hello', 'hi', 'hey', 'greetings', 'good morning', 'good evening',
    'good afternoon', 'thanks', 'thank you', 'ok', 'okay', 'yes', 'no',
    'help', 'start', 'begin', 'continue', 'bye', 'goodbye'
  ];
  if (greetings.some(g => text === g || text.startsWith(g + ' ') || text.endsWith(' ' + g))) {
    return true;
  }

  // Allow Identity & System queries
  const identityKeywords = [
    'who are you', 'what are you', 'your name', 'habitbot', 'what can you do',
    'help me', 'how do you work', 'what is this app'
  ];
  if (identityKeywords.some(k => text.includes(k))) {
    return true;
  }

  // Core domain keywords
  const domainKeywords = [
    'habit', 'routine', 'productivity', 'productive', 'focus', 'motivation',
    'motivate', 'goal', 'discipline', 'mindset', 'procrastination', 'procrastinate',
    'morning', 'evening', 'night', 'sleep', 'wake', 'exercise', 'workout', 'gym',
    'meditation', 'meditate', 'journal', 'journaling', 'reading', 'book', 'study',
    'studying', 'time management', 'pomodoro', 'reflection', 'reflect', 'self-improvement',
    'accountability', 'streak', 'todo', 'task', 'schedule', 'plan', 'atomic',
    'consistency', 'consistent', 'distraction', 'burnout', 'energy', 'health',
    'diet', 'nutrition', 'water', 'hydration', 'deep work', 'flow state',
    'dopamine', 'trigger', 'reward', 'friction', 'cue', 'craving'
  ];

  return domainKeywords.some(keyword => text.includes(keyword));
}
