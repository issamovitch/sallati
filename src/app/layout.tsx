import type { Metadata } from "next";
import {
  Cairo,
  Tajawal,
  Almarai,
  IBM_Plex_Sans_Arabic,
  Noto_Sans_Arabic,
  Amiri,
  Scheherazade_New,
  Lateef,
  Reem_Kufi,
  Geist_Mono,
} from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import "./globals.css";

const cairo = Cairo({ variable: "--font-cairo", subsets: ["arabic", "latin"], display: "swap" });
const tajawal = Tajawal({ variable: "--font-tajawal", subsets: ["arabic", "latin"], display: "swap", weight: ["400", "500", "700"] });
const almarai = Almarai({ variable: "--font-almarai", subsets: ["arabic"], display: "swap", weight: ["400", "700"] });
const ibmPlex = IBM_Plex_Sans_Arabic({ variable: "--font-ibm-plex-arabic", subsets: ["arabic", "latin"], display: "swap", weight: ["400", "500", "700"] });
const notoSans = Noto_Sans_Arabic({ variable: "--font-noto-arabic", subsets: ["arabic", "latin"], display: "swap", weight: ["400", "500", "700"] });
const amiri = Amiri({ variable: "--font-amiri", subsets: ["arabic", "latin"], display: "swap", weight: ["400", "700"] });
const scheherazade = Scheherazade_New({ variable: "--font-scheherazade", subsets: ["arabic"], display: "swap", weight: ["400", "700"] });
const lateef = Lateef({ variable: "--font-lateef", subsets: ["arabic"], display: "swap", weight: ["400", "700"] });
const reemKufi = Reem_Kufi({ variable: "--font-reem-kufi", subsets: ["arabic", "latin"], display: "swap", weight: ["400", "500", "700"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "سلتي",
  description: "تطبيق سلتي لتاجر سلة",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const fontVars = [
    cairo.variable, tajawal.variable, almarai.variable, ibmPlex.variable,
    notoSans.variable, amiri.variable, scheherazade.variable, lateef.variable,
    reemKufi.variable, geistMono.variable,
  ].join(" ");
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${fontVars} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=Tajawal:wght@400;500;700&family=Almarai:wght@400;700&family=IBM+Plex+Sans+Arabic:wght@400;500;700&family=Noto+Sans+Arabic:wght@400;500;700&family=Amiri:wght@400;700&family=Scheherazade+New:wght@400;700&family=Lateef:wght@400;700&family=Reem+Kufi:wght@400;500;700&display=swap"
        />
        <NextTopLoader color="#1781ae" height={3} showSpinner={false} />
        {children}
      </body>
    </html>
  );
}