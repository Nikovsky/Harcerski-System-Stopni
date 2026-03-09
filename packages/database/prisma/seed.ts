// @file: packages/database/prisma/seed.ts
import 'dotenv/config';
import { PrismaClient } from "../src/generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  UserRole,
  ScoutRank,
  InstructorRank,
  ApplicationStatus,
  PresenceType,
  UnitType,
  RequirementState,
  MeetingStatus,
  RegistrationStatus,
  SlotMode,
  DocumentType,
  CommissionType,
  CommissionRole,
  DegreeType,
  Status,
} from "../src/generated/client";

// Create Prisma adapter
const pgAdapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

// Initialize Prisma Client with the adapter
const prisma = new PrismaClient({
  adapter: pgAdapter,
});

async function main() {
  console.log('🌱 Starting database seed...');

  // =========================================================
  // 1. ORGANIZATIONAL STRUCTURE
  // =========================================================
  console.log('📂 Seeding organizational structure...');

  const hufiec1 = await prisma.scoutUnit.upsert({
    where: { code: 'HUF-KLB' },
    update: {},
    create: {
      code: 'HUF-KLB',
      name: 'Kluczborski Hufiec Harcerzy "Płomień"',
      type: UnitType.HUFIEC,
      status: Status.ACTIVE,
    }
  });

  const hufiec2 = await prisma.scoutUnit.upsert({
    where: { code: 'HUF-WOL' },
    update: {},
    create: {
      code: 'HUF-WOL',
      name: 'Wołczyński Hufiec Harcerzy "Omega"',
      type: UnitType.HUFIEC,
      status: Status.ACTIVE,
    }
  });

  const druzyna1 = await prisma.scoutUnit.upsert({
    where: { code: 'KLB-TOR' },
    update: {},
    create: {
      code: 'KLB-TOR',
      name: '122 Kluczbroska Drużyna Harcerzy "Tornado" im. Andrzeja Romockiego ps. "Morro"',
      type: UnitType.DRUZYNA,
      parentHufiecCode: hufiec1.code,
      status: Status.ACTIVE,
    }
  });

  const druzyna2 = await prisma.scoutUnit.upsert({
    where: { code: 'WOL-FLAMMAE' },
    update: {},
    create: {
      code: 'WOL-FLAMMAE',
      name: '7 Wołczyńska Drużyna Harcerzy "Flammae" im. kadeta Karola Chodkiewicza',
      type: UnitType.DRUZYNA,
      parentHufiecCode: hufiec2.code,
      status: Status.ACTIVE,
    }
  });

  // =========================================================
  // 2. USERS
  // =========================================================
  console.log('👤 Seeding users...');

  const janKowalski = await prisma.user.upsert({
    where: { keycloakUuid: '11111111-1111-1111-1111-111111111111' },
    update: {},
    create: {
      keycloakUuid: '11111111-1111-1111-1111-111111111111',
      firstName: 'Jan',
      secondName: 'Marian',
      surname: 'Kowalski',
      email: 'jan.kowalski@zhr.pl',
      phone: '+48123456789',
      birthDate: new Date('2000-01-01'),
      role: UserRole.SCOUT,
      status: Status.ACTIVE,
      hufiecCode: hufiec1.code,
      druzynaCode: druzyna1.code,
      scoutRank: ScoutRank.HARCERZ_ORLI,
      instructorRank: null,
      instructorRankAwardedAt: null,
      inScoutingSince: new Date('2010-09-01'),
      inZhrSince: new Date('2010-09-01'),
      oathDate: new Date('2011-07-28'),
    }
  });

  const piotrNowak = await prisma.user.upsert({
    where: { keycloakUuid: '22222222-2222-2222-2222-222222222222' },
    update: {},
    create: {
      keycloakUuid: '22222222-2222-2222-2222-222222222222',
      firstName: 'Piotr',
      secondName: 'Paweł',
      surname: 'Nowak',
      email: 'piotr.nowak@zhr.pl',
      phone: '+48676767676',
      birthDate: new Date('2007-12-21'),
      role: UserRole.USER,
      status: Status.ACTIVE,
      hufiecCode: hufiec2.code,
      druzynaCode: druzyna2.code,
      scoutRank: ScoutRank.CWIK,
      inScoutingSince: new Date('2018-09-01'),
      inZhrSince: new Date('2018-09-01'),
      oathDate: new Date('2019-07-28'),
    }
  });

  const piotrKrajewski = await prisma.user.upsert({
    where: { keycloakUuid: '33333333-3333-3333-3333-333333333333' },
    update: {},
    create: {
      keycloakUuid: '33333333-3333-3333-3333-333333333333',
      firstName: 'Piotr',
      secondName: 'Adam',
      surname: 'Krajewski',
      email: 'piotr.krajewski@zhr.pl',
      phone: '+48987654321',
      birthDate: new Date('1995-05-15'),
      role: UserRole.COMMISSION_MEMBER,
      status: Status.ACTIVE,
      scoutRank: ScoutRank.HARCERZ_RZECZYPOSPOLITEJ,
      instructorRank: InstructorRank.HARCMISTRZ,
      instructorRankAwardedAt: new Date('2020-01-01'),
    }
  });

  const adamNowakowski = await prisma.user.upsert({
    where: { keycloakUuid: '44444444-4444-4444-4444-444444444444' },
    update: {},
    create: {
      keycloakUuid: '44444444-4444-4444-4444-444444444444',
      firstName: 'Adam',
      secondName: 'Nowakowski',
      surname: 'Nowakowski',
      email: 'adam.nowakowski@zhr.pl',
      phone: '+48564887123',
      birthDate: new Date('1998-05-15'),
      role: UserRole.COMMISSION_MEMBER,
      status: Status.ACTIVE,
      scoutRank: ScoutRank.HARCERZ_RZECZYPOSPOLITEJ,
      instructorRank: InstructorRank.PODHARCMISTRZ,
      instructorRankAwardedAt: new Date('2021-12-01'),
    }
  });

  const krzysztofKier = await prisma.user.upsert({
    where: { keycloakUuid: '55555555-5555-5555-5555-555555555555' },
    update: {},
    create: {
      keycloakUuid: '55555555-5555-5555-5555-555555555555',
      firstName: 'Krzysztof',
      secondName: 'Adam',
      surname: 'Kier',
      email: 'krzysztof.kier@zhr.pl',
      phone: '+487789906676',
      birthDate: new Date('1995-05-15'),
      role: UserRole.COMMISSION_MEMBER,
      status: Status.ACTIVE,
      scoutRank: ScoutRank.HARCERZ_RZECZYPOSPOLITEJ,
      instructorRank: InstructorRank.HARCMISTRZ,
      instructorRankAwardedAt: new Date('2018-11-21'),
    }
  });

  const michalRenke = await prisma.user.upsert({
    where: { keycloakUuid: '66666666-6666-6666-6666-666666666666' },
    update: {},
    create: {
      keycloakUuid: '66666666-6666-6666-6666-666666666666',
      firstName: 'Michał',
      secondName: 'Renke',
      surname: 'Renke',
      email: 'michal.renke@zhr.pl',
      phone: '+48564887123',
      birthDate: new Date('2000-07-15'),
      role: UserRole.COMMISSION_MEMBER,
      status: Status.ACTIVE,
      scoutRank: ScoutRank.HARCERZ_RZECZYPOSPOLITEJ,
      instructorRank: InstructorRank.PODHARCMISTRZ,
      instructorRankAwardedAt: new Date('2024-12-15'),
    }
  });

  // =========================================================
  // 3. COMMISSIONS
  // =========================================================
  console.log('📋 Seeding commissions...');

  // Check if instructor commission exists
  let instructorCommission = await prisma.commission.findFirst({
    where: {
      name: 'Komisja Instruktorska',
      type: CommissionType.INSTRUCTOR,
    }
  });

  if (!instructorCommission) {
    instructorCommission = await prisma.commission.create({
      data: {
        name: 'Komisja Instruktorska',
        type: CommissionType.INSTRUCTOR,
        status: Status.ACTIVE,
      }
    });
  }

  // Add commission members if they don't exist
  const instructorMember1 = await prisma.commissionMember.findFirst({
    where: {
      commissionUuid: instructorCommission.uuid,
      userUuid: piotrKrajewski.uuid,
    }
  });

  if (!instructorMember1) {
    await prisma.commissionMember.create({
      data: {
        commissionUuid: instructorCommission.uuid,
        userUuid: piotrKrajewski.uuid,
        role: CommissionRole.CHAIRMAN,
      }
    });
  }

  const instructorMember2 = await prisma.commissionMember.findFirst({
    where: {
      commissionUuid: instructorCommission.uuid,
      userUuid: adamNowakowski.uuid,
    }
  });

  if (!instructorMember2) {
    await prisma.commissionMember.create({
      data: {
        commissionUuid: instructorCommission.uuid,
        userUuid: adamNowakowski.uuid,
        role: CommissionRole.MEMBER,
      }
    });
  }

  // Scout commission
  let scoutCommission = await prisma.commission.findFirst({
    where: {
      name: 'Kapituła Stopni Harcerskich',
      type: CommissionType.SCOUT,
    }
  });

  if (!scoutCommission) {
    scoutCommission = await prisma.commission.create({
      data: {
        name: 'Kapituła Stopni Harcerskich',
        type: CommissionType.SCOUT,
        status: Status.ACTIVE,
      }
    });
  }

  const scoutMember1 = await prisma.commissionMember.findFirst({
    where: {
      commissionUuid: scoutCommission.uuid,
      userUuid: krzysztofKier.uuid,
    }
  });

  if (!scoutMember1) {
    await prisma.commissionMember.create({
      data: {
        commissionUuid: scoutCommission.uuid,
        userUuid: krzysztofKier.uuid,
        role: CommissionRole.CHAIRMAN,
      }
    });
  }

  const scoutMember2 = await prisma.commissionMember.findFirst({
    where: {
      commissionUuid: scoutCommission.uuid,
      userUuid: michalRenke.uuid,
    }
  });

  if (!scoutMember2) {
    await prisma.commissionMember.create({
      data: {
        commissionUuid: scoutCommission.uuid,
        userUuid: michalRenke.uuid,
        role: CommissionRole.MEMBER,
      }
    });
  }

  // =========================================================
  // 4. COMMISSION MEETINGS
  // =========================================================
  console.log('🗓️ Seeding commission meetings...');

  async function ensureMeeting(data: {
    commissionUuid: string;
    createdByUuid: string;
    date: Date;
    slotMode: SlotMode;
    status: MeetingStatus;
    notes: string;
  }) {
    const existingMeeting = await prisma.commissionMeeting.findFirst({
      where: {
        commissionUuid: data.commissionUuid,
        date: data.date,
        slotMode: data.slotMode,
      },
    });

    if (existingMeeting) {
      return existingMeeting;
    }

    return prisma.commissionMeeting.create({
      data: {
        commissionUuid: data.commissionUuid,
        createdByUuid: data.createdByUuid,
        date: data.date,
        slotMode: data.slotMode,
        status: data.status,
        notes: data.notes,
      },
    });
  }

  const instructorMeetingWithSlots = await ensureMeeting({
    commissionUuid: instructorCommission.uuid,
    createdByUuid: piotrKrajewski.uuid,
    date: new Date('2026-04-10'),
    slotMode: SlotMode.SLOTS,
    status: MeetingStatus.OPEN_FOR_REGISTRATION,
    notes: 'Posiedzenie KI z indywidualnymi slotami rozmów.',
  });

  await ensureMeeting({
    commissionUuid: instructorCommission.uuid,
    createdByUuid: adamNowakowski.uuid,
    date: new Date('2026-05-15'),
    slotMode: SlotMode.DAY_ONLY,
    status: MeetingStatus.OPEN_FOR_REGISTRATION,
    notes: 'Posiedzenie KI w formule całodniowej.',
  });

  await ensureMeeting({
    commissionUuid: scoutCommission.uuid,
    createdByUuid: krzysztofKier.uuid,
    date: new Date('2026-05-16'),
    slotMode: SlotMode.DAY_ONLY,
    status: MeetingStatus.OPEN_FOR_REGISTRATION,
    notes: 'Posiedzenie KSH dla prób i zamknięć stopni harcerskich.',
  });

  await ensureMeeting({
    commissionUuid: scoutCommission.uuid,
    createdByUuid: krzysztofKier.uuid,
    date: new Date('2026-06-21'),
    slotMode: SlotMode.DAY_ONLY,
    status: MeetingStatus.OPEN_FOR_REGISTRATION,
    notes: 'Posiedzenie KSH dla prób i zamknięć stopni harcerskich.',
  });

  const existingSlots = await prisma.meetingSlot.findMany({
    where: { meetingUuid: instructorMeetingWithSlots.uuid },
    select: { uuid: true },
    take: 1,
  });

  if (existingSlots.length === 0) {
    await prisma.meetingSlot.createMany({
      data: [
        {
          meetingUuid: instructorMeetingWithSlots.uuid,
          startTime: new Date('2026-04-10T16:00:00.000Z'),
          endTime: new Date('2026-04-10T16:30:00.000Z'),
          sortOrder: 0,
        },
        {
          meetingUuid: instructorMeetingWithSlots.uuid,
          startTime: new Date('2026-04-10T16:30:00.000Z'),
          endTime: new Date('2026-04-10T17:00:00.000Z'),
          sortOrder: 1,
        },
        {
          meetingUuid: instructorMeetingWithSlots.uuid,
          startTime: new Date('2026-04-10T17:00:00.000Z'),
          endTime: new Date('2026-04-10T17:30:00.000Z'),
          sortOrder: 2,
        },
      ],
    });
  }

  // =========================================================
  // 5. Requirement templates
  // =========================================================
  console.log('📑 Seeding requirement templates...');

  // PWD Template - use upsert with composite unique constraint
  const pwdTemplate = await prisma.requirementTemplate.upsert({
    where: {
      degreeType_degreeCode_version: {
        degreeType: DegreeType.INSTRUCTOR,
        degreeCode: 'PWD',
        version: 1,
      }
    },
    update: {},
    create: {
      degreeType: DegreeType.INSTRUCTOR,
      degreeCode: 'PWD',
      version: 1,
      status: Status.ACTIVE,
      name: 'Próba na stopień Przewodnika',
      description: 'Wymagania na stopień przewodnika'
    }
  });

  // Helper function to upsert requirement definitions
  async function upsertRequirement(data: {
    templateId: string;
    code: string;
    description: string;
    isGroup: boolean;
    sortOrder: number;
    parentId?: string;
  }) {
    return await prisma.requirementDefinition.upsert({
      where: {
        templateId_code: {
          templateId: data.templateId,
          code: data.code,
        }
      },
      update: {
        description: data.description,
        isGroup: data.isGroup,
        sortOrder: data.sortOrder,
        parentId: data.parentId,
      },
      create: data,
    });
  }

  const pwdRequirement1 = await upsertRequirement({
    templateId: pwdTemplate.uuid,
    code: '1',
    description: 'Wykazał, że jest przygotowany do poprowadzenia gromady zuchów lub drużyny harcerzy lub wędrowników. Potrafi:',
    isGroup: true,
    sortOrder: 1,
  });

  await upsertRequirement({
    templateId: pwdTemplate.uuid,
    code: '1A',
    description: 'zaplanować roczną pracę gromady / drużyny uwzględniając cele wychowawcze oraz dobierając odpowiednie formy pracy np. wspólnie z drużynowym napisać plan pracy i uzyskać jego zatwierdzenie',
    isGroup: false,
    sortOrder: 2,
    parentId: pwdRequirement1.uuid,
  });

  await upsertRequirement({
    templateId: pwdTemplate.uuid,
    code: '1B',
    description: `zaplanować i prowadzić zdobywanie gwiazdek, stopni i sprawności w toku pracy gromady / drużyny:
● met. zuchowa: wykorzystanie systemu „pryzmat" np. wprowadzić tablicę tęczową, ułożyć próby na gwiazdki, ułożyć zadania na sprawności kolonijne
● met. harcerska: wymagania na stopnie i sprawności ujęte w planie pracy
● met. wędrownicza: praca indywidualna poprzez stopnie HO i HR, sprawności mistrzowskie, uprawnienia państwowe`,
    isGroup: false,
    sortOrder: 3,
    parentId: pwdRequirement1.uuid,
  });

  await upsertRequirement({
    templateId: pwdTemplate.uuid,
    code: '1C',
    description: `posługiwać się systemem małych grup:
● met. zuchowa: podział na szóstki, zaangażować opiekunów szóstek na zimowisku i kolonii
● met. harcerska: system zastępowy - zaplanować pracę zastępu zastępowych i przeprowadzić zbiórkę tego zastępu
● met. wędrownicza: podział na patrole, sekcje lub grupy zadaniowe, np. przeprowadzić projekt artystyczny, techniczny, turystyczny`,
    isGroup: false,
    sortOrder: 4,
    parentId: pwdRequirement1.uuid,
  });

  await upsertRequirement({
    templateId: pwdTemplate.uuid,
    code: '1D',
    description: `samodzielnie zaplanować i pod nadzorem instruktora przeprowadzić przynajmniej trzy różne nieobozowe formy pracy z gromadą / drużyną:
● met. zuchowa: co najmniej jedna nie w pomieszczeniu, np. zbiórka gromady, wycieczka, biwak, kominek
● met. harcerska: jeden biwak i dwie inne formy wymagany biwak z noclegiem w terenie; przykłady pozostałych form: zbiórka drużyny, rajd, ognisko, zawody sportowe
● met. wędrownicza: np. zbiórka drużyny, wędrówka, biwak, ognisko`,
    isGroup: false,
    sortOrder: 5,
    parentId: pwdRequirement1.uuid,
  });

  await upsertRequirement({
    templateId: pwdTemplate.uuid,
    code: '1E',
    description: `tworzyć i wykorzystywać obrzędowość w gromadzie / drużynie np. obrzędowość ZZ, obrzędowość zimowiska, kolonii, fabuła obozu, obrzęd przyjęcia do gromady / drużyny, obrzęd złożenia obietnicy, przyrzeczenia, wtajemniczenia`,
    isGroup: false,
    sortOrder: 6,
    parentId: pwdRequirement1.uuid,
  });

  await upsertRequirement({
    templateId: pwdTemplate.uuid,
    code: '1F',
    description: `osobiście przeprowadzić formę pracy z zakresu wychowania religijnego zaplanowaną we współpracy z kapelanem/duszpasterzem:
● met. zuchowa: np. jasełka, teatrzyk, śpiew na Mszy św., spotkanie z duszpasterzem
● met. harcerska: np. HaDeS, droga krzyżowa, rekolekcje
● met. wędrownicza: np. ognisko z dyskusją z gościem, rozważania w drodze, pielgrzymka, rekolekcje`,
    isGroup: false,
    sortOrder: 7,
    parentId: pwdRequirement1.uuid,
  });

  await upsertRequirement({
    templateId: pwdTemplate.uuid,
    code: '1G',
    description: `przekazywać wartości ideowe w oparciu o prawo zucha, prawo harcerskie, symbolikę naramiennika wędrowniczego poprzez konkretne formy pracy:
● met. zuchowa: np. krąg rady, gawęda, prace plastyczne
● met. harcerska: np. gawęda, pogadanka, gra, zadania indywidualne na stopnie
● met. wędrownicza, np. służba w domu opieki, treningi pływackie, wyjazd w góry, spotkanie z menedżerem`,
    isGroup: false,
    sortOrder: 8,
    parentId: pwdRequirement1.uuid,
  });

  await upsertRequirement({
    templateId: pwdTemplate.uuid,
    code: '2',
    description: 'Potrafi poprowadzić zajęcia na kursie zastępowych, kursie przybocznych zuchowych lub odpowiednim kursie dla wędrowników.',
    isGroup: false,
    sortOrder: 9,
  });

  await upsertRequirement({
    templateId: pwdTemplate.uuid,
    code: '3',
    description: 'Potrafi pomóc drużynowemu w przeprowadzeniu programu wyjazdu, pełniąc funkcję w komendzie zimowiska, obozu lub kolonii.',
    isGroup: false,
    sortOrder: 10,
  });

  const pwdRequirement2 = await upsertRequirement({
    templateId: pwdTemplate.uuid,
    code: '4',
    description: 'Poprzez osobiste zaangażowanie w organizację wyjazdów wykazał, że jest gotów zapewnić swojej drużynie udział w obozach i zimowiskach. Potrafi:',
    isGroup: true,
    sortOrder: 11,
  });

  await upsertRequirement({
    templateId: pwdTemplate.uuid,
    code: '4A',
    description: `Pomóc przy organizacji obozu lub kolonii od strony formalnej. np. zgoda nadleśnictwa, zgłoszenie wypoczynku w kuratorium, preliminarz finansowy`,
    isGroup: false,
    sortOrder: 12,
    parentId: pwdRequirement2.uuid,
  });

  await upsertRequirement({
    templateId: pwdTemplate.uuid,
    code: '4B',
    description: `Rozliczyć biwak, zimowisko lub śródroczną pracę drużyny`,
    isGroup: false,
    sortOrder: 13,
    parentId: pwdRequirement2.uuid,
  });

  await upsertRequirement({
    templateId: pwdTemplate.uuid,
    code: '5',
    description: 'Potrafi zachęcić chłopców do wstąpienia do drużyny/gromady. np. nabór, zwiększenie stanu liczbowego',
    isGroup: false,
    sortOrder: 14,
  });

  await upsertRequirement({
    templateId: pwdTemplate.uuid,
    code: '6',
    description: `Potrafi wypromować ZHR w środowisku działania. np. gazetka, artykuł w prasie lokalnej, gablotka, strona internetowa, udział w wydarzeniach lokalnych`,
    isGroup: false,
    sortOrder: 15,
  });

  await upsertRequirement({
    templateId: pwdTemplate.uuid,
    code: '7',
    description: `Potrafi zorganizować służbę na rzecz środowiska i zaangażować w nią zuchy / harcerzy / wędrowników. np. akcja charytatywna, pomoc w świetlicy środowiskowej, domu opieki, szkole specjalnej`,
    isGroup: false,
    sortOrder: 16,
  });

  await upsertRequirement({
    templateId: pwdTemplate.uuid,
    code: '8',
    description: `Potrafi zorganizować i przeprowadzić element współpracy z rodzicami np. zebranie, opłatek, dzień matki, rajd ojca i syna, gra dla rodziców, KPH`,
    isGroup: false,
    sortOrder: 17,
  });

  await upsertRequirement({
    templateId: pwdTemplate.uuid,
    code: '9',
    description: `Przeczytał 5 lektur na poziomie przewodnika zaaprobowanych przez opiekuna próby.`,
    isGroup: false,
    sortOrder: 18,
  });

  await upsertRequirement({
    templateId: pwdTemplate.uuid,
    code: '10',
    description: `10. Ewentualne dodatkowe zadanie zlecone przez Komisję`,
    isGroup: false,
    sortOrder: 19,
  });


  // PHM Template
  const phmTemplate = await prisma.requirementTemplate.upsert({
    where: {
      degreeType_degreeCode_version: {
        degreeType: DegreeType.INSTRUCTOR,
        degreeCode: 'PHM',
        version: 1,
      }
    },
    update: {},
    create: {
      degreeType: DegreeType.INSTRUCTOR,
      degreeCode: 'PHM',
      version: 1,
      status: Status.ACTIVE,
      name: 'Próba na stopień Podharcmistrza',
      description: 'Wymagania na stopień podharcmistrza'
    }
  });

  const phmRequirement1 = await upsertRequirement({
    templateId: phmTemplate.uuid,
    code: '1',
    description: 'Osiągnął sukcesy w prowadzeniu drużyny/gromady. np. udział w TDP, zdobycie kolejnej kategorii, zwiększenie liczebności, wykształcenie dobrych następców',
    isGroup: false,
    sortOrder: 1,
  });

  const phmRequirement2 = await upsertRequirement({
    templateId: phmTemplate.uuid,
    code: '2',
    description: 'Poprzez zaangażowanie w prace hufca / referatu wykazał, że jest przygotowany do rozwijania środowiska harcerskiego. Potrafi:',
    isGroup: true,
    sortOrder: 2,
  });

  await upsertRequirement({
    templateId: phmTemplate.uuid,
    code: '2A',
    description: `zaplanować roczną pracę hufca / referatu / wydziału uwzględniając cele oraz dobierając do nich odpowiednie formy pracy
    np. wspólnie z hufcowym napisanie plan pracy i uzyskanie jego zatwierdzenia`,
    isGroup: false,
    sortOrder: 3,
    parentId: phmRequirement2.uuid,
  });

  await upsertRequirement({
    templateId: phmTemplate.uuid,
    code: '2B',
    description: `wspierać drużynowych w prowadzeniu pracy wychowawczej
    np. warsztaty metodyczne, opiekun drużyny, indywidualna praca`,
    isGroup: false,
    sortOrder: 4,
    parentId: phmRequirement2.uuid,
  });

  await upsertRequirement({
    templateId: phmTemplate.uuid,
    code: '2C',
    description: `prowadzić formację drużynowych w sferze idei harcerskiej
    np. dyskusja o prawie harcerskim, kuźnica, spotkanie z gościem, rekolekcje dla drużynowych, dyskusja o filmie`,
    isGroup: false,
    sortOrder: 5,
    parentId: phmRequirement2.uuid,
  });

  await upsertRequirement({
    templateId: phmTemplate.uuid,
    code: '2D',
    description: `przeprowadzić przedsięwzięcie z udziałem kilku drużyn
    np. obóz, zgrupowanie obozów, turniej, biwak, pielgrzymka`,
    isGroup: false,
    sortOrder: 6,
    parentId: phmRequirement2.uuid,
  });

  await upsertRequirement({
    templateId: phmTemplate.uuid,
    code: '3',
    description: `Potrafi poprowadzić zajęcia na kursie drużynowych oraz poprowadzić kurs zastępowych, kurs przybocznych zuchowych lub odpowiedni kurs dla wędrowników.`,
    isGroup: false,
    sortOrder: 7,
  });

  await upsertRequirement({
    templateId: phmTemplate.uuid,
    code: '4',
    description: `Pełniąc rolę opiekuna próby potrafi doprowadzić harcerza do zdobycia stopnia przewodnika i harcerza orlego lub harcerza rzeczypospolitej.`,
    isGroup: false,
    sortOrder: 8,
  });

  await upsertRequirement({
    templateId: phmTemplate.uuid,
    code: '5',
    description: `Potrafi wesprzeć metodycznie rozwój istniejącego, słabszego środowiska lub powstanie nowego.
    np. znalezienie kandydatów do służby spoza harcerstwa, funkcja opiekuna słabszej drużyny, zabranie na obóz lub zimowisko słabszej drużyny, przyjęcie na staż przybocznego ze słabszej drużyny`,
    isGroup: false,
    sortOrder: 9,
  });

  await upsertRequirement({
    templateId: phmTemplate.uuid,
    code: '6',
    description: 'Potrafi zorganizować pracę zespołu instruktorów w konkretnym przedsięwzięciu.',
    isGroup: false,
    sortOrder: 10,
  });

  await upsertRequirement({
    templateId: phmTemplate.uuid,
    code: '7',
    description: 'Potrafi zorganizować, poprowadzić i pełnić funkcję komendanta obozu lub kolonii zuchowej.',
    isGroup: false,
    sortOrder: 11,
  });

  await upsertRequirement({
    templateId: phmTemplate.uuid,
    code: '8',
    description: `Poprzez współpracę z parafią i samorządem lokalnym lub jego agendami potrafił uzyskać dla ZHR istotne korzyści.
    np. dotacja, lokal, opieka duszpasterska, umundurowanie polowe`,
    isGroup: false,
    sortOrder: 12,
  });

  await upsertRequirement({
    templateId: phmTemplate.uuid,
    code: '9',
    description: `Potrafi przeprowadzić akcję lub cykl systematycznych działań promujących ZHR na forum publicznym.
    np. partnerstwo w organizacji wydarzenia lokalnego, artykuł w prasie, wystąpienie w mediach, gra dla mieszkańców, festyn`,
    isGroup: false,
    sortOrder: 13,
  });

  await upsertRequirement({
    templateId: phmTemplate.uuid,
    code: '10',
    description: 'Przeczytał 5 lektur na poziomie podharcmistrza zaaprobowanych przez opiekuna próby.',
    isGroup: false,
    sortOrder: 14,
  });

  await upsertRequirement({
    templateId: phmTemplate.uuid,
    code: '11',
    description: 'Ewentualne dodatkowe zadanie zlecone przez Komisję',
    isGroup: false,
    sortOrder: 15,
  });

  console.log('✅ Database seeded successfully!');
}


main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

// EOF
