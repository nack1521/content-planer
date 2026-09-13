import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Content Planner — Creator Studio Control Board',
  description: 'Private bilingual workspace for planning social content from idea to publication',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
