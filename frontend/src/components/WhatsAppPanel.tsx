'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Smartphone, RefreshCw, LogOut, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { getSocket } from '@/lib/socket';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface WaState {
  status: 'disconnected' | 'qr' | 'connecting' | 'connected';
  qr: string | null;
  user: { id: string; name: string } | null;
  reconnectAttempts: number;
}

export function WhatsAppPanel() {
  const [state, setState] = useState<WaState>({
    status: 'disconnected', qr: null, user: null, reconnectAttempts: 0
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const socket = getSocket();

    api.getWhatsappStatus().then(setState);

    socket.on('wa:status', setState);
    socket.on('wa:qr', (qr) => setState((s) => ({ ...s, qr, status: 'qr' })));
    socket.on('wa:connected', (user) => setState((s) => ({ ...s, status: 'connected', user, qr: null })));

    return () => {
      socket.off('wa:status');
      socket.off('wa:qr');
      socket.off('wa:connected');
    };
  }, []);

  const reconnect = async () => {
    setLoading(true);
    await api.reconnectWa();
    setTimeout(() => setLoading(false), 1500);
  };

  const logout = async () => {
    setLoading(true);
    try {
      await api.logoutWa();
      setState({ status: 'disconnected', qr: null, user: null, reconnectAttempts: 0 });
    } finally {
      setLoading(false);
    }
  };

  const statusBadge = {
    connected: { variant: 'success', icon: CheckCircle2, label: 'Connected' },
    qr: { variant: 'warning', icon: Smartphone, label: 'Scan QR' },
    connecting: { variant: 'warning', icon: Loader2, label: 'Connecting...' },
    disconnected: { variant: 'destructive', icon: XCircle, label: 'Disconnected' }
  } as const;

  const sb = statusBadge[state.status];
  const StatusIcon = sb.icon;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Smartphone className="h-5 w-5 text-green-500" />
            WhatsApp Gateway
          </CardTitle>
          <Badge variant={sb.variant} className="gap-1">
            <StatusIcon className={cn('h-3 w-3', state.status === 'connecting' && 'animate-spin')} />
            {sb.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {state.status === 'qr' && state.qr && (
          <div className="flex flex-col items-center space-y-3">
            <div className="rounded-lg border border-green-500/30 bg-white p-3">
              <img src={state.qr} alt="QR Code" className="h-56 w-56" />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Buka WhatsApp → <strong>Linked Devices</strong> → Scan QR ini
            </p>
          </div>
        )}

        {state.status === 'connected' && state.user && (
          <div className="space-y-2 rounded-lg border border-green-500/30 bg-green-500/5 p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Bot aktif & siap menerima pesan</span>
            </div>
            <div className="text-xs text-muted-foreground">
              <div>User: <span className="text-foreground">{state.user.name}</span></div>
              <div>JID: <code className="text-[10px]">{state.user.id}</code></div>
            </div>
          </div>
        )}

        {state.status === 'disconnected' && (
          <div className="rounded-lg border border-dashed p-6 text-center">
            <XCircle className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">WhatsApp belum terkoneksi</p>
          </div>
        )}

        {state.status === 'connecting' && (
          <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-6 text-center">
            <Loader2 className="mx-auto mb-2 h-8 w-8 animate-spin text-yellow-500" />
            <p className="text-sm">Menghubungkan ke WhatsApp...</p>
            {state.reconnectAttempts > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">Attempt #{state.reconnectAttempts}</p>
            )}
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <Button onClick={reconnect} disabled={loading} size="sm" variant="outline" className="flex-1">
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            Reconnect
          </Button>
          {state.status === 'connected' && (
            <Button onClick={logout} disabled={loading} size="sm" variant="destructive" className="flex-1">
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
