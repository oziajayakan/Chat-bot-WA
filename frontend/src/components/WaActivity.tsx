'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Smartphone, MessageCircle } from 'lucide-react';
import { getSocket } from '@/lib/socket';
import { formatDate, cn } from '@/lib/utils';

interface WaActivity {
  jid: string;
  pushname: string;
  userMessage: string;
  reply: string;
  model: string;
}

export function WaActivity() {
  const [activities, setActivities] = useState<WaActivity[]>([]);

  useEffect(() => {
    const socket = getSocket();
    socket.on('wa:message', (data: WaActivity) => {
      setActivities((prev) => [data, ...prev].slice(0, 20));
    });
    return () => { socket.off('wa:message'); };
  }, []);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-500" />
            WhatsApp Activity
          </span>
          <Badge variant="secondary">{activities.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <div className="h-[300px] overflow-y-auto p-3">
          {activities.length === 0 ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Smartphone className="mx-auto mb-2 h-8 w-8 opacity-50" />
                <p className="text-sm">Belum ada aktivitas</p>
                <p className="text-xs">Scan QR & kirim pesan ke bot</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {activities.map((act, i) => (
                <div key={i} className="rounded-md border border-border bg-secondary/50 p-3 animate-slide-in">
                  <div className="mb-1 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500/20 text-[10px] font-bold text-green-400">
                        {act.pushname[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div className="text-xs font-medium">{act.pushname}</div>
                        <div className="text-[10px] text-muted-foreground">{act.jid.split('@')[0]}</div>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[9px]">{act.model.split('/').pop()}</Badge>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="text-foreground/90">
                      <span className="text-blue-400">in: </span>{act.userMessage}
                    </div>
                    <div className={cn('text-foreground/90', 'pl-3 border-l-2 border-green-500/30')}>
                      {act.reply.substring(0, 100)}{act.reply.length > 100 && '...'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
