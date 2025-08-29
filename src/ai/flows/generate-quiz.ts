// src/ai/flows/generate-quiz.ts
'use server';
/**
 * @fileOverview Generates a quiz from a given text.
 *
 * - generateQuiz - A function that generates a quiz from the given text.
 * - GenerateQuizInput - The input type for the generateQuiz function.
 * - GenerateQuizOutput - The return type for the generateQuiz function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateQuizInputSchema = z.object({
  text: z.string().describe('The text to generate the quiz from.'),
  numQuestions: z.number().min(5).max(50).describe('The number of questions to generate.'),
});
export type GenerateQuizInput = z.infer<typeof GenerateQuizInputSchema>;

const GenerateQuizOutputSchema = z.object({
  quiz: z.array(
    z.object({
      question: z.string().describe('The quiz question.'),
      answers: z.array(z.string()).describe('The possible answers to the question.'),
      correctAnswerIndex: z.number().describe('The index of the correct answer in the answers array.'),
      solution: z.string().describe('The solution to the question.'),
    })
  ).describe('The generated quiz.'),
});
export type GenerateQuizOutput = z.infer<typeof GenerateQuizOutputSchema>;

export async function generateQuiz(input: GenerateQuizInput): Promise<GenerateQuizOutput> {
  return generateQuizFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateQuizPrompt',
  input: {schema: GenerateQuizInputSchema},
  output: {schema: GenerateQuizOutputSchema},
  prompt: `You are a quiz generator. You will generate a quiz from the given text.
The quiz should have the number of questions specified by the user.
The quiz should have multiple choice questions with 4 possible answers.
One and only one answer should be correct.
For each question, you should also provide the solution.

Text: {{{text}}}
Number of questions: {{{numQuestions}}}
`,
});

const generateQuizFlow = ai.defineFlow(
  {
    name: 'generateQuizFlow',
    inputSchema: GenerateQuizInputSchema,
    outputSchema: GenerateQuizOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
