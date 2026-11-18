import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "InfraPredict - Structural Health Monitoring & Predictive Anomaly Detection",
  description: "AI-powered multimodal structural health monitoring platform with real-time operational modal analysis and spectral diagnostics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        {children}
      </body>
    </html>
  );
}
