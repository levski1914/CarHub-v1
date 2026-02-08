import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class InboxService {
  constructor(private prisma: PrismaService) {}

  async create(input: {
    userId: string;
    type: 'reminder' | 'system' | 'activity';
    title: string;
    body?: string | null;
    href?: string | null;
    meta?: any;
    dedupeKey?: string | null;
  }) {
    // dedupe (ако има)
    if (input.dedupeKey) {
      const exists = await this.prisma.inboxNotification.findUnique({
        where: { dedupeKey: input.dedupeKey },
      });
      if (exists) return exists;
    }

    return this.prisma.inboxNotification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        href: input.href ?? null,
        meta: input.meta ?? undefined,
        dedupeKey: input.dedupeKey ?? null,
      },
    });
  }

  async list(userId: string, take = 20) {
    return this.prisma.inboxNotification.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(take, 1), 100),
    });
  }

  async unreadCount(userId: string) {
    return this.prisma.inboxNotification.count({
      where: { userId, deletedAt: null, readAt: null },
    });
  }

  async markRead(userId: string, id: string) {
    return this.prisma.inboxNotification.updateMany({
      where: { id, userId, deletedAt: null },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    return this.prisma.inboxNotification.updateMany({
      where: { userId, deletedAt: null, readAt: null },
      data: { readAt: new Date() },
    });
  }

  async remove(userId: string, id: string) {
    return this.prisma.inboxNotification.updateMany({
      where: { id, userId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  async clear(userId: string) {
    return this.prisma.inboxNotification.updateMany({
      where: { userId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }
}
