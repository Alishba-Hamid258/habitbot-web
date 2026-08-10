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
  title: "HabitBot v5.0 | AI Habit Coach & Productivity Suite",
  description: "Next-gen AI behavioral coaching, Pomodoro focus timer, Atomic Habit matrices, and productivity analytics.",
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
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans min-h-screen bg-[#090d16] text-[#f1f5f9] antialiased selection:bg-purple-500/30 selection:text-purple-200`}>
        <TooltipProvider>
          {children}
          <Toaster 
            theme="dark" 
            position="bottom-right" 
            toastOptions={{
              style: {
                background: '#0f172a',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#f8fafc',
              },
            }}
          />
        </TooltipProvider>
      </body>
    </html>
  );
}
