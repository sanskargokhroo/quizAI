'use client';

import { useState } from 'react';
import { BrainCircuit } from 'lucide-react';
import type { GenerateQuizOutput } from '@/ai/flows/generate-quiz';
import QuizConfig from '@/components/quiz-config';
import QuizDisplay from '@/components/quiz-display';
import QuizResults from '@/components/quiz-results';
import { generateMoreQuestionsAction } from './actions';
import { useToast } from '@/hooks/use-toast';

type AppState = 'CONFIG' | 'QUIZ' | 'RESULTS';
type Quiz = GenerateQuizOutput['quiz'];

export default function Home() {
  const [appState, setAppState] = useState<AppState>('CONFIG');
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [sourceText, setSourceText] = useState('');
  const [isGeneratingMore, setIsGeneratingMore] = useState(false);
  const { toast } = useToast();

  const handleQuizGenerated = (generatedQuiz: Quiz, text: string) => {
    setQuiz(generatedQuiz);
    setSourceText(text);
    setUserAnswers([]);
    setAppState('QUIZ');
  };

  const handleQuizFinished = (answers: string[]) => {
    setUserAnswers(answers);
    setAppState('RESULTS');
  };

  const handleRestart = () => {
    setQuiz(null);
    setUserAnswers([]);
    setSourceText('');
    setAppState('CONFIG');
  };

  const handleContinue = async (text: string, numQuestions: number) => {
    setIsGeneratingMore(true);
    const result = await generateMoreQuestionsAction({ text, numQuestions });
    setIsGeneratingMore(false);

    if (result.error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: result.error,
      });
    } else if (result.quiz) {
      handleQuizGenerated(result.quiz, text);
    }
  };


  const renderContent = () => {
    switch (appState) {
      case 'QUIZ':
        return quiz && <QuizDisplay quiz={quiz} onQuizFinish={handleQuizFinished} />;
      case 'RESULTS':
        return quiz && <QuizResults quiz={quiz} userAnswers={userAnswers} sourceText={sourceText} onRestart={handleRestart} onContinue={handleContinue} isContinuing={isGeneratingMore} />;
      case 'CONFIG':
      default:
        return <QuizConfig onQuizGenerated={handleQuizGenerated} />;
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center bg-background p-4 sm:p-8">
      <div className="flex w-full max-w-4xl flex-col items-start gap-8">
        <header className="flex flex-col items-start text-left gap-2 w-full">
          <div className="flex items-center gap-3">
            <BrainCircuit className="h-10 w-10 text-primary" />
            <div className="flex flex-col">
              <h1 className="text-4xl font-bold text-foreground">QuizifyAI</h1>
              <p className="text-sm text-muted-foreground self-center -ml-2">
                by Sanskar Gokhroo
              </p>
            </div>
          </div>
        </header>

        <div className="w-full">
          {renderContent()}
        </div>

        <footer className="text-center text-sm text-muted-foreground w-full">
          <p>&copy; {new Date().getFullYear()} QuizifyAI. All rights reserved.</p>
        </footer>
      </div>
    </main>
  );
}
