import type { Metadata } from "next";
import { Geist, Geist_Mono, Bangers, Mountains_of_Christmas } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Navbar } from "@/components/navbar";
import { FooterWrapper } from "@/components/footer-wrapper";
import { AuthProvider } from "@/context/auth-context";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const bangers = Bangers({
  weight: "400",
  variable: "--font-bangers",
  subsets: ["latin"],
});

const mountainsOfChristmas = Mountains_of_Christmas({
  weight: ["400", "700"],
  variable: "--font-mountains",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "uKnight | Connect with Students",
  description: "The exclusive video chat platform for university students.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${bangers.variable} ${mountainsOfChristmas.variable} font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <Navbar />
            {children}
            <Toaster />
            <FooterWrapper />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
