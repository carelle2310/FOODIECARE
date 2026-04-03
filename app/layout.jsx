import { Poppins, Plus_Jakarta_Sans } from "next/font/google";
import "../styles/globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-heading",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});

export const metadata = {
  title: "FoodieCare - AI Nutrition Analysis",
  description:
    "AI-based nutrition analysis and personalized diet recommendation system.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${poppins.variable} ${jakarta.variable} app-bg text-slate-900 antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
