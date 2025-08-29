import { config } from 'dotenv';
config();

import '@/ai/flows/explain-solution.ts';
import '@/ai/flows/generate-quiz.ts';
import '@/ai/flows/extract-text-from-file.ts';
import '@/ai/flows/extract-text-from-pdf.ts';