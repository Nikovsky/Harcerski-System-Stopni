// @file: apps/api/src/modules/instructor-application/instructor-application-validation.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';

type ProfileForValidation = {
  firstName: string | null;
  surname: string | null;
  email: string | null;
  phone: string | null;
  birthDate: Date | null;
  hufiecCode: string | null;
  druzynaCode: string | null;
  scoutRank: string | null;
  inScoutingSince: Date | null;
  inZhrSince: Date | null;
  oathDate: Date | null;
};

type ApplicationForSubmitValidation = {
  teamFunction: string | null;
  hufiecFunction: string | null;
  openTrialForRank: string | null;
  plannedFinishAt: Date | null;
  hufcowyPresence: string | null;
  hufcowyPresenceAttachmentUuid: string | null;
  functionsHistory: string | null;
  coursesHistory: string | null;
  campsHistory: string | null;
  successes: string | null;
  failures: string | null;
  supervisorFirstName: string | null;
  supervisorSurname: string | null;
  supervisorInstructorRank: string | null;
  supervisorInstructorFunction: string | null;
  template: { degreeCode: string };
  requirements: Array<{
    state: string;
    verificationText: string | null;
    requirementDefinition: { code: string };
  }>;
  attachments: Array<{ uuid: string }>;
};

const BASIC_DEGREES = ['PWD', 'PHM'];

@Injectable()
export class InstructorApplicationValidationService {
  getMissingProfileFields(user: ProfileForValidation): string[] {
    const missing: string[] = [];
    if (!user.firstName) missing.push('firstName');
    if (!user.surname) missing.push('surname');
    if (!user.email) missing.push('email');
    if (!user.phone) missing.push('phone');
    if (!user.birthDate) missing.push('birthDate');
    if (!user.hufiecCode) missing.push('hufiecCode');
    if (!user.druzynaCode) missing.push('druzynaCode');
    if (!user.scoutRank) missing.push('scoutRank');
    if (!user.inScoutingSince) missing.push('inScoutingSince');
    if (!user.inZhrSince) missing.push('inZhrSince');
    if (!user.oathDate) missing.push('oathDate');
    return missing;
  }

  ensureProfileCompleteForWrite(user: ProfileForValidation): void {
    const missing = this.getMissingProfileFields(user);

    if (missing.length > 0) {
      throw new BadRequestException({
        code: 'PROFILE_INCOMPLETE',
        message: 'Uzupełnij profil w Dashboard przed utworzeniem wniosku.',
        missingFields: missing,
      });
    }
  }

  validateRequiredFieldsForSubmit(app: ApplicationForSubmitValidation): void {
    const missing: string[] = [];

    if (!app.plannedFinishAt) missing.push('plannedFinishAt');
    if (!app.hufcowyPresence) missing.push('hufcowyPresence');
    if (!app.functionsHistory?.trim()) missing.push('functionsHistory');
    if (!app.coursesHistory?.trim()) missing.push('coursesHistory');
    if (!app.campsHistory?.trim()) missing.push('campsHistory');
    if (!app.successes?.trim()) missing.push('successes');
    if (!app.failures?.trim()) missing.push('failures');
    if (!app.supervisorFirstName?.trim()) missing.push('supervisorFirstName');
    if (!app.supervisorSurname?.trim()) missing.push('supervisorSurname');
    if (!app.supervisorInstructorRank) missing.push('supervisorInstructorRank');
    if (!app.supervisorInstructorFunction?.trim()) {
      missing.push('supervisorInstructorFunction');
    }

    if (app.hufcowyPresence === 'ATTACHMENT_OPINION') {
      if (!app.hufcowyPresenceAttachmentUuid) {
        missing.push('hufcowyPresenceAttachment');
      } else {
        const hasLinkedAttachment = app.attachments.some(
          (attachment) => attachment.uuid === app.hufcowyPresenceAttachmentUuid,
        );
        if (!hasLinkedAttachment) {
          missing.push('hufcowyPresenceAttachment');
        }
      }
    }

    if (!BASIC_DEGREES.includes(app.template.degreeCode)) {
      if (!app.teamFunction?.trim()) missing.push('teamFunction');
      if (!app.hufiecFunction?.trim()) missing.push('hufiecFunction');
      if (!app.openTrialForRank) missing.push('openTrialForRank');
    }

    for (const req of app.requirements) {
      if (
        req.state === 'DONE' &&
        (!req.verificationText || !req.verificationText.trim())
      ) {
        missing.push(
          `requirement_${req.requirementDefinition.code}_verificationText`,
        );
      }
    }

    if (missing.length > 0) {
      throw new BadRequestException({
        code: 'APPLICATION_INCOMPLETE',
        message: 'Uzupełnij wszystkie wymagane pola przed złożeniem wniosku.',
        missingFields: missing,
      });
    }
  }
}
