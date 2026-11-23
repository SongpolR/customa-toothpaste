import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans_Thai, Instrument_Serif, Pridi } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import Nav from "@/components/Nav";
import ChatWidget from "@/components/ChatWidget";

const label = IBM_Plex_Mono({ variable: "--font-label", subsets: ["latin"], weight: ["400", "600"] });
const sans = IBM_Plex_Sans_Thai({ variable: "--font-body", subsets: ["thai", "latin"], weight: ["300", "400", "500", "600"] });
const display = Instrument_Serif({ variable: "--font-display", subsets: ["latin"], weight: "400", style: ["normal", "italic"] });
// Thai headlines: Pridi Light — rounded serif, warm, pairs with the herbal theme
const displayThai = Pridi({ variable: "--font-display-th", subsets: ["thai"], weight: ["300", "400"] });

export const metadata: Metadata = {
  title: "Customa — toothpaste, composed by you",
  description: "Organic Thai-herb toothpaste you compose yourself, packed in paper. A demo store.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="th"
      className={`${label.variable} ${sans.variable} ${display.variable} ${displayThai.variable} antialiased`}
    >
      <body className="min-h-screen flex flex-col">
        <Providers>
          <Nav />
          <main className="flex-1 flex flex-col">{children}</main>
          <ChatWidget />
        </Providers>
      </body>
    </html>
  );
}
