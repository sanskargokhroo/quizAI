'use client';

import { useMemo, useState } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Lightbulb, RefreshCw, XCircle, CheckCircle, LoaderCircle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { explainSolutionAction } from '@/app/actions';
import type { GenerateQuizOutput } from '@/ai/flows/generate-quiz';

type QuizResultsProps = {
  quiz: GenerateQuizOutput['quiz'];
  userAnswers: string[];
  sourceText: string;
  onRestart: () => void;
  onContinue: (text: string, numQuestions: number) => Promise<void>;
  isContinuing: boolean;
};

type ExplanationState = {
  [key: number]: {
    loading: boolean;
    explanation: string | null;
    error: string | null;
  };
};

export default function QuizResults({ quiz, userAnswers, sourceText, onRestart, onContinue, isContinuing }: QuizResultsProps) {
  const [explanations, setExplanations] = useState<ExplanationState>({});

  const score = useMemo(() => {
    return userAnswers.reduce((acc, answer, index) => {
      const correctAnswer = quiz[index].answers[quiz[index].correctAnswerIndex];
      return acc + (answer === correctAnswer ? 1 : 0);
    }, 0);
  }, [userAnswers, quiz]);

  const scorePercentage = (score / quiz.length) * 100;

  const handleExplain = async (index: number) => {
    setExplanations((prev) => ({ ...prev, [index]: { loading: true, explanation: null, error: null } }));

    const questionData = quiz[index];
    const userAnswer = userAnswers[index];
    const correctAnswer = questionData.answers[questionData.correctAnswerIndex];

    const result = await explainSolutionAction({
      question: questionData.question,
      userAnswer,
      correctAnswer,
      contextText: sourceText,
    });

    setExplanations((prev) => ({
      ...prev,
      [index]: {
        loading: false,
        explanation: result.explanation,
        error: result.error,
      },
    }));
  };

  const handleContinueClick = () => {
    onContinue(sourceText, quiz.length);
  }

  return (
    <div className="w-full space-y-6">
      <Card className="shadow-lg text-center">
        <CardHeader>
          <CardTitle className="text-3xl">Quiz Complete!</CardTitle>
          <CardDescription>Here's how you did.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-5xl font-bold text-primary">{scorePercentage.toFixed(0)}%</p>
          <p className="text-xl text-muted-foreground">
            You answered <span className="font-semibold text-foreground">{score}</span> out of{' '}
            <span className="font-semibold text-foreground">{quiz.length}</span> questions correctly.
          </p>
          <div className="flex justify-center gap-4">
            <Button onClick={onRestart} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Take a New Quiz
            </Button>
            <Button onClick={handleContinueClick} disabled={isContinuing}>
              {isContinuing ? (
                <>
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Continue Quiz
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Review Your Answers</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {quiz.map((q, index) => {
              const correctAnswer = q.answers[q.correctAnswerIndex];
              const userAnswer = userAnswers[index];
              const isCorrect = userAnswer === correctAnswer;
              const explanationState = explanations[index];

              return (
                <AccordionItem value={`item-${index}`} key={index}>
                  <AccordionTrigger className="text-left">
                    <div className="flex items-center gap-3">
                      {isCorrect ? (
                        <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                      )}
                      <span className="flex-1">
                        {index + 1}. {q.question}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 px-2">
                    <p>
                      <span className="font-semibold">Your answer: </span>
                      <span className={cn(isCorrect ? 'text-green-600' : 'text-destructive')}>
                        {userAnswer || 'Not answered'}
                      </span>
                    </p>
                    {!isCorrect && (
                      <p>
                        <span className="font-semibold">Correct answer: </span>
                        <span className="text-green-600">{correctAnswer}</span>
                      </p>
                    )}
                    <p>
                      <span className="font-semibold">Solution: </span>
                      {q.solution}
                    </p>
                    {!isCorrect && (
                      <div className="mt-4">
                        {explanationState?.loading ? (
                          <Button disabled size="sm">
                            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                            Getting Explanation...
                          </Button>
                        ) : (
                          <Button onClick={() => handleExplain(index)} variant="secondary" size="sm">
                            <Lightbulb className="mr-2 h-4 w-4" />
                            Explain Solution with AI
                          </Button>
                        )}
                        {explanationState?.explanation && (
                          <Alert className="mt-4 bg-primary/10">
                            <Lightbulb className="h-4 w-4" />
                            <AlertTitle>Explanation</AlertTitle>
                            <AlertDescription>{explanationState.explanation}</AlertDescription>
                          </Alert>
                        )}
                         {explanationState?.error && (
                          <Alert variant="destructive" className="mt-4">
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{explanationState.error}</AlertDescription>
                          </Alert>
                        )}
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
