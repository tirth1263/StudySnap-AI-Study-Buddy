import type { Metadata, Viewport } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import { AuthProvider } from "@/lib/auth";
import { IS_DEMO } from "@/lib/config";
import { Nav } from "@/components/Nav";
import "./globals.css";

const body = DM_Sans({ variable: "--font-body", subsets: ["latin"] });
const display = Fraunces({ variable: "--font-display-face", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "StudySnap – AI study buddy",
  description:
    "Snap a photo of your notes or upload a lecture PDF. Get a summary, flashcards and a quiz, and review what you got wrong with spaced repetition.",
};

export const viewport: Viewport = {
  themeColor: "#faf6ec",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${body.variable} ${display.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <AuthProvider>
          {IS_DEMO && (
            <p className="bg-ink px-4 py-1.5 text-center text-xs text-paper">
              Demo mode: your decks stay in this browser and are generated on-device, without an AI model.
            </p>
          )}
          <Nav />
          <main className="flex flex-1 flex-col">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
