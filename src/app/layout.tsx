import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import NavBar from "./NavBar";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "The Humor Project",
  description: "AI captions for campus life. Post a photo, swipe on the funniest line.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={poppins.variable}>
      <body>
        <div className="floating-elements" aria-hidden="true">
          <div className="floating-cube cube-1" />
          <div className="floating-cube cube-2" />
          <div className="floating-cube cube-3" />
          <div className="floating-sphere sphere-1" />
          <div className="floating-sphere sphere-2" />
        </div>
        <NavBar />
        {children}
      </body>
    </html>
  );
}
