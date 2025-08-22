import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import FirebaseAuthSync from "@/components/FirebaseAuthSync";
import Header from "@/components/Header";
import Navigation from "@/components/Navigation";
import { ThemeProvider } from "@/components/ThemeProvider";
import Pwa from "@/components/Pwa";
import "./globals.css";

export const metadata: Metadata = {
  title: "CoEdit - Real-Time Collaborative Documents with Version Control",
  description:
    "Edit documents together in real-time with built-in version control. Commit changes, track history, and rollback instantly—just like Git for documents.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <head>
          <link rel="stylesheet" href="https://fonts.cdnfonts.com/css/satoshi" />
          <link rel="stylesheet" href="https://fonts.cdnfonts.com/css/jetbrains-mono" />
          <link rel="manifest" href="/manifest.json" />
          <meta name="theme-color" content="#0ea5e9" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="default" />
          <link rel="apple-touch-icon" href="/logo.svg" />
        </head>
        <body
          className="antialiased min-h-screen flex flex-col"
        >
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <FirebaseAuthSync />
            <Pwa />
            <Header />
            <Navigation />
            {children}
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
