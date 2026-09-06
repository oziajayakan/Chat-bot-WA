'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Send, Bot, User, Sparkles, Loader2 } from 'lucide-react';
import { getSocket } from '@/lib/socket';
import { api } from '@/lib/api';
import { formatDate, cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  tokens?: number;
  duration?: number;
  streaming?: boolean;
}

interface Model {
  id: string;
  name: string;
  provider: string;
}

export function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [userId] = useState(() => 'web-' + Math.random().toString(36).slice(2, 10));
  const containerRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef(getSocket());

  useEffect(() => {
    api.getModels().then((res) => {
      setModels(res.models);
      setSelectedModel(res.default);
    });
    api.getHistory(userId).then((res) => setMessages(res.history || []));

    const socket = socketRef.current;

    socket.on('chat:start', () => {
      setStreaming(true);
      setMessages((prev) => [...prev, { role: 'assistant', content: '', streaming: true }]);
    });

    socket.on('chat:delta', ({ content }) => {
      setMessages((prev) => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last?.role === 'assistant') {
          copy[copy.length - 1] = { ...last, content: last.content + content };
        }
        return copy;
      });
    });

    socket.on('chat:done', (data) => {
      setStreaming(false);
      setMessages((prev) => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last?.role === 'assistant') {
          copy[copy.length - 1] = {
            ...last,
            content: data.content,
            model: data.model,
            tokens: data.tokens,
            duration: data.duration,
            streaming: false
          };
        }
        return copy;
      });
    });

    return () => {
      socket.off('chat:start');
      socket.off('chat:delta');
      socket.off('chat:done');
    };
  }, [userId]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  const send = () => {
    if (!input.trim() || streaming) return;

    const userMsg = { role: 'user' as const, content: input };
    setMessages((prev) => [...prev, userMsg]);

    socketRef.current.emit('chat:send', {
      userId,
      message: input,
      model: selectedModel
    });

    setInput('');
  };

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bot className="h-5 w-5 text-green-500" />
            AI Chat Tester
          </CardTitle>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="rounded-md border border-input bg-background px-2 py-1 text-xs"
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>{m.provider} - {m.name}</option>
            ))}
          </select>
        </div>
        <div className="text-xs text-muted-foreground">
          Session: <code className="text-[10px]">{userId}</code>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3 p-3">
        <div ref={containerRef} className="flex-1 space-y-3 overflow-y-auto rounded-md bg-black/20 p-3">
          {messages.length === 0 && (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Sparkles className="mx-auto mb-2 h-8 w-8 opacity-50" />
                <p className="text-sm">Mulai percakapan dengan AI...</p>
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={cn('flex gap-2 animate-slide-in', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
              {msg.role === 'assistant' && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-500/20">
                  <Bot className="h-4 w-4 text-green-400" />
                </div>
              )}
              <div className={cn(
                'max-w-[80%] rounded-lg px-3 py-2 text-sm',
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-foreground'
              )}>
                <div className="whitespace-pre-wrap break-words">{msg.content || (msg.streaming ? '...' : '')}</div>
                {msg.role === 'assistant' && !msg.streaming && (msg.model || msg.duration) && (
                  <div className="mt-1 flex items-center gap-2 border-t border-border/30 pt-1 text-[10px] text-muted-foreground">
                    {msg.model && <span>{msg.model.split('/').pop()}</span>}
                    {msg.tokens != null && <Badge variant="outline" className="text-[9px]">{msg.tokens} tokens</Badge>}
                    {msg.duration != null && <span>{msg.duration}ms</span>}
                  </div>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20">
                  <User className="h-4 w-4 text-primary" />
                </div>
              )}
            </div>
          ))}

          {streaming && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Generating...
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Tulis pesan... (Enter untuk kirim)"
            className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            rows={2}
            disabled={streaming}
          />
          <Button onClick={send} disabled={streaming || !input.trim()} size="icon" className="h-auto">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
