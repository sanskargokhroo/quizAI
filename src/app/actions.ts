'use server';

import { generateQuiz, type GenerateQuizOutput } from '@/ai/flows/generate-quiz';
import { explainQuizSolution, type ExplainQuizSolutionInput, type ExplainQuizSolutionOutput } from '@/ai/flows/explain-solution';
import { extractTextFromFile, type ExtractTextFromFileInput } from '@/ai/flows/extract-text-from-file';
import { z } from 'zod';
import { extractTextFromPdf } from '@/ai/flows/extract-text-from-pdf';
import { getStorage } from 'firebase-admin/storage';
import { adminApp } from '@/lib/firebase-admin';

const generateQuizSchema = z.object({
  text: z.string().min(50, { message: 'Please provide at least 50 characters of content to generate a quiz.' }),
  numQuestions: z.number().min(5).max(50),
});

export async function generateSignedUploadUrlAction(input: { fileName: string, contentType: string }): Promise<{ url: string, filePath: string } | { error: string }> {
  try {
    const bucket = getStorage(adminApp).bucket();
    const filePath = `uploads/${Date.now()}-${input.fileName}`;
    const file = bucket.file(filePath);
    const options = {
      version: 'v4' as const,
      action: 'write' as const,
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      contentType: input.contentType,
    };

    const [url] = await file.getSignedUrl(options);
    return { url, filePath };
  } catch (e) {
    console.error("Error generating signed URL:", e);
    return { error: 'Failed to generate upload URL.' };
  }
}

export async function generateQuizAction(
  prevState: any,
  formData: FormData
): Promise<{ quiz: GenerateQuizOutput['quiz'] | null; error: string | null; text: string | null }> {
  const rawData = {
    text: formData.get('text') as string,
    numQuestions: Number(formData.get('numQuestions')),
  };

  const validatedFields = generateQuizSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return { quiz: null, error: validatedFields.error.errors.map((e) => e.message).join(', '), text: rawData.text };
  }
  
  const { text, numQuestions } = validatedFields.data;

  try {
    const result = await generateQuiz({ text, numQuestions });
    if (!result.quiz || result.quiz.length === 0) {
      return { quiz: null, error: 'Could not generate a quiz from the provided content. Please try with different content.', text };
    }
    return { quiz: result.quiz, error: null, text };
  } catch (e) {
    console.error(e);
    return { quiz: null, error: 'An unexpected error occurred while generating the quiz. Please try again later.', text };
  }
}

export async function generateMoreQuestionsAction(
  input: { text: string; numQuestions: number }
): Promise<{ quiz: GenerateQuizOutput['quiz'] | null; error: string | null; }> {
  const validatedFields = generateQuizSchema.safeParse(input);

  if (!validatedFields.success) {
    return { quiz: null, error: validatedFields.error.errors.map((e) => e.message).join(', ') };
  }
  
  const { text, numQuestions } = validatedFields.data;

  try {
    const result = await generateQuiz({ text, numQuestions });
    if (!result.quiz || result.quiz.length === 0) {
      return { quiz: null, error: 'Could not generate more questions from the provided content. Please try again.' };
    }
    return { quiz: result.quiz, error: null };
  } catch (e) {
    console.error(e);
    return { quiz: null, error: 'An unexpected error occurred while generating more questions. Please try again later.' };
  }
}


export async function explainSolutionAction(
  input: ExplainQuizSolutionInput
): Promise<{ explanation: string | null; error: string | null }> {
  try {
    const result = await explainQuizSolution(input);
    return { explanation: result.explanation, error: null };
  } catch (e) {
    console.error(e);
    return { explanation: null, error: 'Failed to get explanation.' };
  }
}

export async function extractTextFromFileAction(
  input: { filePath: string }
): Promise<{ text: string | null; error: string | null }> {
  try {
    const bucket = getStorage(adminApp).bucket();
    const file = bucket.file(input.filePath);
    const [metadata] = await file.getMetadata();
    const mimeType = metadata.contentType;

    const fileBuffer = (await file.download())[0];
    const fileDataUri = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;

    const extractionInput = { fileDataUri };

    let result;
    if (mimeType === 'application/pdf') {
      result = await extractTextFromPdf(extractionInput);
    } else {
      result = await extractTextFromFile(extractionInput);
    }
    
    return { text: result.text, error: null };
  } catch (e) {
    console.error("Error in extractTextFromFileAction:", e);
    return { text: null, error: `Failed to extract text from the file: ${(e as Error).message}` };
  }
}
