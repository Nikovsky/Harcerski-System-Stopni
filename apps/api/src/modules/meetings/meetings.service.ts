// @file: apps/api/src/modules/meetings/meetings.service.ts
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ApplicationStatus,
  CommissionType,
  CommissionRole,
  MeetingStatus,
  Prisma,
  RegistrationStatus,
  SlotMode,
  Status,
} from '@hss/database';
import type {
  AuthPrincipal,
  CreateMeetingBody,
  CreateMeetingResponse,
  CreateMeetingSlotsBody,
  CreateMeetingSlotsResponse,
  MeetingByDateQuery,
  MeetingBookingBlockedReasonCode,
  MeetingDayDetailItem,
  MeetingDayDetailsResponse,
  MeetingDetail,
  MeetingListItem,
  MeetingListQuery,
  MyMeetingRegistrationListItem,
  MyMeetingRegistrationsResponse,
  MeetingRegistrationCancelResponse,
  MeetingRegistrationCreateBody,
  MeetingRegistrationCreateResponse,
  MeetingRegistrationListResponse,
  MeetingRegistrationReassignBody,
  MeetingRegistrationReassignResponse,
  MeetingRegistrationSummary,
} from '@hss/schemas';

import { PrismaService } from '@/database/prisma/prisma.service';
import { MeetingsAuditService } from './meetings-audit.service';

const ACTIVE_REGISTRATION_WHERE = {
  status: RegistrationStatus.REGISTERED,
} as const;

const LIST_DEFAULT_LIMIT = 60;
const LIST_DEFAULT_FROM_DAYS = -30;
const LIST_DEFAULT_TO_DAYS = 180;
const SERIALIZABLE_RETRY_ATTEMPTS = 3;
const SERIALIZABLE_RETRY_DELAY_MS = 30;
const SELF_CANCELLATION_BLOCK_START_DAYS_BEFORE_MEETING = 1;
const SCOUT_VISIBLE_MEETING_STATUSES = [
  MeetingStatus.OPEN_FOR_REGISTRATION,
  MeetingStatus.CLOSED,
  MeetingStatus.COMPLETED,
  MeetingStatus.CANCELLED,
] as const;

const COMMISSION_MANAGER_ROLES: CommissionRole[] = [
  CommissionRole.SECRETARY,
  CommissionRole.CHAIRMAN,
];

const ACTIVE_MEETING_REGISTRATION_SELECT = {
  uuid: true,
  meetingUuid: true,
  slotUuid: true,
  status: true,
  registeredAt: true,
  updatedAt: true,
} satisfies Prisma.MeetingRegistrationSelect;

const MEETING_SUMMARY_SELECT = {
  uuid: true,
  date: true,
  slotMode: true,
  status: true,
  commission: {
    select: {
      type: true,
      name: true,
    },
  },
  slots: {
    select: {
      uuid: true,
      _count: {
        select: {
          registrations: {
            where: ACTIVE_REGISTRATION_WHERE,
          },
        },
      },
    },
  },
  _count: {
    select: {
      registrations: {
        where: ACTIVE_REGISTRATION_WHERE,
      },
      slots: true,
    },
  },
} satisfies Prisma.CommissionMeetingSelect;

const MEETING_DAY_DETAIL_SELECT = {
  uuid: true,
  date: true,
  slotMode: true,
  status: true,
  commission: {
    select: {
      type: true,
      name: true,
    },
  },
  notes: true,
  slots: {
    orderBy: { sortOrder: 'asc' as const },
    select: {
      uuid: true,
      startTime: true,
      endTime: true,
      _count: {
        select: {
          registrations: {
            where: ACTIVE_REGISTRATION_WHERE,
          },
        },
      },
    },
  },
  _count: {
    select: {
      registrations: {
        where: ACTIVE_REGISTRATION_WHERE,
      },
      slots: true,
    },
  },
} satisfies Prisma.CommissionMeetingSelect;

const MEETING_DETAIL_SELECT = {
  ...MEETING_DAY_DETAIL_SELECT,
  commissionUuid: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CommissionMeetingSelect;

const CREATED_REGISTRATION_SELECT = {
  uuid: true,
  meetingUuid: true,
  slotUuid: true,
  status: true,
  registeredAt: true,
  updatedAt: true,
} satisfies Prisma.MeetingRegistrationSelect;

const MY_MEETING_REGISTRATION_SELECT = {
  uuid: true,
  meetingUuid: true,
  slotUuid: true,
  status: true,
  assignedTime: true,
  registeredAt: true,
  updatedAt: true,
  meeting: {
    select: {
      uuid: true,
      date: true,
      slotMode: true,
      status: true,
      notes: true,
      commission: {
        select: {
          type: true,
          name: true,
        },
      },
    },
  },
  slot: {
    select: {
      uuid: true,
      startTime: true,
      endTime: true,
    },
  },
} satisfies Prisma.MeetingRegistrationSelect;

type MeetingSummaryRow = Prisma.CommissionMeetingGetPayload<{
  select: typeof MEETING_SUMMARY_SELECT;
}>;

type MeetingDayDetailRow = Prisma.CommissionMeetingGetPayload<{
  select: typeof MEETING_DAY_DETAIL_SELECT;
}>;

type MeetingDetailRow = Prisma.CommissionMeetingGetPayload<{
  select: typeof MEETING_DETAIL_SELECT;
}>;

type CreatedMeetingRegistration = Prisma.MeetingRegistrationGetPayload<{
  select: typeof CREATED_REGISTRATION_SELECT;
}>;

type MyMeetingRegistrationRow = Prisma.MeetingRegistrationGetPayload<{
  select: typeof MY_MEETING_REGISTRATION_SELECT;
}>;

type ActiveMeetingRegistration = Prisma.MeetingRegistrationGetPayload<{
  select: typeof ACTIVE_MEETING_REGISTRATION_SELECT;
}>;

type ApprovedApplicationRef = {
  instructorApplicationUuid: string | null;
  scoutApplicationUuid: string | null;
};

type CommissionManagerMembership = {
  commissionUuid: string;
  userUuid: string;
  role: CommissionRole;
};

type MeetingSlotInterval = {
  startTime: Date;
  endTime: Date;
};

type SlotCreateInput = {
  startTime: Date;
  endTime: Date;
  sortOrder: number;
};

function hasAnyApprovedApplication(
  approvedApplications: ApprovedApplicationRef | null,
): boolean {
  return Boolean(
    approvedApplications?.instructorApplicationUuid ||
    approvedApplications?.scoutApplicationUuid,
  );
}

function selectApprovedApplicationForCommissionType(
  approvedApplications: ApprovedApplicationRef | null,
  commissionType: CommissionType,
): ApprovedApplicationRef | null {
  if (!approvedApplications) {
    return null;
  }

  switch (commissionType) {
    case CommissionType.INSTRUCTOR:
      return approvedApplications.instructorApplicationUuid
        ? {
            instructorApplicationUuid:
              approvedApplications.instructorApplicationUuid,
            scoutApplicationUuid: null,
          }
        : null;
    case CommissionType.SCOUT:
      return approvedApplications.scoutApplicationUuid
        ? {
            instructorApplicationUuid: null,
            scoutApplicationUuid: approvedApplications.scoutApplicationUuid,
          }
        : null;
  }
}

function formatDateOnly(value: Date): string {
  return value.toISOString().split('T')[0] ?? '';
}

function parseIsoDateToUtcStart(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function toUtcDayStart(value: Date): Date {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
  );
}

function addUtcDays(value: Date, days: number): Date {
  const result = new Date(value.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function isWithinMeetingUtcDay(value: Date, meetingDate: Date): boolean {
  const dayStart = toUtcDayStart(meetingDate);
  const nextDayStart = addUtcDays(dayStart, 1);
  return value >= dayStart && value < nextDayStart;
}

function intersectsRange(
  a: MeetingSlotInterval,
  b: MeetingSlotInterval,
): boolean {
  return a.startTime < b.endTime && a.endTime > b.startTime;
}

@Injectable()
export class MeetingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: MeetingsAuditService,
  ) {}

  async listForScout(
    principal: AuthPrincipal,
    query: MeetingListQuery,
  ): Promise<MeetingListItem[]> {
    const user = await this.resolveUser(principal);
    const approvedApplications = await this.resolveApprovedApplicationRefs(
      this.prisma,
      user.uuid,
    );
    const where = this.buildMeetingWhere(query);
    const limit = query.limit ?? LIST_DEFAULT_LIMIT;

    const meetings = await this.prisma.commissionMeeting.findMany({
      where,
      select: MEETING_SUMMARY_SELECT,
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
      take: limit,
    });
    const myRegistrations = await this.listActiveRegistrationsForCandidate(
      this.prisma,
      user.uuid,
      meetings.map((meeting) => meeting.uuid),
    );

    return meetings.map((meeting) =>
      this.toMeetingListItem(
        meeting,
        myRegistrations.get(meeting.uuid) ?? null,
        approvedApplications,
      ),
    );
  }

  async listDetailsForScoutByDate(
    principal: AuthPrincipal,
    query: MeetingByDateQuery,
  ): Promise<MeetingDayDetailsResponse> {
    const user = await this.resolveUser(principal);
    const approvedApplications = await this.resolveApprovedApplicationRefs(
      this.prisma,
      user.uuid,
    );
    const meetingDate = parseIsoDateToUtcStart(query.date);

    const meetings = await this.prisma.commissionMeeting.findMany({
      where: {
        date: meetingDate,
        status: {
          in: [...SCOUT_VISIBLE_MEETING_STATUSES],
        },
      },
      select: MEETING_DAY_DETAIL_SELECT,
      orderBy: [{ createdAt: 'asc' }, { uuid: 'asc' }],
    });
    const myRegistrations = await this.listActiveRegistrationsForCandidate(
      this.prisma,
      user.uuid,
      meetings.map((meeting) => meeting.uuid),
    );

    return {
      date: query.date,
      meetings: meetings.map((meeting) =>
        this.toMeetingDayDetailItem(
          meeting,
          myRegistrations.get(meeting.uuid) ?? null,
          approvedApplications,
        ),
      ),
    };
  }

  async listMyRegistrationsForScout(
    principal: AuthPrincipal,
  ): Promise<MyMeetingRegistrationsResponse> {
    const user = await this.resolveUser(principal);
    const todayStart = toUtcDayStart(new Date());
    const registrations = await this.prisma.meetingRegistration.findMany({
      where: {
        candidateUuid: user.uuid,
        status: RegistrationStatus.REGISTERED,
        meeting: {
          date: {
            gte: todayStart,
          },
          status: {
            in: [...SCOUT_VISIBLE_MEETING_STATUSES],
          },
        },
      },
      select: MY_MEETING_REGISTRATION_SELECT,
    });

    const items = registrations
      .map((registration) => this.toMyMeetingRegistrationListItem(registration))
      .sort((left, right) => this.compareMyMeetingRegistrations(left, right));

    return {
      registrations: items,
    };
  }

  async getDetailForScout(
    principal: AuthPrincipal,
    meetingUuid: string,
  ): Promise<MeetingDetail> {
    const user = await this.resolveUser(principal);
    const approvedApplications = await this.resolveApprovedApplicationRefs(
      this.prisma,
      user.uuid,
    );

    const meeting = await this.prisma.commissionMeeting.findFirst({
      where: {
        uuid: meetingUuid,
        status: {
          in: [...SCOUT_VISIBLE_MEETING_STATUSES],
        },
      },
      select: MEETING_DETAIL_SELECT,
    });

    if (!meeting) {
      throw new NotFoundException({
        code: 'MEETING_NOT_FOUND',
        message: 'Meeting not found.',
      });
    }

    const myRegistration = await this.findActiveRegistrationForCandidate(
      this.prisma,
      user.uuid,
      meeting.uuid,
    );

    return this.toMeetingDetail(meeting, myRegistration, approvedApplications);
  }

  async createRegistration(
    principal: AuthPrincipal,
    meetingUuid: string,
    dto: MeetingRegistrationCreateBody,
    requestId?: string | null,
  ): Promise<MeetingRegistrationCreateResponse> {
    const user = await this.resolveUser(principal);

    try {
      const created = await this.withSerializableRetries(() =>
        this.prisma.$transaction(
          async (tx) => {
            const meeting = await tx.commissionMeeting.findUnique({
              where: { uuid: meetingUuid },
              select: {
                uuid: true,
                status: true,
                slotMode: true,
                commission: {
                  select: {
                    type: true,
                  },
                },
              },
            });

            if (!meeting) {
              throw new NotFoundException({
                code: 'MEETING_NOT_FOUND',
                message: 'Meeting not found.',
              });
            }

            if (meeting.status !== MeetingStatus.OPEN_FOR_REGISTRATION) {
              throw new ConflictException({
                code: 'MEETING_NOT_OPEN',
                message: 'Meeting is not open for registration.',
              });
            }

            const approvedApplications =
              await this.resolveApprovedApplicationRefs(tx, user.uuid);
            const approvedRef = selectApprovedApplicationForCommissionType(
              approvedApplications,
              meeting.commission.type,
            );

            if (!approvedRef) {
              if (!hasAnyApprovedApplication(approvedApplications)) {
                throw new ForbiddenException({
                  code: 'BOOKING_NOT_ALLOWED_STATUS',
                  message:
                    'Booking is allowed only after your application is accepted.',
                });
              }

              throw new ForbiddenException({
                code: 'BOOKING_NOT_ALLOWED_APPLICATION_TYPE',
                message:
                  'Booking is allowed only for meetings matching your approved application type.',
              });
            }

            await this.lockMeetingRow(tx, meetingUuid);
            await this.ensureNoActiveRegistrationForMeeting(
              tx,
              meetingUuid,
              user.uuid,
            );

            if (meeting.slotMode === SlotMode.SLOTS) {
              if (!dto.slotUuid) {
                throw new BadRequestException({
                  code: 'SLOT_UUID_REQUIRED',
                  message: 'slotUuid is required for SLOTS mode.',
                });
              }

              const slot = await tx.meetingSlot.findUnique({
                where: { uuid: dto.slotUuid },
                select: {
                  uuid: true,
                  meetingUuid: true,
                },
              });

              if (!slot || slot.meetingUuid !== meetingUuid) {
                throw new NotFoundException({
                  code: 'SLOT_NOT_FOUND',
                  message: 'Slot not found for this meeting.',
                });
              }

              await this.ensureMeetingSlotIsAvailable(
                tx,
                meetingUuid,
                slot.uuid,
              );

              const registration = await tx.meetingRegistration.create({
                select: CREATED_REGISTRATION_SELECT,
                data: {
                  meetingUuid,
                  candidateUuid: user.uuid,
                  status: RegistrationStatus.REGISTERED,
                  slotUuid: slot.uuid,
                  instructorApplicationUuid:
                    approvedRef.instructorApplicationUuid,
                  scoutApplicationUuid: approvedRef.scoutApplicationUuid,
                },
              });

              await this.auditService.log({
                principal,
                action: 'SLOT_BOOKED',
                targetType: 'MEETING_REGISTRATION',
                targetUuid: registration.uuid,
                requestId,
                metadata: {
                  meetingUuid: registration.meetingUuid,
                  slotUuid: registration.slotUuid,
                },
              });

              return registration;
            }

            if (dto.slotUuid) {
              throw new BadRequestException({
                code: 'SLOT_NOT_ALLOWED_FOR_DAY_ONLY',
                message: 'slotUuid must not be provided for DAY_ONLY mode.',
              });
            }

            const registration = await tx.meetingRegistration.create({
              select: CREATED_REGISTRATION_SELECT,
              data: {
                meetingUuid,
                candidateUuid: user.uuid,
                status: RegistrationStatus.REGISTERED,
                instructorApplicationUuid:
                  approvedRef.instructorApplicationUuid,
                scoutApplicationUuid: approvedRef.scoutApplicationUuid,
              },
            });

            await this.auditService.log({
              principal,
              action: 'SLOT_BOOKED',
              targetType: 'MEETING_REGISTRATION',
              targetUuid: registration.uuid,
              requestId,
              metadata: {
                meetingUuid: registration.meetingUuid,
                slotUuid: registration.slotUuid,
              },
            });

            return registration;
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        ),
      );

      return this.toMeetingRegistrationCreateResponse(created);
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException ||
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      if (this.isSlotConflict(error)) {
        throw new ConflictException({
          code: 'SLOT_ALREADY_BOOKED',
          message: 'Selected slot is already booked.',
        });
      }

      if (this.isMeetingCandidateConflict(error)) {
        throw new ConflictException({
          code: 'ALREADY_REGISTERED_FOR_MEETING',
          message: 'You already have an active registration for this meeting.',
        });
      }

      throw error;
    }
  }

  async cancelMyRegistration(
    principal: AuthPrincipal,
    meetingUuid: string,
    requestId?: string | null,
  ): Promise<MeetingRegistrationCancelResponse> {
    const user = await this.resolveUser(principal);

    return this.withSerializableRetries(() =>
      this.prisma.$transaction(
        async (tx) => {
          const registration = await tx.meetingRegistration.findFirst({
            where: {
              meetingUuid,
              candidateUuid: user.uuid,
              status: RegistrationStatus.REGISTERED,
            },
            select: {
              uuid: true,
              meetingUuid: true,
              status: true,
              slotUuid: true,
              registeredAt: true,
              updatedAt: true,
              meeting: {
                select: {
                  status: true,
                  date: true,
                },
              },
            },
          });

          if (!registration) {
            throw new NotFoundException({
              code: 'REGISTRATION_NOT_FOUND',
              message: 'Active meeting registration not found.',
            });
          }

          if (
            registration.meeting.status !== MeetingStatus.OPEN_FOR_REGISTRATION
          ) {
            throw new ConflictException({
              code: 'MEETING_NOT_OPEN',
              message: 'Meeting is not open for registration.',
            });
          }

          if (
            !this.isSelfCancellationAllowedByMeetingDate(
              registration.meeting.date,
              new Date(),
            )
          ) {
            throw new ConflictException({
              code: 'CANCELLATION_DEADLINE_PASSED',
              message:
                'Registration cannot be canceled from the day before the meeting date.',
            });
          }

          const updated = await tx.meetingRegistration.update({
            where: { uuid: registration.uuid },
            data: {
              status: RegistrationStatus.CANCELLED,
            },
            select: CREATED_REGISTRATION_SELECT,
          });

          await this.auditService.log({
            principal,
            action: 'SLOT_CANCELED',
            targetType: 'MEETING_REGISTRATION',
            targetUuid: updated.uuid,
            requestId,
            metadata: {
              meetingUuid: updated.meetingUuid,
              slotUuid: updated.slotUuid,
            },
          });

          return this.toMeetingRegistrationSummary(updated);
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      ),
    );
  }

  async createMeeting(
    principal: AuthPrincipal,
    dto: CreateMeetingBody,
    requestId?: string | null,
  ): Promise<CreateMeetingResponse> {
    const membership = await this.resolveManagerMembershipForCommission(
      principal,
      dto.commissionUuid,
    );
    const date = parseIsoDateToUtcStart(dto.date);

    const created = await this.prisma.$transaction(async (tx) => {
      const meeting = await tx.commissionMeeting.create({
        data: {
          commissionUuid: membership.commissionUuid,
          createdByUuid: membership.userUuid,
          date,
          slotMode: dto.slotMode,
          status: MeetingStatus.OPEN_FOR_REGISTRATION,
          notes: dto.notes ?? null,
        },
        select: {
          uuid: true,
          commissionUuid: true,
          date: true,
          slotMode: true,
          status: true,
          notes: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      await this.auditService.log({
        principal,
        action: 'MEETING_CREATED',
        targetType: 'MEETING',
        targetUuid: meeting.uuid,
        requestId,
        metadata: {
          commissionUuid: meeting.commissionUuid,
          slotMode: meeting.slotMode,
          date: formatDateOnly(meeting.date),
        },
      });

      return meeting;
    });

    return {
      uuid: created.uuid,
      commissionUuid: created.commissionUuid,
      date: formatDateOnly(created.date),
      slotMode: created.slotMode,
      status: created.status,
      notes: created.notes,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };
  }

  async createSlots(
    principal: AuthPrincipal,
    meetingUuid: string,
    dto: CreateMeetingSlotsBody,
    requestId?: string | null,
  ): Promise<CreateMeetingSlotsResponse> {
    return this.prisma.$transaction(
      async (tx) => {
        const meeting = await tx.commissionMeeting.findUnique({
          where: { uuid: meetingUuid },
          select: {
            uuid: true,
            commissionUuid: true,
            date: true,
            slotMode: true,
            status: true,
          },
        });

        if (!meeting) {
          throw new NotFoundException({
            code: 'MEETING_NOT_FOUND',
            message: 'Meeting not found.',
          });
        }

        await this.ensureManagerMembershipForCommission(
          principal,
          meeting.commissionUuid,
          tx,
        );

        if (meeting.slotMode !== SlotMode.SLOTS) {
          throw new BadRequestException({
            code: 'SLOTS_NOT_ALLOWED_FOR_DAY_ONLY',
            message: 'Cannot define slots for DAY_ONLY meetings.',
          });
        }

        if (meeting.status !== MeetingStatus.OPEN_FOR_REGISTRATION) {
          throw new ConflictException({
            code: 'MEETING_NOT_OPEN',
            message: 'Meeting must be open for registration to manage slots.',
          });
        }

        await this.lockMeetingRow(tx, meetingUuid);

        const existingSlots = await tx.meetingSlot.findMany({
          where: { meetingUuid },
          select: {
            uuid: true,
            startTime: true,
            endTime: true,
            sortOrder: true,
          },
          orderBy: [{ sortOrder: 'asc' }, { startTime: 'asc' }],
        });

        const newIntervals = dto.slots.map((slot) => ({
          startTime: new Date(slot.startTime),
          endTime: new Date(slot.endTime),
        }));
        this.ensureSlotIntervalsValid(newIntervals);
        this.ensureSlotIntervalsMatchMeetingDate(newIntervals, meeting.date);
        this.ensureSlotsDoNotOverlap(newIntervals, existingSlots);

        const startSortOrder = existingSlots.length;
        const slotsToCreate: SlotCreateInput[] = newIntervals
          .slice()
          .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
          .map((slot, index) => ({
            startTime: slot.startTime,
            endTime: slot.endTime,
            sortOrder: startSortOrder + index,
          }));

        await tx.meetingSlot.createMany({
          data: slotsToCreate.map((slot) => ({
            meetingUuid,
            startTime: slot.startTime,
            endTime: slot.endTime,
            sortOrder: slot.sortOrder,
          })),
        });

        const slots = await tx.meetingSlot.findMany({
          where: { meetingUuid },
          select: {
            uuid: true,
            startTime: true,
            endTime: true,
            sortOrder: true,
            registrations: {
              where: ACTIVE_REGISTRATION_WHERE,
              select: { uuid: true },
            },
          },
          orderBy: [{ sortOrder: 'asc' }, { startTime: 'asc' }],
        });

        await this.auditService.log({
          principal,
          action: 'SLOTS_CREATED',
          targetType: 'MEETING',
          targetUuid: meetingUuid,
          requestId,
          metadata: {
            createdSlotsCount: slotsToCreate.length,
          },
        });

        return {
          meetingUuid,
          slots: slots.map((slot) => ({
            uuid: slot.uuid,
            startTime: slot.startTime.toISOString(),
            endTime: slot.endTime.toISOString(),
            sortOrder: slot.sortOrder,
            isBooked: slot.registrations.length > 0,
          })),
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async listMeetingRegistrations(
    principal: AuthPrincipal,
    meetingUuid: string,
  ): Promise<MeetingRegistrationListResponse> {
    const meeting = await this.prisma.commissionMeeting.findUnique({
      where: { uuid: meetingUuid },
      select: {
        uuid: true,
        commissionUuid: true,
      },
    });

    if (!meeting) {
      throw new NotFoundException({
        code: 'MEETING_NOT_FOUND',
        message: 'Meeting not found.',
      });
    }

    await this.ensureManagerMembershipForCommission(
      principal,
      meeting.commissionUuid,
      this.prisma,
    );

    const registrations = await this.prisma.meetingRegistration.findMany({
      where: {
        meetingUuid,
        status: RegistrationStatus.REGISTERED,
      },
      select: {
        uuid: true,
        meetingUuid: true,
        slotUuid: true,
        status: true,
        assignedTime: true,
        registeredAt: true,
        updatedAt: true,
        instructorApplicationUuid: true,
        scoutApplicationUuid: true,
        candidate: {
          select: {
            uuid: true,
            firstName: true,
            surname: true,
            email: true,
          },
        },
        slot: {
          select: {
            uuid: true,
            startTime: true,
            endTime: true,
            sortOrder: true,
          },
        },
      },
      orderBy: [{ slot: { startTime: 'asc' } }, { registeredAt: 'asc' }],
    });

    return {
      meetingUuid,
      registrations: registrations.map((registration) => ({
        uuid: registration.uuid,
        meetingUuid: registration.meetingUuid,
        slotUuid: registration.slotUuid,
        status: registration.status,
        assignedTime: registration.assignedTime?.toISOString() ?? null,
        registeredAt: registration.registeredAt.toISOString(),
        updatedAt: registration.updatedAt.toISOString(),
        candidate: {
          uuid: registration.candidate.uuid,
          firstName: registration.candidate.firstName,
          surname: registration.candidate.surname,
          email: registration.candidate.email,
        },
        slot: registration.slot
          ? {
              uuid: registration.slot.uuid,
              startTime: registration.slot.startTime.toISOString(),
              endTime: registration.slot.endTime.toISOString(),
              sortOrder: registration.slot.sortOrder,
              isBooked: true,
            }
          : null,
        application: registration.instructorApplicationUuid
          ? {
              type: 'INSTRUCTOR',
              uuid: registration.instructorApplicationUuid,
            }
          : registration.scoutApplicationUuid
            ? {
                type: 'SCOUT',
                uuid: registration.scoutApplicationUuid,
              }
            : null,
      })),
    };
  }

  async cancelRegistration(
    principal: AuthPrincipal,
    meetingUuid: string,
    registrationUuid: string,
    requestId?: string | null,
  ): Promise<MeetingRegistrationCancelResponse> {
    return this.prisma.$transaction(
      async (tx) => {
        const registration = await tx.meetingRegistration.findUnique({
          where: { uuid: registrationUuid },
          select: {
            uuid: true,
            meetingUuid: true,
            status: true,
            slotUuid: true,
            registeredAt: true,
            updatedAt: true,
            meeting: {
              select: {
                commissionUuid: true,
              },
            },
          },
        });

        if (!registration || registration.meetingUuid !== meetingUuid) {
          throw new NotFoundException({
            code: 'REGISTRATION_NOT_FOUND',
            message: 'Meeting registration not found.',
          });
        }

        await this.ensureManagerMembershipForCommission(
          principal,
          registration.meeting.commissionUuid,
          tx,
        );

        if (registration.status !== RegistrationStatus.REGISTERED) {
          throw new ConflictException({
            code: 'REGISTRATION_NOT_ACTIVE',
            message: 'Only active registrations can be canceled.',
          });
        }

        const updated = await tx.meetingRegistration.update({
          where: { uuid: registrationUuid },
          data: {
            status: RegistrationStatus.CANCELLED,
          },
          select: CREATED_REGISTRATION_SELECT,
        });

        await this.auditService.log({
          principal,
          action: 'SLOT_CANCELED',
          targetType: 'MEETING_REGISTRATION',
          targetUuid: updated.uuid,
          requestId,
          metadata: {
            meetingUuid: updated.meetingUuid,
            slotUuid: updated.slotUuid,
          },
        });

        return this.toMeetingRegistrationSummary(updated);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async reassignRegistration(
    principal: AuthPrincipal,
    meetingUuid: string,
    registrationUuid: string,
    dto: MeetingRegistrationReassignBody,
    requestId?: string | null,
  ): Promise<MeetingRegistrationReassignResponse> {
    try {
      return await this.withSerializableRetries(() =>
        this.prisma.$transaction(
          async (tx) => {
            const registration = await tx.meetingRegistration.findUnique({
              where: { uuid: registrationUuid },
              select: {
                uuid: true,
                meetingUuid: true,
                status: true,
                slotUuid: true,
                registeredAt: true,
                updatedAt: true,
                meeting: {
                  select: {
                    commissionUuid: true,
                    date: true,
                    slotMode: true,
                  },
                },
              },
            });

            if (!registration || registration.meetingUuid !== meetingUuid) {
              throw new NotFoundException({
                code: 'REGISTRATION_NOT_FOUND',
                message: 'Meeting registration not found.',
              });
            }

            await this.ensureManagerMembershipForCommission(
              principal,
              registration.meeting.commissionUuid,
              tx,
            );

            if (registration.status !== RegistrationStatus.REGISTERED) {
              throw new ConflictException({
                code: 'REGISTRATION_NOT_ACTIVE',
                message: 'Only active registrations can be reassigned.',
              });
            }

            await this.lockMeetingRow(tx, meetingUuid);

            let updated: CreatedMeetingRegistration;

            if (registration.meeting.slotMode === SlotMode.SLOTS) {
              if (!dto.toSlotUuid) {
                throw new BadRequestException({
                  code: 'TO_SLOT_UUID_REQUIRED',
                  message: 'toSlotUuid is required for SLOTS meetings.',
                });
              }

              if (dto.assignedTime) {
                throw new BadRequestException({
                  code: 'ASSIGNED_TIME_NOT_ALLOWED_FOR_SLOTS',
                  message:
                    'assignedTime must not be provided for SLOTS meetings.',
                });
              }

              const targetSlot = await tx.meetingSlot.findUnique({
                where: { uuid: dto.toSlotUuid },
                select: {
                  uuid: true,
                  meetingUuid: true,
                },
              });

              if (!targetSlot || targetSlot.meetingUuid !== meetingUuid) {
                throw new NotFoundException({
                  code: 'SLOT_NOT_FOUND',
                  message: 'Target slot not found for this meeting.',
                });
              }

              await this.ensureMeetingSlotIsAvailable(
                tx,
                meetingUuid,
                targetSlot.uuid,
                registrationUuid,
              );

              updated = await tx.meetingRegistration.update({
                where: { uuid: registrationUuid },
                data: {
                  slotUuid: targetSlot.uuid,
                  assignedTime: null,
                },
                select: CREATED_REGISTRATION_SELECT,
              });
            } else {
              if (dto.toSlotUuid) {
                throw new BadRequestException({
                  code: 'TO_SLOT_UUID_NOT_ALLOWED_FOR_DAY_ONLY',
                  message:
                    'toSlotUuid must not be provided for DAY_ONLY meetings.',
                });
              }

              const assignedTime = dto.assignedTime
                ? new Date(dto.assignedTime)
                : null;

              if (assignedTime) {
                this.ensureAssignedTimeMatchesMeetingDate(
                  assignedTime,
                  registration.meeting.date,
                );
              }

              updated = await tx.meetingRegistration.update({
                where: { uuid: registrationUuid },
                data: {
                  slotUuid: null,
                  assignedTime,
                },
                select: CREATED_REGISTRATION_SELECT,
              });
            }

            await this.auditService.log({
              principal,
              action: 'SLOT_REASSIGNED',
              targetType: 'MEETING_REGISTRATION',
              targetUuid: updated.uuid,
              requestId,
              metadata: {
                meetingUuid: updated.meetingUuid,
                previousSlotUuid: registration.slotUuid,
                newSlotUuid: updated.slotUuid,
              },
            });

            return this.toMeetingRegistrationSummary(updated);
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        ),
      );
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException ||
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      if (this.isSlotConflict(error)) {
        throw new ConflictException({
          code: 'SLOT_ALREADY_BOOKED',
          message: 'Selected slot is already booked.',
        });
      }

      throw error;
    }
  }

  private buildMeetingWhere(
    query: MeetingListQuery,
  ): Prisma.CommissionMeetingWhereInput {
    const now = new Date();
    const todayUtc = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const fromDate = query.fromDate
      ? parseIsoDateToUtcStart(query.fromDate)
      : addUtcDays(todayUtc, LIST_DEFAULT_FROM_DAYS);
    const toDate = query.toDate
      ? parseIsoDateToUtcStart(query.toDate)
      : addUtcDays(todayUtc, LIST_DEFAULT_TO_DAYS);

    return {
      date: {
        gte: fromDate,
        lte: toDate,
      },
      status: {
        in: [...SCOUT_VISIBLE_MEETING_STATUSES],
      },
    };
  }

  private toMeetingListItem(
    meeting: MeetingSummaryRow,
    myRegistration: ActiveMeetingRegistration | null,
    approvedApplications: ApprovedApplicationRef | null,
  ): MeetingListItem {
    const hasApprovedApplication =
      hasAnyApprovedApplication(approvedApplications);
    const hasMatchingApprovedApplication = Boolean(
      selectApprovedApplicationForCommissionType(
        approvedApplications,
        meeting.commission.type,
      ),
    );
    const totalSlots =
      meeting.slotMode === SlotMode.SLOTS ? meeting._count.slots : 0;
    const availableSlots =
      meeting.slotMode === SlotMode.SLOTS
        ? meeting.slots.filter((slot) => slot._count.registrations === 0).length
        : 0;

    return this.buildMeetingSummaryState(
      {
        uuid: meeting.uuid,
        date: meeting.date,
        slotMode: meeting.slotMode,
        status: meeting.status,
        commissionType: meeting.commission.type,
        commissionName: meeting.commission.name,
        totalSlots,
        availableSlots,
        registrationsCount: meeting._count.registrations,
      },
      myRegistration,
      hasApprovedApplication,
      hasMatchingApprovedApplication,
    );
  }

  private toMeetingDayDetailItem(
    meeting: MeetingDayDetailRow,
    myRegistration: ActiveMeetingRegistration | null,
    approvedApplications: ApprovedApplicationRef | null,
  ): MeetingDayDetailItem {
    const hasApprovedApplication =
      hasAnyApprovedApplication(approvedApplications);
    const hasMatchingApprovedApplication = Boolean(
      selectApprovedApplicationForCommissionType(
        approvedApplications,
        meeting.commission.type,
      ),
    );
    const summary = this.buildMeetingSummaryState(
      {
        uuid: meeting.uuid,
        date: meeting.date,
        slotMode: meeting.slotMode,
        status: meeting.status,
        commissionType: meeting.commission.type,
        commissionName: meeting.commission.name,
        totalSlots:
          meeting.slotMode === SlotMode.SLOTS ? meeting._count.slots : 0,
        availableSlots:
          meeting.slotMode === SlotMode.SLOTS
            ? meeting.slots.filter((slot) => slot._count.registrations === 0)
                .length
            : 0,
        registrationsCount: meeting._count.registrations,
      },
      myRegistration,
      hasApprovedApplication,
      hasMatchingApprovedApplication,
    );

    return {
      ...summary,
      notes: meeting.notes,
      slots: meeting.slots.map((slot) => ({
        uuid: slot.uuid,
        startTime: slot.startTime.toISOString(),
        endTime: slot.endTime.toISOString(),
        isBooked: slot._count.registrations > 0,
        bookedByMe: myRegistration?.slotUuid === slot.uuid,
      })),
    };
  }

  private toMeetingDetail(
    meeting: MeetingDetailRow,
    myRegistration: ActiveMeetingRegistration | null,
    approvedApplications: ApprovedApplicationRef | null,
  ): MeetingDetail {
    const base = this.toMeetingDayDetailItem(
      meeting,
      myRegistration,
      approvedApplications,
    );

    return {
      ...base,
      commissionUuid: meeting.commissionUuid,
      createdAt: meeting.createdAt.toISOString(),
      updatedAt: meeting.updatedAt.toISOString(),
      myRegistration: myRegistration
        ? {
            uuid: myRegistration.uuid,
            meetingUuid: myRegistration.meetingUuid,
            slotUuid: myRegistration.slotUuid,
            status: myRegistration.status,
            registeredAt: myRegistration.registeredAt.toISOString(),
            updatedAt: myRegistration.updatedAt.toISOString(),
          }
        : null,
    };
  }

  private toMyMeetingRegistrationListItem(
    registration: MyMeetingRegistrationRow,
  ): MyMeetingRegistrationListItem {
    return {
      registrationUuid: registration.uuid,
      meetingUuid: registration.meetingUuid,
      date: formatDateOnly(registration.meeting.date),
      slotMode: registration.meeting.slotMode,
      status: registration.meeting.status,
      commissionType: registration.meeting.commission.type,
      commissionName: registration.meeting.commission.name,
      notes: registration.meeting.notes,
      assignedTime: registration.assignedTime?.toISOString() ?? null,
      registeredAt: registration.registeredAt.toISOString(),
      canCancelMyRegistration:
        registration.meeting.status === MeetingStatus.OPEN_FOR_REGISTRATION &&
        this.isSelfCancellationAllowedByMeetingDate(
          registration.meeting.date,
          new Date(),
        ),
      slot: registration.slot
        ? {
            uuid: registration.slot.uuid,
            startTime: registration.slot.startTime.toISOString(),
            endTime: registration.slot.endTime.toISOString(),
          }
        : null,
    };
  }

  private compareMyMeetingRegistrations(
    left: MyMeetingRegistrationListItem,
    right: MyMeetingRegistrationListItem,
  ): number {
    const leftSortValue = this.resolveMyMeetingRegistrationSortValue(left);
    const rightSortValue = this.resolveMyMeetingRegistrationSortValue(right);

    if (leftSortValue !== rightSortValue) {
      return leftSortValue - rightSortValue;
    }

    if (left.date !== right.date) {
      return left.date.localeCompare(right.date);
    }

    return left.registrationUuid.localeCompare(right.registrationUuid);
  }

  private resolveMyMeetingRegistrationSortValue(
    registration: MyMeetingRegistrationListItem,
  ): number {
    if (registration.slot) {
      return new Date(registration.slot.startTime).getTime();
    }

    if (registration.assignedTime) {
      return new Date(registration.assignedTime).getTime();
    }

    return parseIsoDateToUtcStart(registration.date).getTime();
  }

  private buildMeetingSummaryState(
    meeting: {
      uuid: string;
      date: Date;
      slotMode: SlotMode;
      status: MeetingStatus;
      commissionType: CommissionType;
      commissionName: string | null;
      totalSlots: number;
      availableSlots: number;
      registrationsCount: number;
    },
    myRegistration: ActiveMeetingRegistration | null,
    hasApprovedApplication: boolean,
    hasMatchingApprovedApplication: boolean,
  ): MeetingListItem {
    const canCancelMyRegistration =
      Boolean(myRegistration) &&
      meeting.status === MeetingStatus.OPEN_FOR_REGISTRATION &&
      this.isSelfCancellationAllowedByMeetingDate(meeting.date, new Date());
    const hasAnyFreeSlot =
      meeting.slotMode === SlotMode.DAY_ONLY
        ? true
        : meeting.availableSlots > 0;

    const canBook =
      hasMatchingApprovedApplication &&
      meeting.status === MeetingStatus.OPEN_FOR_REGISTRATION &&
      !myRegistration &&
      hasAnyFreeSlot;

    let bookingBlockedReasonCode: MeetingBookingBlockedReasonCode | null = null;
    if (!hasApprovedApplication) {
      bookingBlockedReasonCode = 'NOT_APPROVED_APPLICATION';
    } else if (!hasMatchingApprovedApplication) {
      bookingBlockedReasonCode = 'NO_MATCHING_APPROVED_APPLICATION';
    } else if (meeting.status !== MeetingStatus.OPEN_FOR_REGISTRATION) {
      bookingBlockedReasonCode = 'MEETING_NOT_OPEN';
    } else if (myRegistration) {
      bookingBlockedReasonCode = 'ALREADY_REGISTERED';
    } else if (!hasAnyFreeSlot) {
      bookingBlockedReasonCode = 'NO_FREE_SLOTS';
    }

    return {
      uuid: meeting.uuid,
      date: formatDateOnly(meeting.date),
      slotMode: meeting.slotMode,
      status: meeting.status,
      commissionType: meeting.commissionType,
      commissionName: meeting.commissionName,
      totalSlots: meeting.totalSlots,
      availableSlots: meeting.availableSlots,
      registrationsCount: meeting.registrationsCount,
      canBook,
      bookingBlockedReasonCode,
      myRegistrationUuid: myRegistration?.uuid ?? null,
      canCancelMyRegistration,
    };
  }

  private isSelfCancellationAllowedByMeetingDate(
    meetingDate: Date,
    now: Date,
  ): boolean {
    const cancellationBlockedFrom = addUtcDays(
      meetingDate,
      -SELF_CANCELLATION_BLOCK_START_DAYS_BEFORE_MEETING,
    );
    return now < cancellationBlockedFrom;
  }

  private async listActiveRegistrationsForCandidate(
    tx: Prisma.TransactionClient | PrismaService,
    candidateUuid: string,
    meetingUuids: string[],
  ): Promise<Map<string, ActiveMeetingRegistration>> {
    if (meetingUuids.length === 0) {
      return new Map();
    }

    const registrations = await tx.meetingRegistration.findMany({
      where: {
        candidateUuid,
        status: RegistrationStatus.REGISTERED,
        meetingUuid: {
          in: meetingUuids,
        },
      },
      select: ACTIVE_MEETING_REGISTRATION_SELECT,
    });

    return new Map(
      registrations.map((registration) => [
        registration.meetingUuid,
        registration,
      ]),
    );
  }

  private async findActiveRegistrationForCandidate(
    tx: Prisma.TransactionClient | PrismaService,
    candidateUuid: string,
    meetingUuid: string,
  ): Promise<ActiveMeetingRegistration | null> {
    return tx.meetingRegistration.findFirst({
      where: {
        candidateUuid,
        meetingUuid,
        status: RegistrationStatus.REGISTERED,
      },
      select: ACTIVE_MEETING_REGISTRATION_SELECT,
    });
  }

  private toMeetingRegistrationCreateResponse(
    registration: CreatedMeetingRegistration,
  ): MeetingRegistrationCreateResponse {
    return {
      uuid: registration.uuid,
      meetingUuid: registration.meetingUuid,
      slotUuid: registration.slotUuid,
      status: registration.status,
      registeredAt: registration.registeredAt.toISOString(),
      updatedAt: registration.updatedAt.toISOString(),
    };
  }

  private toMeetingRegistrationSummary(
    registration: CreatedMeetingRegistration,
  ): MeetingRegistrationSummary {
    return {
      uuid: registration.uuid,
      meetingUuid: registration.meetingUuid,
      slotUuid: registration.slotUuid,
      status: registration.status,
      registeredAt: registration.registeredAt.toISOString(),
      updatedAt: registration.updatedAt.toISOString(),
    };
  }

  private async resolveUser(
    principal: AuthPrincipal,
  ): Promise<{ uuid: string }> {
    const user = await this.prisma.user.findUnique({
      where: { keycloakUuid: principal.sub },
      select: { uuid: true },
    });

    if (!user) {
      throw new NotFoundException({
        code: 'PROFILE_REQUIRED',
        message: 'Profil nie istnieje. Uzupełnij go w Dashboard.',
      });
    }

    return user;
  }

  private async resolveManagerMembershipForCommission(
    principal: AuthPrincipal,
    commissionUuid: string,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<CommissionManagerMembership> {
    const membership = await tx.commissionMember.findFirst({
      where: {
        commissionUuid,
        user: {
          keycloakUuid: principal.sub,
        },
        status: Status.ACTIVE,
        leftAt: null,
        role: {
          in: COMMISSION_MANAGER_ROLES,
        },
        commission: {
          status: Status.ACTIVE,
        },
      },
      select: {
        commissionUuid: true,
        userUuid: true,
        role: true,
      },
      orderBy: { joinedAt: 'desc' },
    });

    if (!membership) {
      throw new ForbiddenException({
        code: 'INSUFFICIENT_COMMISSION_ROLE',
        message:
          'Only commission secretary or chairman can manage meetings for this commission.',
      });
    }

    return membership;
  }

  private async ensureManagerMembershipForCommission(
    principal: AuthPrincipal,
    commissionUuid: string,
    tx: Prisma.TransactionClient | PrismaService,
  ): Promise<void> {
    await this.resolveManagerMembershipForCommission(principal, commissionUuid, tx);
  }

  private async resolveApprovedApplicationRefs(
    tx: Prisma.TransactionClient | PrismaService,
    candidateUuid: string,
  ): Promise<ApprovedApplicationRef | null> {
    const [instructor, scout] = await Promise.all([
      tx.instructorApplication.findFirst({
        where: {
          candidateUuid,
          status: ApplicationStatus.APPROVED,
        },
        orderBy: { updatedAt: 'desc' },
        select: { uuid: true },
      }),
      tx.scoutApplication.findFirst({
        where: {
          candidateUuid,
          status: ApplicationStatus.APPROVED,
        },
        orderBy: { updatedAt: 'desc' },
        select: { uuid: true },
      }),
    ]);

    if (!instructor && !scout) {
      return null;
    }

    return {
      instructorApplicationUuid: instructor?.uuid ?? null,
      scoutApplicationUuid: scout?.uuid ?? null,
    };
  }

  private ensureSlotIntervalsMatchMeetingDate(
    slots: MeetingSlotInterval[],
    meetingDate: Date,
  ): void {
    for (const slot of slots) {
      if (
        !isWithinMeetingUtcDay(slot.startTime, meetingDate) ||
        !isWithinMeetingUtcDay(slot.endTime, meetingDate)
      ) {
        throw new BadRequestException({
          code: 'SLOT_OUTSIDE_MEETING_DATE',
          message: 'Slot startTime and endTime must fall on the meeting date.',
        });
      }
    }
  }

  private ensureAssignedTimeMatchesMeetingDate(
    assignedTime: Date,
    meetingDate: Date,
  ): void {
    if (isWithinMeetingUtcDay(assignedTime, meetingDate)) {
      return;
    }

    throw new BadRequestException({
      code: 'ASSIGNED_TIME_OUTSIDE_MEETING_DATE',
      message: 'assignedTime must fall on the meeting date.',
    });
  }

  private ensureSlotIntervalsValid(slots: MeetingSlotInterval[]): void {
    for (const slot of slots) {
      if (
        Number.isNaN(slot.startTime.getTime()) ||
        Number.isNaN(slot.endTime.getTime())
      ) {
        throw new BadRequestException({
          code: 'SLOT_INVALID_DATETIME',
          message: 'Slot startTime and endTime must be valid ISO datetimes.',
        });
      }

      if (slot.startTime >= slot.endTime) {
        throw new BadRequestException({
          code: 'SLOT_INVALID_RANGE',
          message: 'Slot startTime must be earlier than endTime.',
        });
      }
    }
  }

  private ensureSlotsDoNotOverlap(
    incoming: MeetingSlotInterval[],
    existing: MeetingSlotInterval[],
  ): void {
    const sorted = incoming
      .slice()
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    for (let i = 1; i < sorted.length; i += 1) {
      if (intersectsRange(sorted[i - 1], sorted[i])) {
        throw new ConflictException({
          code: 'SLOT_OVERLAP',
          message: 'Provided slots overlap with each other.',
        });
      }
    }

    for (const slot of incoming) {
      const overlappingExisting = existing.some((current) =>
        intersectsRange(slot, current),
      );
      if (overlappingExisting) {
        throw new ConflictException({
          code: 'SLOT_OVERLAP',
          message: 'Provided slots overlap with existing meeting slots.',
        });
      }
    }
  }

  private async lockMeetingRow(
    tx: Prisma.TransactionClient,
    meetingUuid: string,
  ): Promise<void> {
    await tx.$executeRaw(
      Prisma.sql`
        SELECT 1
          FROM "CommissionMeeting"
         WHERE "uuid" = ${meetingUuid}::uuid
         FOR UPDATE
        `,
    );
  }

  private async ensureNoActiveRegistrationForMeeting(
    tx: Prisma.TransactionClient,
    meetingUuid: string,
    candidateUuid: string,
  ): Promise<void> {
    const existingRegistration = await tx.meetingRegistration.findFirst({
      where: {
        meetingUuid,
        candidateUuid,
        status: RegistrationStatus.REGISTERED,
      },
      select: { uuid: true },
    });

    if (!existingRegistration) {
      return;
    }

    throw new ConflictException({
      code: 'ALREADY_REGISTERED_FOR_MEETING',
      message: 'You already have an active registration for this meeting.',
    });
  }

  private async ensureMeetingSlotIsAvailable(
    tx: Prisma.TransactionClient,
    meetingUuid: string,
    slotUuid: string,
    excludedRegistrationUuid?: string,
  ): Promise<void> {
    const existingRegistration = await tx.meetingRegistration.findFirst({
      where: {
        meetingUuid,
        slotUuid,
        status: RegistrationStatus.REGISTERED,
        ...(excludedRegistrationUuid
          ? {
              uuid: {
                not: excludedRegistrationUuid,
              },
            }
          : {}),
      },
      select: { uuid: true },
    });

    if (!existingRegistration) {
      return;
    }

    throw new ConflictException({
      code: 'SLOT_ALREADY_BOOKED',
      message: 'Selected slot is already booked.',
    });
  }

  private async withSerializableRetries<T>(run: () => Promise<T>): Promise<T> {
    for (
      let attempt = 1;
      attempt <= SERIALIZABLE_RETRY_ATTEMPTS;
      attempt += 1
    ) {
      try {
        return await run();
      } catch (error) {
        if (
          !this.isSerializationConflict(error) ||
          attempt === SERIALIZABLE_RETRY_ATTEMPTS
        ) {
          throw error;
        }

        await new Promise((resolve) =>
          setTimeout(resolve, SERIALIZABLE_RETRY_DELAY_MS * attempt),
        );
      }
    }

    throw new ConflictException({
      code: 'CONCURRENCY_CONFLICT',
      message:
        'Request conflicted with concurrent updates. Retry the operation.',
    });
  }

  private isSerializationConflict(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2034'
    );
  }

  private isSlotConflict(error: unknown): boolean {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
      return false;
    }

    if (error.code !== 'P2002') {
      return false;
    }

    const target = (error.meta as { target?: unknown } | undefined)?.target;
    const text = Array.isArray(target)
      ? target.join(',')
      : typeof target === 'string'
        ? target
        : JSON.stringify(error.meta ?? {});

    return (
      text.includes('MeetingRegistration_active_slot_unique') ||
      text.includes('slotUuid')
    );
  }

  private isMeetingCandidateConflict(error: unknown): boolean {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
      return false;
    }

    if (error.code !== 'P2002') {
      return false;
    }

    const target = (error.meta as { target?: unknown } | undefined)?.target;
    const text = Array.isArray(target)
      ? target.join(',')
      : typeof target === 'string'
        ? target
        : JSON.stringify(error.meta ?? {});

    return (
      text.includes('MeetingRegistration_active_meeting_candidate_unique') ||
      (text.includes('meetingUuid') && text.includes('candidateUuid'))
    );
  }
}
