'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { MessageSquare, Users, Zap, Coins } from 'lucide-react';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';

interface Stats {
  totalMessages: number;
  uniqueUsers: number;
  todayMessages: number;
  totalTokens: number;
}

export function StatsCards() {
  const [stats, setStats] = useState<Stats>({
    totalMessages: 0, uniqueUsers: 0, todayMessages: 0, totalTokens: 0
  });

  useEffect(() => {
    api.getStats().then(setStats);
    const socket = getSocket();
    const refresh = () => api.getStats().then(setStats);
    socket.on('chat:done', refresh);
    socket.on('wa:message', refresh);
    return () => {
      socket.off('chat:done', refresh);
      socket.off('wa:message', refresh);
    };
  }, []);

  const cards = [
    { label: 'Total Messages', value: stats.totalMessages, icon: MessageSquare, color: 'text-blue-400' },
    { label: 'Unique Users', value: stats.uniqueUsers, icon: Users, color: 'text-purple-400' },
    { label: 'Today', value: stats.todayMessages, icon: Zap, color: 'text-yellow-400' },
    { label: 'Total Tokens', value: stats.totalTokens.toLocaleString(), icon: Coins, color: 'text-green-400' }
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <p className="mt-1 text-2xl font-bold">{c.value}</p>
              </div>
              <c.icon className={`h-8 w-8 ${c.color} opacity-50`} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
