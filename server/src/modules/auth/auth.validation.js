import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required').optional().or(z.string()),
    role: z.string().optional(),
  }).passthrough(),
});

export const signupSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
    role: z.enum(['admin', 'employee']).default('employee'),
    orgName: z.string().optional(),
    orgId: z.string().optional(),
  }).passthrough(),
});
