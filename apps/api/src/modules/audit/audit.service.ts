import { ForbiddenException, Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { ListAuditLogsQuery } from './audit.dto'
import { redactAuditValues } from './audit.redaction'

type Actor = { id: string; role: string }

/** A bare date means the whole day, so the upper bound has to reach its final millisecond. */
function endOfRange(value: string) {
  const date = new Date(value)
  if (/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) date.setUTCHours(23, 59, 59, 999)
  return date
}

@Injectable()
export class AuditService {
  constructor(private readonly db: PrismaService) {}

  /** Reading the audit trail is an administrator-only capability in this phase. */
  assertAdmin(actor: Actor) {
    if (actor.role !== 'ADMIN') throw new ForbiddenException('Chỉ quản trị viên được xem nhật ký hệ thống')
  }

  private where(query: ListAuditLogsQuery): Prisma.AuditLogWhereInput {
    const term = query.search?.trim()
    const text = term ? { contains: term, mode: 'insensitive' as const } : undefined
    const createdAt = query.from || query.to
      ? { ...(query.from ? { gte: new Date(query.from) } : {}), ...(query.to ? { lte: endOfRange(query.to) } : {}) }
      : undefined
    return {
      action: query.action,
      entityType: query.entityType,
      entityId: query.entityId,
      userId: query.userId,
      createdAt,
      ...(text ? { OR: [{ action: text }, { entityType: text }, { entityId: text }] } : {}),
    }
  }

  async list(query: ListAuditLogsQuery, actor: Actor) {
    this.assertAdmin(actor)
    const where = this.where(query)
    const [rows, total] = await this.db.$transaction([
      this.db.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (query.page - 1) * query.limit, take: query.limit }),
      this.db.auditLog.count({ where }),
    ])

    // audit_logs.userId is a plain column rather than a relation, so the actors are resolved
    // in one extra query instead of a join.
    const actorIds = [...new Set(rows.map(row => row.userId).filter((value): value is string => Boolean(value)))]
    const actors = actorIds.length
      ? await this.db.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, username: true, fullName: true, role: true } })
      : []
    const actorById = new Map(actors.map(user => [user.id, user]))

    return {
      data: rows.map(row => ({
        // The primary key is a BigInt, which JSON cannot carry; expose it as a string.
        id: row.id.toString(),
        action: row.action,
        entityType: row.entityType,
        entityId: row.entityId,
        createdAt: row.createdAt,
        ipAddress: row.ipAddress,
        userAgent: row.userAgent,
        actor: row.userId ? actorById.get(row.userId) ?? { id: row.userId, username: null, fullName: null, role: null } : null,
        oldValues: redactAuditValues(row.oldValues),
        newValues: redactAuditValues(row.newValues),
      })),
      meta: { page: query.page, limit: query.limit, total, totalPages: Math.max(1, Math.ceil(total / query.limit)) },
    }
  }

  /** Feeds the screen's filter dropdowns with values that actually occur in the data. */
  async filterOptions(actor: Actor) {
    this.assertAdmin(actor)
    const [actions, entityTypes, actorIds] = await Promise.all([
      this.db.auditLog.groupBy({ by: ['action'], _count: { _all: true } }),
      this.db.auditLog.groupBy({ by: ['entityType'], _count: { _all: true } }),
      this.db.auditLog.groupBy({ by: ['userId'], _count: { _all: true } }),
    ])
    const ids = actorIds.map(row => row.userId).filter((value): value is string => Boolean(value))
    const users = ids.length
      ? await this.db.user.findMany({ where: { id: { in: ids } }, select: { id: true, username: true, fullName: true } })
      : []
    const byCount = (a: { count: number }, b: { count: number }) => b.count - a.count
    return {
      actions: actions.map(row => ({ value: row.action, count: row._count._all })).sort(byCount),
      entityTypes: entityTypes.map(row => ({ value: row.entityType, count: row._count._all })).sort(byCount),
      actors: users.map(user => ({ id: user.id, username: user.username, fullName: user.fullName })),
    }
  }
}
