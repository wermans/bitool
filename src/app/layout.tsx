import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { ImpersonationBanner } from "./impersonation-banner";
import { TopNav } from "./top-nav";

export const metadata: Metadata = {
  title: "BI Tool",
  description: "Internal Analytics & Metrics Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <Providers>
          <ImpersonationBanner />
          <TopNav />
          {children}
        </Providers>
      </body>
    </html>
  );
}
