import { z } from 'zod';
import { IPD_STATUSES } from '../models/ipdAdmission.model.js';

export const createIpdAdmissionSchema = z.object({
  application_id: z.string().uuid({ message: 'Valid application_id UUID is required' }),
  patient_id: z.string().uuid({ message: 'Invalid patient_id UUID' }).optional().nullable(),
  hospital_id: z.string().uuid({ message: 'Valid hospital_id UUID is required' }),
  admission_date: z.string().or(z.date()).optional(),
  ward_bed_number: z.string({ required_error: 'ward_bed_number is required' }).min(1).max(100),
  current_status: z.enum(IPD_STATUSES).optional().default('ADMITTED_WARD'),
  admitting_doctor: z.string().max(150).optional().nullable(),
  diagnosis: z.string().optional().nullable(),
  initial_notes: z.string().optional().nullable(),
});

export const transitionIpdStatusSchema = z.object({
  new_status: z.enum(IPD_STATUSES, { required_error: 'new_status is required' }),
  ward_bed_number: z.string().max(100).optional().nullable(),
  notes: z.string().optional().nullable(),
  discharge_date: z.string().or(z.date()).optional().nullable(),
  discharge_summary_url: z.string().url().optional().nullable().or(z.literal('')),
});

export const dischargeIpdSchema = z.object({
  discharge_date: z.string().or(z.date()).optional(),
  discharge_summary_url: z.string().url({ message: 'Valid discharge_summary_url is required' }).optional().nullable().or(z.literal('')),
  notes: z.string().optional().nullable(),
  ward_bed_number: z.string().max(100).optional().nullable(),
});
