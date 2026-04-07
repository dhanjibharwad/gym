import "./globals.css";
import LayoutContent from "./LayoutContent";

export const metadata = {
  title: "GymPortal",
  description: "Smart gym management system",
  icons: {
    icon: "/images/jashviro.webp",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/images/jashviro.webp" type="image/webp" />
      </head>
      <body suppressHydrationWarning>
        <LayoutContent>{children}</LayoutContent>
      </body>
    </html>
  );
}

