// @file: apps/api/src/modules/instructor-application/instructor-application-validation.service.spec.ts
import { BadRequestException } from '@nestjs/common';
import { InstructorApplicationValidationService } from './instructor-application-validation.service';

function createValidSubmitPayload() {
  return {
    teamFunction: 'Druzynowy',
    hufiecFunction: 'Zastepca komendanta',
    openTrialForRank: 'HARCERZ_ORLI',
    plannedFinishAt: new Date('2026-12-31T00:00:00.000Z'),
    hufcowyPresence: 'IN_PERSON',
    hufcowyPresenceAttachmentUuid: null,
    functionsHistory: 'Funkcje i okresy.',
    coursesHistory: 'Kursy i szkolenia.',
    campsHistory: 'Obozy i funkcje.',
    successes: 'Sukcesy.',
    failures: 'Wnioski po porazkach.',
    supervisorFirstName: 'Jan',
    supervisorSurname: 'Kowalski',
    supervisorInstructorRank: 'PODHARCMISTRZ',
    supervisorInstructorFunction: 'Opiekun proby',
    template: { degreeCode: 'HM' },
    requirements: [
      {
        state: 'DONE',
        actionDescription: 'Zrealizowano zadanie.',
        verificationText: 'Potwierdzone zalacznikiem.',
        requirementDefinition: { code: '1.1' },
      },
    ],
    attachments: [],
  };
}

describe('InstructorApplicationValidationService', () => {
  const service = new InstructorApplicationValidationService();

  it('throws when requirement actionDescription is blank', () => {
    const payload = createValidSubmitPayload();
    payload.requirements[0].actionDescription = '  ';

    expect(() => service.validateRequiredFieldsForSubmit(payload)).toThrow(
      BadRequestException,
    );
  });

  it('throws when requirement verificationText is blank', () => {
    const payload = createValidSubmitPayload();
    payload.requirements[0].verificationText = '';

    expect(() => service.validateRequiredFieldsForSubmit(payload)).toThrow(
      BadRequestException,
    );
  });

  it('passes when requirement actionDescription and verificationText are filled', () => {
    const payload = createValidSubmitPayload();

    expect(() => service.validateRequiredFieldsForSubmit(payload)).not.toThrow();
  });
});
