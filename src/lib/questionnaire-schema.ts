import { z } from 'zod';
import { plainText } from './input-security';

export const questionSchema = z.object({
  label: plainText(300).refine(v => v.length > 0, 'יש להזין שאלה'),
  kind: z.enum(['text', 'yes_no']),
});
export const questionnaireSchema = z.object({
  title: plainText(150).refine(v => v.length > 0, 'יש להזין כותרת'),
  questions: z.array(questionSchema).min(1).max(20),
});
export type Questionnaire = z.infer<typeof questionnaireSchema>;