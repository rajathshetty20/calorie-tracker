import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import TopBar from "./TopBar";
import BottomNav from "./BottomNav";
import { AddSheetProvider } from "./AddSheet";
import { DemoProvider } from "./DemoContext";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Daily tracker",
  description: "Meals, water, weight, exercise, and time — one daily dashboard.",
  // Installed to the home screen, the app runs without browser chrome and
  // draws its own status bar backdrop.
  appleWebApp: {
    capable: true,
    title: "Tracker",
    statusBarStyle: "default",
  },
};

// Matches the nav surface so mobile browser chrome blends with the app.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#18181b" },
  ],
  // Standalone mode extends under the notch and home indicator; the safe-area
  // padding below keeps content clear of both.
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en"
 className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} >
      <body className="min-h-full bg-ground text-ink">
        <DemoProvider isDemo={!user}>
        <AddSheetProvider>
          <TopBar signedIn={!!user} />
          {/* Bottom padding clears the fixed nav plus the home indicator. */}
          <main className="mx-auto w-full max-w-3xl px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-5 md:pb-10">
            {children}
          </main>
          <BottomNav />
        </AddSheetProvider>
        </DemoProvider>
      </body>
    </html>
  );
}
