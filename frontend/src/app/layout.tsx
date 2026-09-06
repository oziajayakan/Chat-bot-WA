import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chatbot Assistant Dashboard',
  description: 'Realtime AI chatbot with OpenRouter & WhatsApp integration'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className="dark">
      <body>{children}</body>
    </html>
  );
}
