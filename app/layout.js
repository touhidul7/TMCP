import "./globals.css";
import { MockStoreProvider } from "@/lib/mock-store";

export const metadata = {
  title: "TMCP Tool Gateway",
  description: "Secure Admin Platform & MCP Server Gateway",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark h-full">
      <body className="font-sans antialiased min-h-screen bg-background text-foreground flex flex-col">
        <MockStoreProvider>
          {children}
        </MockStoreProvider>
      </body>
    </html>
  );
}
