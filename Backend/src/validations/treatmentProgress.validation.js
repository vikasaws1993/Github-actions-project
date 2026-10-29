import { z } from 'zod';

export const treatmentProgressSchema = z.object({
  stage: z.string().min(1, 'Treatment stage is required'),
  note: z.string().optional().nullable(),
  caseProgress: z.array(z.any()).optional().nullable(),
  status: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  statusVariant: z.string().optional().nullable(),
});

export const validateTreatmentProgress = (data) => {
  const result = treatmentProgressSchema.safeParse(data);
  if (!result.success) {
    return {
      success: false,
      error: result.error.errors[0]?.message || 'Invalid treatment progress payload',
      errors: result.error.format(),
    };
  }
  return {
    success: true,
    data: result.data,
  };
};

export default {
  treatmentProgressSchema,
  validateTreatmentProgress,
};
