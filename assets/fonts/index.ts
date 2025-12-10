import { Inter as FontSans, Urbanist, Playfair_Display } from "next/font/google";
import localFont from "next/font/local";

// Inter - UI/Body font (clean, highly legible)
export const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const fontUrban = Urbanist({
  subsets: ["latin"],
  variable: "--font-urban",
});

// Playfair Display - Heading/Display font (serif for authority, scholarly feel)
export const fontSerif = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: ["400", "500", "600", "700"],
});

export const fontHeading = localFont({
  src: "./CalSans-SemiBold.woff2",
  variable: "--font-heading",
});

export const fontGeist = localFont({
  src: "./GeistVF.woff2",
  variable: "--font-geist",
});
