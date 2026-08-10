/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { RealtimeRelay } from '@adatechnology/meta-whatsapp-module';

import { redis, redisSubscriber } from '@/infra/cache/redisClient';

// Propaga o evento entre processos: com mais de uma instancia da API no Railway, quem tem a
// conexao SSE aberta raramente e a mesma instancia que processou a mensagem.
export class RedisRelay implements RealtimeRelay {
  private readonly listenersByChannel = new Map<string, Set<(message: string) => void>>();
  private isListening = false;

  async publish(channel: string, message: string): Promise<void> {
    await redis.publish(channel, message);
  }

  async subscribe(channel: string, onMessage: (message: string) => void): Promise<() => void> {
    this.startListening();

    const listeners = this.listenersByChannel.get(channel) ?? new Set();
    listeners.add(onMessage);
    this.listenersByChannel.set(channel, listeners);

    await redisSubscriber.subscribe(channel);

    return () => {
      listeners.delete(onMessage);

      if (listeners.size > 0) return;

      this.listenersByChannel.delete(channel);
      void redisSubscriber.unsubscribe(channel);
    };
  }

  private startListening(): void {
    if (this.isListening) return;

    this.isListening = true;
    redisSubscriber.on('message', (channel: string, message: string) => {
      const listeners = this.listenersByChannel.get(channel);
      if (!listeners) return;

      for (const listener of listeners) listener(message);
    });
  }
}
