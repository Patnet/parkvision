import { z } from "zod";
import { ReportReason, ReportTargetType } from "./enums.js";

export const CreateReportInput = z.object({
  targetType: ReportTargetType,
  targetId: z.string(),
  reason: ReportReason,
  details: z.string().max(500).optional(),
});
export type CreateReportInput = z.infer<typeof CreateReportInput>;
