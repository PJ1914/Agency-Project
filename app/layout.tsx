import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/styles/globals.css";
import { Providers } from "@/components/Providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TapasyaFlow - Business Management Platform",
  description: "Comprehensive SaaS platform for managing orders, inventory, shipments, and payments",
  icons: {
    icon: '/TapasyaFlow-Logo.png',
    shortcut: '/TapasyaFlow-Logo.png',
    apple: '/TapasyaFlow-Logo.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/TapasyaFlow-Logo.png" />
      </head>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
