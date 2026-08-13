import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "HabitBot | Habit Coach & Daily Execution Suite",
  description: "Next-gen behavioral coaching, Pomodoro focus timer, Atomic Habit matrices, and productivity analytics.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('habitbot_theme') || 'light';
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} font-sans min-h-screen bg-background text-foreground antialiased selection:bg-primary/20 selection:text-primary`}>
        <TooltipProvider>
          {children}
          <Toaster 
            position="bottom-right" 
            richColors
          />
        </TooltipProvider>
      </body>
    </html>
  );
}
