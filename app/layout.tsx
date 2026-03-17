import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Header } from "@/components/layout/header";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ArtistMetrics - Monitoramento de Métricas para Artistas",
  description:
    "Plataforma completa para monitoramento e análise de métricas de artistas musicais. Acompanhe streams, audiência e desempenho em tempo real.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <div className="relative min-h-screen bg-zinc-950">
            {/* Desktop Sidebar */}
            <Sidebar />

            {/* Main Content Area */}
            <div className="flex min-h-screen flex-col md:pl-[280px]">
              <Header />
              <main className="flex-1 p-4 pb-20 md:p-6 md:pb-6">
                {children}
              </main>
            </div>

            {/* Mobile Bottom Nav */}
            <MobileNav />
          </div>

          <Toaster position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
