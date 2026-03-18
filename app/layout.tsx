import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { LayoutShell } from "@/components/layout/layout-shell";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Débora Kailany — Painel de Métricas",
  description:
    "Painel exclusivo de métricas e marketing musical de Débora Kailany. Acompanhe streams, audiência e desempenho em tempo real.",
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
          <LayoutShell>{children}</LayoutShell>
          <Toaster position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
