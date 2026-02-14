import "./globals.css";
import LayoutContent from "./LayoutContent";

export const metadata = {
  title: "GymPortal",
  description: "Smart gym management system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <LayoutContent>{children}</LayoutContent>
      </body>
    </html>
  );
}

