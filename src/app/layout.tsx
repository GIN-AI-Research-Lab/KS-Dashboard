import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { I18nProvider } from "@/i18n/I18nProvider";
import { getLocale, getDictionaryFor } from "@/i18n/server";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? "http://localhost:4000"),
  title: {
    default: "KS Dashboard — Claude Usage Analytics",
    template: "%s · KS Dashboard",
  },
  description: "Company-wide Claude Code usage, cost, and session analytics",
  openGraph: {
    title: "KS Dashboard — Claude Usage Analytics",
    description: "Company-wide Claude Code usage, cost, and session analytics",
    siteName: "KS Dashboard",
    type: "website",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const dict = getDictionaryFor(locale);
  return (
    <html
      lang={locale}
      data-theme="light"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var e=document.documentElement;var t=localStorage.getItem('theme');if(!t||t==='system'){t=window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light';}e.setAttribute('data-theme',t);var a=localStorage.getItem('accent');if(a&&a!=='blue')e.setAttribute('data-accent',a);if(localStorage.getItem('density')==='compact')e.setAttribute('data-density','compact');}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <Providers>
          <I18nProvider locale={locale} dict={dict}>
            {children}
          </I18nProvider>
        </Providers>
      </body>
    </html>
  );
}
