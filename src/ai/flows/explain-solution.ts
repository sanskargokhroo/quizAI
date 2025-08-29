'use server';

/**
 * @fileOverview Explains quiz solutions for wrong answers.
 *
 * - explainQuizSolution - A function that explains the solutions for incorrect quiz answers.
 * - ExplainQuizSolutionInput - The input type for the explainQuizSolution function.
 * - ExplainQuizSolutionOutput - The return type for the explainQuizSolution function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExplainQuizSolutionInputSchema = z.object({
  question: z.string().describe('The quiz question.'),
  userAnswer: z.string().describe('The user\'s answer to the question.'),
  correctAnswer: z.string().describe('The correct answer to the question.'),
  contextText: z.string().describe('The text from which the quiz was generated.'),
});
export type ExplainQuizSolutionInput = z.infer<typeof ExplainQuizSolutionInputSchema>;

const ExplainQuizSolutionOutputSchema = z.object({
  explanation: z.string().describe('The explanation of the correct answer and why the user\'s answer was incorrect.'),
});
export type ExplainQuizSolutionOutput = z.infer<typeof ExplainQuizSolutionOutputSchema>;

export async function explainQuizSolution(input: ExplainQuizSolutionInput): Promise<ExplainQuizSolutionOutput> {
  return explainQuizSolutionFlow(input);
}

const explainQuizSolutionPrompt = ai.definePrompt({
  name: 'explainQuizSolutionPrompt',
  input: {schema: ExplainQuizSolutionInputSchema},
  output: {schema: ExplainQuizSolutionOutputSchema},
  prompt: `You are an expert tutor explaining quiz solutions.

  Provide a clear and concise explanation of the correct answer to the question, and explain why the user's answer was incorrect, using the provided context text.

  Question: {{{question}}}
  User's Answer: {{{userAnswer}}}
  Correct Answer: {{{correctAnswer}}}
  Context Text: {{{contextText}}}`,
});

const explainQuizSolutionFlow = ai.defineFlow(
  {
    name: 'explainQuizSolutionFlow',
    inputSchema: ExplainQuizSolutionInputSchema,
    outputSchema: ExplainQuizSolutionOutputSchema,
  },
  async input => {
    const {output} = await explainQuizSolutionPrompt(input);
    return output!;
  }
);
