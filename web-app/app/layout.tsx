import type { ReactNode } from "react";
import "../src/styles.css";

export const metadata = {
  title: "EscoAPesca Beta",
  description: "Trova pescatori compatibili nel Lazio.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
