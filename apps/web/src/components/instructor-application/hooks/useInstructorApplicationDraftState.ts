// @file: apps/web/src/components/instructor-application/hooks/useInstructorApplicationDraftState.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import {
  EDITABLE_INSTRUCTOR_APPLICATION_FIELDS,
  canEditInstructorApplicationField,
} from "@/lib/instructor-application-editability";
import type {
  AttachmentResponse,
  EditableInstructorApplicationField,
  InstructorApplicationDetail,
  UpdateInstructorApplication,
} from "@hss/schemas/instructor-application";

type Params = {
  initialApp: InstructorApplicationDetail;
  id: string;
};

function isEditableInstructorApplicationFieldKey(
  value: string,
): value is EditableInstructorApplicationField {
  return (EDITABLE_INSTRUCTOR_APPLICATION_FIELDS as readonly string[]).includes(value);
}

function getChangedPatchData(
  data: Partial<UpdateInstructorApplication>,
  currentApp: InstructorApplicationDetail,
): Partial<UpdateInstructorApplication> {
  const filtered = Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined),
  ) as Record<string, unknown>;

  const changedEntries = Object.entries(filtered).filter(([key, value]) => {
    const currentValue = (currentApp as unknown as Record<string, unknown>)[key];
    return currentValue !== value;
  });

  return Object.fromEntries(changedEntries) as Partial<UpdateInstructorApplication>;
}

export function useInstructorApplicationDraftState({ initialApp, id }: Params) {
  const [app, setApp] = useState(initialApp);
  const appRef = useRef(app);
  const persistedAppRef = useRef(initialApp);

  useEffect(() => {
    appRef.current = app;
  }, [app]);

  const replaceDraftFromServer = useCallback(
    (nextApp: InstructorApplicationDetail) => {
      persistedAppRef.current = nextApp;
      appRef.current = nextApp;
      setApp(nextApp);
    },
    [],
  );

  const updateDraft = useCallback((patch: Partial<UpdateInstructorApplication>) => {
    setApp((prev) => {
      const editablePatch = Object.fromEntries(
        Object.entries(patch).filter(([key]) => {
          if (!isEditableInstructorApplicationFieldKey(key)) {
            return false;
          }

          return canEditInstructorApplicationField(prev.candidateEditScope, key);
        }),
      ) as Partial<UpdateInstructorApplication>;

      if (Object.keys(editablePatch).length === 0) {
        return prev;
      }

      const next = { ...prev, ...editablePatch };
      appRef.current = next;
      return next;
    });
  }, []);

  const persistDraftPatch = useCallback(
    async (patch: Partial<UpdateInstructorApplication>) => {
      const editablePatch = Object.fromEntries(
        Object.entries(patch).filter(([key, value]) => {
          if (value === undefined || !isEditableInstructorApplicationFieldKey(key)) {
            return false;
          }

          return canEditInstructorApplicationField(appRef.current.candidateEditScope, key);
        }),
      ) as Partial<UpdateInstructorApplication>;

      if (Object.keys(editablePatch).length === 0) {
        return;
      }

      const changed = getChangedPatchData(editablePatch, persistedAppRef.current);
      if (Object.keys(changed).length === 0) {
        return;
      }

      await apiFetch(`instructor-applications/${id}`, {
        method: "PATCH",
        body: JSON.stringify(changed),
      });

      persistedAppRef.current = { ...persistedAppRef.current, ...changed };
    },
    [id],
  );

  const replaceHufcowyPresenceAttachments = useCallback(
    (attachments: AttachmentResponse[]) => {
      setApp((prev) => {
        const nextHufcowyAttachment =
          attachments.length > 0 ? attachments[attachments.length - 1] : null;
        const previousHufcowyAttachmentUuid = prev.hufcowyPresenceAttachmentUuid;
        const preservedAttachments = prev.attachments.filter(
          (attachment) => attachment.uuid !== previousHufcowyAttachmentUuid,
        );
        const nextAttachments = nextHufcowyAttachment
          ? [
              ...preservedAttachments.filter(
                (attachment) => attachment.uuid !== nextHufcowyAttachment.uuid,
              ),
              nextHufcowyAttachment,
            ]
          : preservedAttachments;
        const next = {
          ...prev,
          attachments: nextAttachments,
          hufcowyPresenceAttachmentUuid: nextHufcowyAttachment?.uuid ?? null,
        };

        appRef.current = next;
        persistedAppRef.current = next;
        return next;
      });
    },
    [],
  );

  const replaceTopLevelAttachments = useCallback((attachments: AttachmentResponse[]) => {
    setApp((prev) => {
      const currentHufcowyAttachment = prev.hufcowyPresenceAttachmentUuid
        ? prev.attachments.find(
            (attachment) => attachment.uuid === prev.hufcowyPresenceAttachmentUuid,
          ) ?? null
        : null;
      const next = {
        ...prev,
        attachments: currentHufcowyAttachment
          ? [...attachments, currentHufcowyAttachment]
          : attachments,
      };

      appRef.current = next;
      persistedAppRef.current = next;
      return next;
    });
  }, []);

  const replaceRequirementAttachments = useCallback(
    (requirementUuid: string, attachments: AttachmentResponse[]) => {
      setApp((prev) => {
        const next = {
          ...prev,
          requirements: prev.requirements.map((requirement) =>
            requirement.uuid === requirementUuid
              ? {
                  ...requirement,
                  attachments,
                }
              : requirement,
          ),
        };

        appRef.current = next;
        persistedAppRef.current = next;
        return next;
      });
    },
    [],
  );

  return {
    app,
    appRef,
    replaceDraftFromServer,
    updateDraft,
    persistDraftPatch,
    replaceHufcowyPresenceAttachments,
    replaceTopLevelAttachments,
    replaceRequirementAttachments,
  };
}
