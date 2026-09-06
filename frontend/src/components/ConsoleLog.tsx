'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Terminal, Trash2, Pause, Play, Filter } from 'lucide-react';
import { getSocket } from '@/lib/socket';
import { api } from '@/lib/api';
import { formatDate, cn } from '@/lib/utils';

interface LogEntry {
  id: number;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  source: string;
  message: string;
  meta?: any;
}

export function ConsoleLog() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [paused, setPaused] = useState(false);
  const [filter, setFilter] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);
  const bufferRef = useRef<LogEntry[]>([]);

  useEffect(() => {
    const socket = getSocket();
    api.getLogs().then((res) => setLogs(res.logs || []));

    const handler = (entry: LogEntry) => {
      if (paused) return;
      bufferRef.current.push(entry);
      // throttle update
      if (bufferRef.current.length === 1) {
        requestAnimationFrame(() => {
          setLogs((prev) => [...prev, ...bufferRef.current].slice(-500));
          bufferRef.current = [];
        });
      }
    };

    socket.on('log:new', handler);

    // Auto-scroll
    const interval = setInterval(() => {
      if (containerRef.current && !paused) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    }, 200);

    return () => {
      socket.off('log:new', handler);
      clearInterval(interval);
    };
  }, [paused]);

  const clearLogs = async () => {
    await api.clearLogs();
    setLogs([]);
  };

  const filteredLogs = filter
    ? logs.filter((l) => l.source.toLowerCase().includes(filter.toLowerCase())
      || l.message.toLowerCase().includes(filter.toLowerCase())
      || l.level.toLowerCase().includes(filter.toLowerCase()))
    : logs;

  const levelColors = {
    info: 'text-blue-400',
    warn: 'text-yellow-400',
    error: 'text-red-400',
    debug: 'text-purple-400'
  };

  const levelIcon = {
    info: 'ℹ',
    warn: '⚠',
    error: '✗',
    debug: '◆'
  };

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Terminal className="h-5 w-5 text-green-500" />
            Console Log
            <Badge variant="secondary" className="ml-2 font-mono text-[10px]">
              {filteredLogs.length}
            </Badge>
          </CardTitle>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={() => setPaused(!paused)} title={paused ? 'Resume' : 'Pause'}>
              {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </Button>
            <Button size="sm" variant="ghost" onClick={clearLogs} title="Clear logs">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="relative mt-2">
          <Filter className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Filter by source, level, message..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full rounded-md border border-input bg-background/50 py-1 pl-7 pr-3 text-xs"
          />
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <div
          ref={containerRef}
          className="h-[500px] overflow-y-auto bg-black/40 font-mono text-xs"
        >
          {filteredLogs.length === 0 ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Terminal className="mx-auto mb-2 h-8 w-8 opacity-50" />
                <p>Waiting for logs...</p>
              </div>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.id} className={cn('console-line', log.level)}>
                <span className="text-muted-foreground">{formatDate(log.timestamp)}</span>{' '}
                <span className={levelColors[log.level]}>{levelIcon[log.level]}</span>{' '}
                <span className="text-cyan-400">[{log.source}]</span>{' '}
                <span className="text-foreground/90">{log.message}</span>
                {log.meta && Object.keys(log.meta).length > 0 && (
                  <span className="ml-2 text-muted-foreground">
                    {JSON.stringify(log.meta)}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
