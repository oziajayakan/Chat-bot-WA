'use client';

import { useEffect, useState } from 'react';
import { WhatsAppPanel } from '@/components/WhatsAppPanel';
import { ConsoleLog } from '@/components/ConsoleLog';
import { ChatPanel } from '@/components/ChatPanel';
import { StatsCards } from '@/components/StatsCards';
import { WaActivity } from '@/components/WaActivity';
import { Bot, Github, Activity, Wifi, WifiOff } from 'lucide-react';
import { getSocket } from '@/lib/socket';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function Dashboard() {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = getSocket();
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    setConnected(socket.connected);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* ============ HEADER ============ */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/20">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Chatbot Assistant</h1>
              <p className="text-xs text-muted-foreground">OpenRouter × WhatsApp × Realtime</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant={connected ? 'success' : 'destructive'} className="gap-1">
              {connected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {connected ? 'Realtime Connected' : 'Disconnected'}
            </Badge>
            <a href="https://github.com" target="_blank" className="text-muted-foreground hover:text-foreground">
              <Github className="h-5 w-5" />
            </a>
          </div>
        </div>
      </header>

      {/* ============ MAIN CONTENT ============ */}
      <main className="container space-y-4 py-6">
        {/* Stats */}
        <StatsCards />

        {/* Grid utama */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Left: WhatsApp Panel + Activity */}
          <div className="space-y-4 lg:col-span-1">
            <WhatsAppPanel />
            <WaActivity />
          </div>

          {/* Center: Chat Tester */}
          <div className="lg:col-span-2">
            <ChatPanel />
          </div>
        </div>

        {/* Console Log - Full width */}
        <ConsoleLog />

        <footer className="border-t border-border pt-4 text-center text-xs text-muted-foreground">
          Built with Next.js · Socket.IO · Baileys · OpenRouter · Deployed on Vercel + Railway
        </footer>
      </main>
    </div>
  );
}
