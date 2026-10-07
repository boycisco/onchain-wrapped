import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'Onchain Wrapped — Discover Your Base Wallet Personality',
  description: 'Spotify Wrapped for your Base wallet. Discover your onchain personality, activity stats, timing quirks, roasts, and head-to-head comparisons.',
  openGraph: {
    title: 'Onchain Wrapped — Discover Your Base Wallet Personality',
    description: 'Spotify Wrapped for your Base wallet. Discover your onchain personality, activity stats, timing quirks, roasts, and head-to-head comparisons.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Onchain Wrapped — Discover Your Base Wallet Personality',
    description: 'Spotify Wrapped for your Base wallet. Discover your onchain personality, activity stats, timing quirks, roasts, and head-to-head comparisons.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body className="bg-black text-white antialiased min-h-screen" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
