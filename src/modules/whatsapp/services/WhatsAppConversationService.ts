import type { Prisma, PrismaClient } from "@prisma/client";

export class WhatsAppConversationService {
  constructor(private readonly prisma: PrismaClient) {}
  async list(
    organizationId: string,
    input: {
      page: number;
      pageSize: number;
      routingStatus?: "RESOLVED" | "UNRESOLVED";
      search?: string;
    }
  ) {
    const where: Prisma.WhatsAppConversationWhereInput = {
      organizationId,
      ...(input.routingStatus ? { routingStatus: input.routingStatus } : {}),
      ...(input.search
        ? {
            OR: [
              { externalPhone: { contains: input.search } },
              { contact: { displayPhone: { contains: input.search } } },
              { contact: { customer: { name: { contains: input.search, mode: "insensitive" } } } },
            ],
          }
        : {}),
    };
    const [total, items] = await this.prisma.$transaction([
      this.prisma.whatsAppConversation.count({ where }),
      this.prisma.whatsAppConversation.findMany({
        where,
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
        orderBy: { lastMessageAt: "desc" },
        select: {
          id: true,
          externalPhone: true,
          routingStatus: true,
          unresolvedReason: true,
          status: true,
          lastMessageAt: true,
          store: { select: { id: true, name: true, code: true } },
          contact: {
            select: {
              id: true,
              displayPhone: true,
              customer: { select: { id: true, name: true } },
            },
          },
          phoneNumber: { select: { id: true, displayPhoneNumber: true, verifiedName: true } },
          messages: {
            take: 1,
            orderBy: { createdAt: "desc" },
            select: { direction: true, type: true, payload: true, createdAt: true },
          },
        },
      }),
    ]);
    return {
      items,
      page: input.page,
      pageSize: input.pageSize,
      total,
      totalPages: Math.ceil(total / input.pageSize),
    };
  }
  async get(organizationId: string, id: string) {
    const item = await this.prisma.whatsAppConversation.findFirst({
      where: { id, organizationId },
      select: {
        id: true,
        externalPhone: true,
        routingStatus: true,
        unresolvedReason: true,
        status: true,
        lastMessageAt: true,
        store: { select: { id: true, name: true, code: true } },
        contact: {
          select: { id: true, displayPhone: true, customer: { select: { id: true, name: true } } },
        },
        phoneNumber: { select: { id: true, displayPhoneNumber: true, verifiedName: true } },
        messages: {
          take: 200,
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            direction: true,
            type: true,
            purpose: true,
            fromPhone: true,
            toPhone: true,
            payload: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });
    if (!item) throw new Error("CONVERSATION_NOT_FOUND");
    return item;
  }
}
