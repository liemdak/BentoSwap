import type { Metadata } from "next";
import { Bowlby_One, Inter, JetBrains_Mono } from "next/font/google";
import { WalletProvider } from "@/context/WalletContext";
import Navbar from "@/components/layout/Navbar";
import "./globals.css";

const bowlby = Bowlby_One({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bowlby",
  display: "swap",
});
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Bento — Stablecoin Finance on Arc",
  description:
    "Swap, bridge, and automate your stablecoins on Arc Testnet. Powered by Circle App Kit and CCTP v2.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bowlby.variable} ${inter.variable} ${jetbrains.variable}`}>
      <body className="antialiased">
        <WalletProvider>
          <Navbar />
          <main className="min-h-[calc(100vh-64px)]">{children}</main>
        </WalletProvider>
      </body>
    </html>
  );
}
