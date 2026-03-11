// @file: apps/api/src/modules/meetings/meetings.service.spec.ts
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  CommissionRole,
  CommissionType,
  MeetingStatus,
  RegistrationStatus,
  SlotMode,
} from '@hss/database';
import type { AuthPrincipal } from '@hss/schemas';

jest.mock(
  '@/database/prisma/prisma.service',
  () => ({
    PrismaService: class PrismaService {},
  }),
  { virtual: true },
);

jest.mock('./meetings-audit.service', () => ({
  MeetingsAuditService: class MeetingsAuditService {
    log = jest.fn();
  },
}));

import { MeetingsService } from './meetings.service';

const PRINCIPAL: AuthPrincipal = {
  sub: '11111111-1111-1111-1111-111111111111',
  realmRoles: [],
  clientRoles: [],
};

const USER_UUID = '22222222-2222-2222-2222-222222222222';
const MEETING_UUID = '33333333-3333-3333-3333-333333333333';
const REGISTRATION_UUID = '44444444-4444-4444-4444-444444444444';
const INSTRUCTOR_APPLICATION_UUID = '55555555-5555-5555-5555-555555555555';
const SCOUT_APPLICATION_UUID = '66666666-6666-6666-6666-666666666666';
const SLOT_UUID = '77777777-7777-7777-7777-777777777777';
const COMMISSION_UUID = '88888888-8888-8888-8888-888888888888';
const MEMBERSHIP_UUID = '99999999-9999-9999-9999-999999999999';
const SECOND_MEETING_UUID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const SECOND_REGISTRATION_UUID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const SECOND_SLOT_UUID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

function createMeetingListRow(
  commissionType: CommissionType,
  overrides: Partial<{
    date: Date;
    slotMode: SlotMode;
    status: MeetingStatus;
    notes: string | null;
    commissionName: string | null;
  }> = {},
) {
  const defaultCommissionName =
    commissionType === CommissionType.INSTRUCTOR
      ? 'Komisja Instruktorska'
      : 'Kapituła Stopni Harcerskich';

  return {
    uuid: MEETING_UUID,
    date: overrides.date ?? new Date('2026-05-12T00:00:00.000Z'),
    slotMode: overrides.slotMode ?? SlotMode.DAY_ONLY,
    status: overrides.status ?? MeetingStatus.OPEN_FOR_REGISTRATION,
    commission: {
      type: commissionType,
      name: overrides.commissionName ?? defaultCommissionName,
    },
    notes: overrides.notes ?? null,
    slots: [],
    _count: {
      registrations: 0,
      slots: overrides.slotMode === SlotMode.SLOTS ? 0 : 0,
    },
  };
}

function createRegistrationRow() {
  return {
    uuid: REGISTRATION_UUID,
    meetingUuid: MEETING_UUID,
    slotUuid: null,
    status: RegistrationStatus.REGISTERED,
    registeredAt: new Date('2026-05-01T10:00:00.000Z'),
    updatedAt: new Date('2026-05-01T10:00:00.000Z'),
  };
}

function createMyRegistrationRow(
  overrides: Partial<{
    uuid: string;
    meetingUuid: string;
    slotUuid: string | null;
    assignedTime: Date | null;
    registeredAt: Date;
    updatedAt: Date;
    meetingDate: Date;
    slotMode: SlotMode;
    meetingStatus: MeetingStatus;
    commissionType: CommissionType;
    commissionName: string | null;
    notes: string | null;
    slot: {
      uuid: string;
      startTime: Date;
      endTime: Date;
    } | null;
  }> = {},
) {
  return {
    uuid: overrides.uuid ?? REGISTRATION_UUID,
    meetingUuid: overrides.meetingUuid ?? MEETING_UUID,
    slotUuid: overrides.slotUuid ?? null,
    status: RegistrationStatus.REGISTERED,
    assignedTime: overrides.assignedTime ?? null,
    registeredAt:
      overrides.registeredAt ?? new Date('2026-03-10T08:00:00.000Z'),
    updatedAt: overrides.updatedAt ?? new Date('2026-03-10T08:00:00.000Z'),
    meeting: {
      uuid: overrides.meetingUuid ?? MEETING_UUID,
      date: overrides.meetingDate ?? new Date('2026-04-10T00:00:00.000Z'),
      slotMode: overrides.slotMode ?? SlotMode.DAY_ONLY,
      status: overrides.meetingStatus ?? MeetingStatus.OPEN_FOR_REGISTRATION,
      notes: overrides.notes ?? 'Registration note',
      commission: {
        type: overrides.commissionType ?? CommissionType.INSTRUCTOR,
        name:
          overrides.commissionName ??
          ((overrides.commissionType ?? CommissionType.INSTRUCTOR) ===
          CommissionType.INSTRUCTOR
            ? 'Komisja Instruktorska'
            : 'Kapituła Stopni Harcerskich'),
      },
    },
    slot: overrides.slot ?? null,
  };
}

function createPrismaMock() {
  const tx = {
    commissionMeeting: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    instructorApplication: {
      findFirst: jest.fn(),
    },
    scoutApplication: {
      findFirst: jest.fn(),
    },
    meetingRegistration: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    meetingSlot: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      createMany: jest.fn(),
    },
    commissionMember: {
      findFirst: jest.fn(),
    },
    $executeRaw: jest.fn().mockResolvedValue(1),
  };

  const prisma = {
    user: {
      findUnique: jest.fn(),
    },
    commissionMember: {
      findFirst: jest.fn(),
    },
    meetingRegistration: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
    },
    instructorApplication: {
      findFirst: jest.fn(),
    },
    scoutApplication: {
      findFirst: jest.fn(),
    },
    commissionMeeting: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(
      async (
        callback: (client: typeof tx) => Promise<unknown>,
      ): Promise<unknown> => callback(tx),
    ),
  };

  return { prisma, tx };
}

function createAuditServiceMock() {
  return {
    log: jest.fn().mockResolvedValue(undefined),
  };
}

function createService() {
  const { prisma, tx } = createPrismaMock();
  const auditService = createAuditServiceMock();
  const service = new MeetingsService(
    prisma as unknown as ConstructorParameters<typeof MeetingsService>[0],
    auditService as unknown as ConstructorParameters<typeof MeetingsService>[1],
  );

  return { service, prisma, tx, auditService };
}

describe('MeetingsService', () => {
  it('returns commissionType and blocks booking when only a non-matching approved application exists', async () => {
    const { service, prisma } = createService();
    prisma.user.findUnique.mockResolvedValue({ uuid: USER_UUID });
    prisma.instructorApplication.findFirst.mockResolvedValue(null);
    prisma.scoutApplication.findFirst.mockResolvedValue({
      uuid: SCOUT_APPLICATION_UUID,
    });
    prisma.commissionMeeting.findMany.mockResolvedValue([
      createMeetingListRow(CommissionType.INSTRUCTOR),
    ]);

    const result = await service.listForScout(PRINCIPAL, {});

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      uuid: MEETING_UUID,
      commissionType: CommissionType.INSTRUCTOR,
      commissionName: 'Komisja Instruktorska',
      canBook: false,
      bookingBlockedReasonCode: 'NO_MATCHING_APPROVED_APPLICATION',
    });
  });

  it('creates a meeting in the explicit commission context', async () => {
    const { service, prisma, tx, auditService } = createService();
    prisma.commissionMember.findFirst.mockResolvedValue({
      commissionUuid: COMMISSION_UUID,
      userUuid: USER_UUID,
      role: CommissionRole.SECRETARY,
    });
    tx.commissionMeeting.create.mockResolvedValue({
      uuid: MEETING_UUID,
      commissionUuid: COMMISSION_UUID,
      date: new Date('2026-05-12T00:00:00.000Z'),
      slotMode: SlotMode.DAY_ONLY,
      status: MeetingStatus.OPEN_FOR_REGISTRATION,
      notes: 'Spotkanie komisji',
      createdAt: new Date('2026-03-10T10:00:00.000Z'),
      updatedAt: new Date('2026-03-10T10:00:00.000Z'),
    });

    const result = await service.createMeeting(
      PRINCIPAL,
      {
        commissionUuid: COMMISSION_UUID,
        date: '2026-05-12',
        slotMode: SlotMode.DAY_ONLY,
        notes: 'Spotkanie komisji',
      },
      'req-123',
    );

    expect(tx.commissionMeeting.create).toHaveBeenCalledWith({
      data: {
        commissionUuid: COMMISSION_UUID,
        createdByUuid: USER_UUID,
        date: new Date('2026-05-12T00:00:00.000Z'),
        slotMode: SlotMode.DAY_ONLY,
        status: MeetingStatus.OPEN_FOR_REGISTRATION,
        notes: 'Spotkanie komisji',
      },
      select: expect.any(Object),
    });
    expect(result).toMatchObject({
      uuid: MEETING_UUID,
      commissionUuid: COMMISSION_UUID,
      date: '2026-05-12',
      slotMode: SlotMode.DAY_ONLY,
      status: MeetingStatus.OPEN_FOR_REGISTRATION,
      notes: 'Spotkanie komisji',
    });
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'MEETING_CREATED',
        targetUuid: MEETING_UUID,
        requestId: 'req-123',
      }),
    );
  });

  it('rejects meeting creation without manager membership in the requested commission', async () => {
    expect.assertions(2);

    const { service, prisma } = createService();
    prisma.commissionMember.findFirst.mockResolvedValue(null);

    try {
      await service.createMeeting(PRINCIPAL, {
        commissionUuid: COMMISSION_UUID,
        date: '2026-05-12',
        slotMode: SlotMode.DAY_ONLY,
      });
    } catch (error) {
      expect(error).toBeInstanceOf(ForbiddenException);
      expect((error as ForbiddenException).getResponse()).toMatchObject({
        code: 'INSUFFICIENT_COMMISSION_ROLE',
      });
      return;
    }

    throw new Error('Expected createMeeting to throw.');
  });

  it('limits scout list queries to public meeting statuses', async () => {
    const { service, prisma } = createService();
    prisma.user.findUnique.mockResolvedValue({ uuid: USER_UUID });
    prisma.instructorApplication.findFirst.mockResolvedValue(null);
    prisma.scoutApplication.findFirst.mockResolvedValue(null);
    prisma.commissionMeeting.findMany.mockResolvedValue([]);

    await service.listForScout(PRINCIPAL, {});

    const listForScoutCalls = prisma.commissionMeeting.findMany.mock
      .calls as Array<
      [
        {
          where?: {
            status?: {
              in?: MeetingStatus[];
            };
          };
        },
      ]
    >;
    const listForScoutArgs = listForScoutCalls[0]?.[0];

    expect(listForScoutArgs).toBeDefined();
    expect(listForScoutArgs?.where?.status?.in).toEqual([
      MeetingStatus.OPEN_FOR_REGISTRATION,
      MeetingStatus.CLOSED,
      MeetingStatus.COMPLETED,
      MeetingStatus.CANCELLED,
    ]);
  });

  it('hides non-public meeting details from scouts', async () => {
    expect.assertions(5);

    const { service, prisma } = createService();
    prisma.user.findUnique.mockResolvedValue({ uuid: USER_UUID });
    prisma.instructorApplication.findFirst.mockResolvedValue(null);
    prisma.scoutApplication.findFirst.mockResolvedValue(null);
    prisma.commissionMeeting.findFirst.mockResolvedValue(null);

    try {
      await service.getDetailForScout(PRINCIPAL, MEETING_UUID);
    } catch (error) {
      expect(error).toBeInstanceOf(NotFoundException);
      expect((error as NotFoundException).getResponse()).toMatchObject({
        code: 'MEETING_NOT_FOUND',
      });
      const detailCalls = prisma.commissionMeeting.findFirst.mock
        .calls as Array<
        [
          {
            where?: {
              uuid?: string;
              status?: {
                in?: MeetingStatus[];
              };
            };
          },
        ]
      >;
      const detailArgs = detailCalls[0]?.[0];

      expect(detailArgs).toBeDefined();
      expect(detailArgs?.where?.uuid).toBe(MEETING_UUID);
      expect(detailArgs?.where?.status?.in).toEqual([
        MeetingStatus.OPEN_FOR_REGISTRATION,
        MeetingStatus.CLOSED,
        MeetingStatus.COMPLETED,
        MeetingStatus.CANCELLED,
      ]);
      return;
    }

    throw new Error('Expected getDetailForScout to throw.');
  });

  it('returns day details lazily for a single requested date', async () => {
    const { service, prisma } = createService();
    prisma.user.findUnique.mockResolvedValue({ uuid: USER_UUID });
    prisma.instructorApplication.findFirst.mockResolvedValue({
      uuid: INSTRUCTOR_APPLICATION_UUID,
    });
    prisma.scoutApplication.findFirst.mockResolvedValue(null);
    prisma.meetingRegistration.findMany.mockResolvedValue([
      createRegistrationRow(),
    ]);
    prisma.commissionMeeting.findMany.mockResolvedValue([
      {
        uuid: MEETING_UUID,
        date: new Date('2026-05-12T00:00:00.000Z'),
        slotMode: SlotMode.SLOTS,
        status: MeetingStatus.OPEN_FOR_REGISTRATION,
        commission: {
          type: CommissionType.INSTRUCTOR,
          name: 'Evening instructor board',
        },
        notes: 'Evening board review',
        slots: [
          {
            uuid: SLOT_UUID,
            startTime: new Date('2026-05-12T18:00:00.000Z'),
            endTime: new Date('2026-05-12T18:30:00.000Z'),
            _count: { registrations: 1 },
          },
        ],
        _count: {
          registrations: 1,
          slots: 1,
        },
      },
    ]);

    const result = await service.listDetailsForScoutByDate(PRINCIPAL, {
      date: '2026-05-12',
    });

    const dayDetailsCalls = prisma.commissionMeeting.findMany.mock
      .calls as Array<
      [
        {
          where?: {
            date?: Date;
          };
        },
      ]
    >;
    const dayDetailsArgs = dayDetailsCalls[0]?.[0];

    expect(dayDetailsArgs).toBeDefined();
    expect(dayDetailsArgs?.where?.date).toEqual(
      new Date('2026-05-12T00:00:00.000Z'),
    );
    expect(result).toMatchObject({
      date: '2026-05-12',
      meetings: [
        {
          uuid: MEETING_UUID,
          commissionName: 'Evening instructor board',
          notes: 'Evening board review',
          slots: [
            {
              uuid: SLOT_UUID,
              isBooked: true,
              bookedByMe: false,
            },
          ],
        },
      ],
    });
  });

  it('lists future active registrations for the scout in chronological order', async () => {
    const { service, prisma } = createService();
    prisma.user.findUnique.mockResolvedValue({ uuid: USER_UUID });
    prisma.meetingRegistration.findMany.mockResolvedValue([
      createMyRegistrationRow({
        uuid: SECOND_REGISTRATION_UUID,
        meetingUuid: SECOND_MEETING_UUID,
        slotUuid: SECOND_SLOT_UUID,
        meetingDate: new Date('2026-04-15T00:00:00.000Z'),
        slotMode: SlotMode.SLOTS,
        commissionType: CommissionType.SCOUT,
        notes: 'Later scout board',
        slot: {
          uuid: SECOND_SLOT_UUID,
          startTime: new Date('2026-04-15T19:00:00.000Z'),
          endTime: new Date('2026-04-15T19:30:00.000Z'),
        },
      }),
      createMyRegistrationRow({
        assignedTime: new Date('2026-04-10T17:00:00.000Z'),
        meetingDate: new Date('2026-04-10T00:00:00.000Z'),
        slotMode: SlotMode.DAY_ONLY,
        commissionType: CommissionType.INSTRUCTOR,
        notes: 'Earlier instructor board',
      }),
      createMyRegistrationRow({
        uuid: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
        meetingUuid: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
        meetingDate: new Date('2026-04-18T00:00:00.000Z'),
        meetingStatus: MeetingStatus.CLOSED,
        commissionType: CommissionType.INSTRUCTOR,
        notes: 'Closed meeting registration',
      }),
    ]);

    const result = await service.listMyRegistrationsForScout(PRINCIPAL);

    const myRegistrationCalls = prisma.meetingRegistration.findMany.mock
      .calls as Array<
      [
        {
          where?: {
            candidateUuid?: string;
            status?: RegistrationStatus;
            meeting?: {
              date?: {
                gte?: Date;
              };
              status?: {
                in?: MeetingStatus[];
              };
            };
          };
          select?: object;
        },
      ]
    >;
    const myRegistrationsArgs = myRegistrationCalls[0]?.[0];

    expect(myRegistrationsArgs).toBeDefined();
    expect(myRegistrationsArgs?.where?.candidateUuid).toBe(USER_UUID);
    expect(myRegistrationsArgs?.where?.status).toBe(
      RegistrationStatus.REGISTERED,
    );
    expect(myRegistrationsArgs?.where?.meeting?.date?.gte).toBeInstanceOf(Date);
    expect(myRegistrationsArgs?.where?.meeting?.status?.in).toEqual([
      MeetingStatus.OPEN_FOR_REGISTRATION,
      MeetingStatus.CLOSED,
      MeetingStatus.COMPLETED,
      MeetingStatus.CANCELLED,
    ]);
    expect(myRegistrationsArgs?.select).toEqual(expect.any(Object));
    expect(result.registrations).toHaveLength(3);
    expect(result.registrations[0]).toMatchObject({
      registrationUuid: REGISTRATION_UUID,
      meetingUuid: MEETING_UUID,
      date: '2026-04-10',
      assignedTime: '2026-04-10T17:00:00.000Z',
      slot: null,
      canCancelMyRegistration: true,
      commissionType: CommissionType.INSTRUCTOR,
      commissionName: 'Komisja Instruktorska',
    });
    expect(result.registrations[1]).toMatchObject({
      registrationUuid: SECOND_REGISTRATION_UUID,
      meetingUuid: SECOND_MEETING_UUID,
      date: '2026-04-15',
      assignedTime: null,
      slot: {
        uuid: SECOND_SLOT_UUID,
        startTime: '2026-04-15T19:00:00.000Z',
        endTime: '2026-04-15T19:30:00.000Z',
      },
      canCancelMyRegistration: true,
      commissionType: CommissionType.SCOUT,
      commissionName: 'Kapituła Stopni Harcerskich',
    });
    expect(result.registrations[2]).toMatchObject({
      status: MeetingStatus.CLOSED,
      canCancelMyRegistration: false,
    });
  });

  it('throws when the approved application type does not match the meeting commission type', async () => {
    expect.assertions(3);

    const { service, prisma, tx } = createService();
    prisma.user.findUnique.mockResolvedValue({ uuid: USER_UUID });
    tx.commissionMeeting.findUnique.mockResolvedValue({
      uuid: MEETING_UUID,
      status: MeetingStatus.OPEN_FOR_REGISTRATION,
      slotMode: SlotMode.DAY_ONLY,
      commission: { type: CommissionType.INSTRUCTOR },
    });
    tx.instructorApplication.findFirst.mockResolvedValue(null);
    tx.scoutApplication.findFirst.mockResolvedValue({
      uuid: SCOUT_APPLICATION_UUID,
    });

    try {
      await service.createRegistration(PRINCIPAL, MEETING_UUID, {});
    } catch (error) {
      expect(error).toBeInstanceOf(ForbiddenException);
      expect((error as ForbiddenException).getResponse()).toMatchObject({
        code: 'BOOKING_NOT_ALLOWED_APPLICATION_TYPE',
      });
      expect(tx.meetingRegistration.create).not.toHaveBeenCalled();
      return;
    }

    throw new Error('Expected createRegistration to throw.');
  });

  it('uses the approved application matching the meeting commission type when the candidate has both approved applications', async () => {
    const { service, prisma, tx, auditService } = createService();
    prisma.user.findUnique.mockResolvedValue({ uuid: USER_UUID });
    tx.commissionMeeting.findUnique.mockResolvedValue({
      uuid: MEETING_UUID,
      status: MeetingStatus.OPEN_FOR_REGISTRATION,
      slotMode: SlotMode.DAY_ONLY,
      commission: { type: CommissionType.INSTRUCTOR },
    });
    tx.instructorApplication.findFirst.mockResolvedValue({
      uuid: INSTRUCTOR_APPLICATION_UUID,
    });
    tx.scoutApplication.findFirst.mockResolvedValue({
      uuid: SCOUT_APPLICATION_UUID,
    });
    tx.meetingRegistration.findFirst.mockResolvedValue(null);
    tx.meetingRegistration.create.mockResolvedValue(createRegistrationRow());

    const result = await service.createRegistration(
      PRINCIPAL,
      MEETING_UUID,
      {},
    );

    const createRegistrationCalls = tx.meetingRegistration.create.mock
      .calls as Array<
      [
        {
          data?: {
            meetingUuid?: string;
            candidateUuid?: string;
            instructorApplicationUuid?: string | null;
            scoutApplicationUuid?: string | null;
          };
        },
      ]
    >;
    const createRegistrationArgs = createRegistrationCalls[0]?.[0];

    expect(createRegistrationArgs).toBeDefined();
    expect(createRegistrationArgs?.data).toMatchObject({
      meetingUuid: MEETING_UUID,
      candidateUuid: USER_UUID,
      instructorApplicationUuid: INSTRUCTOR_APPLICATION_UUID,
      scoutApplicationUuid: null,
    });
    expect(result).toMatchObject({
      uuid: REGISTRATION_UUID,
      meetingUuid: MEETING_UUID,
      slotUuid: null,
      status: RegistrationStatus.REGISTERED,
    });
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'SLOT_BOOKED',
        targetUuid: REGISTRATION_UUID,
      }),
    );
  });

  it('blocks duplicate active registrations before insert', async () => {
    expect.assertions(3);

    const { service, prisma, tx } = createService();
    prisma.user.findUnique.mockResolvedValue({ uuid: USER_UUID });
    tx.commissionMeeting.findUnique.mockResolvedValue({
      uuid: MEETING_UUID,
      status: MeetingStatus.OPEN_FOR_REGISTRATION,
      slotMode: SlotMode.DAY_ONLY,
      commission: { type: CommissionType.INSTRUCTOR },
    });
    tx.instructorApplication.findFirst.mockResolvedValue({
      uuid: INSTRUCTOR_APPLICATION_UUID,
    });
    tx.scoutApplication.findFirst.mockResolvedValue(null);
    tx.meetingRegistration.findFirst.mockResolvedValue({
      uuid: REGISTRATION_UUID,
    });

    try {
      await service.createRegistration(PRINCIPAL, MEETING_UUID, {});
    } catch (error) {
      expect(error).toBeInstanceOf(ConflictException);
      expect((error as ConflictException).getResponse()).toMatchObject({
        code: 'ALREADY_REGISTERED_FOR_MEETING',
      });
      expect(tx.meetingRegistration.create).not.toHaveBeenCalled();
      return;
    }

    throw new Error('Expected createRegistration to throw.');
  });

  it('blocks already booked slots before insert', async () => {
    expect.assertions(3);

    const { service, prisma, tx } = createService();
    prisma.user.findUnique.mockResolvedValue({ uuid: USER_UUID });
    tx.commissionMeeting.findUnique.mockResolvedValue({
      uuid: MEETING_UUID,
      status: MeetingStatus.OPEN_FOR_REGISTRATION,
      slotMode: SlotMode.SLOTS,
      commission: { type: CommissionType.INSTRUCTOR },
    });
    tx.instructorApplication.findFirst.mockResolvedValue({
      uuid: INSTRUCTOR_APPLICATION_UUID,
    });
    tx.scoutApplication.findFirst.mockResolvedValue(null);
    tx.meetingRegistration.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ uuid: REGISTRATION_UUID });
    tx.meetingSlot.findUnique.mockResolvedValue({
      uuid: SLOT_UUID,
      meetingUuid: MEETING_UUID,
    });

    try {
      await service.createRegistration(PRINCIPAL, MEETING_UUID, {
        slotUuid: SLOT_UUID,
      });
    } catch (error) {
      expect(error).toBeInstanceOf(ConflictException);
      expect((error as ConflictException).getResponse()).toMatchObject({
        code: 'SLOT_ALREADY_BOOKED',
      });
      expect(tx.meetingRegistration.create).not.toHaveBeenCalled();
      return;
    }

    throw new Error('Expected createRegistration to throw.');
  });

  it('rejects slot creation outside the meeting date', async () => {
    expect.assertions(3);

    const { service, tx } = createService();
    tx.commissionMeeting.findUnique.mockResolvedValue({
      uuid: MEETING_UUID,
      commissionUuid: COMMISSION_UUID,
      date: new Date('2026-05-12T00:00:00.000Z'),
      slotMode: SlotMode.SLOTS,
      status: MeetingStatus.OPEN_FOR_REGISTRATION,
    });
    tx.commissionMember.findFirst.mockResolvedValue({ uuid: MEMBERSHIP_UUID });
    tx.meetingSlot.findMany.mockResolvedValue([]);

    try {
      await service.createSlots(PRINCIPAL, MEETING_UUID, {
        slots: [
          {
            startTime: '2026-05-13T10:00:00.000Z',
            endTime: '2026-05-13T10:30:00.000Z',
          },
        ],
      });
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getResponse()).toMatchObject({
        code: 'SLOT_OUTSIDE_MEETING_DATE',
      });
      expect(tx.meetingSlot.createMany).not.toHaveBeenCalled();
      return;
    }

    throw new Error('Expected createSlots to throw.');
  });

  it('rejects assignedTime outside the meeting date during day-only reassignment', async () => {
    expect.assertions(3);

    const { service, tx } = createService();
    tx.meetingRegistration.findUnique.mockResolvedValue({
      uuid: REGISTRATION_UUID,
      meetingUuid: MEETING_UUID,
      status: RegistrationStatus.REGISTERED,
      slotUuid: null,
      registeredAt: new Date('2026-05-01T10:00:00.000Z'),
      updatedAt: new Date('2026-05-01T10:00:00.000Z'),
      meeting: {
        commissionUuid: COMMISSION_UUID,
        date: new Date('2026-05-12T00:00:00.000Z'),
        slotMode: SlotMode.DAY_ONLY,
      },
    });
    tx.commissionMember.findFirst.mockResolvedValue({ uuid: MEMBERSHIP_UUID });

    try {
      await service.reassignRegistration(
        PRINCIPAL,
        MEETING_UUID,
        REGISTRATION_UUID,
        {
          assignedTime: '2026-05-13T09:00:00.000Z',
        },
      );
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getResponse()).toMatchObject({
        code: 'ASSIGNED_TIME_OUTSIDE_MEETING_DATE',
      });
      expect(tx.meetingRegistration.update).not.toHaveBeenCalled();
      return;
    }

    throw new Error('Expected reassignRegistration to throw.');
  });
});
