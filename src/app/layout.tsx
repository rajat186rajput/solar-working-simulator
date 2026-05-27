import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Solar Working Simulator — Live On-Grid, Off-Grid & Hybrid Demo",
  description:
    "Interactive simulator showing how on-grid, off-grid, and hybrid solar systems work. Toggle appliances, change time of day, and watch power flow live. Educational, Hinglish-friendly.",
  keywords: ["solar simulator", "on-grid solar", "off-grid solar", "hybrid solar", "solar system India", "UP solar"],
  openGraph: {
    title: "Solar Working Simulator — Live Demo",
    description:
      "Interactive on-grid / off-grid / hybrid solar simulator. Toggle appliances, watch power flow live. Educational, Hinglish-friendly.",
    type: "website",
    siteName: "SolarSim",
  },
  twitter: {
    card: "summary_large_image",
    title: "Solar Working Simulator",
    description: "Live solar system simulator — on-grid, off-grid, hybrid. Toggle appliances, watch real-time power flow.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="hi" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&family=Inter:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased bg-surface-dark text-text-primary font-sans">
        {children}
      </body>
    </html>
  );
}
