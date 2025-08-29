'use client';

import { useEffect, useState, useRef, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { generateQuizAction, extractTextFromFileAction, generateSignedUploadUrlAction } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileUp, LoaderCircle, Sparkles, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { GenerateQuizOutput } from '@/ai/flows/generate-quiz';

type QuizConfigProps = {
  onQuizGenerated: (quiz: GenerateQuizOutput['quiz'], text: string) => void;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? (
        <>
          <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Sparkles className="mr-2 h-4 w-4" />
          Generate Quiz
        </>
      )}
    </Button>
  );
}

export default function QuizConfig({ onQuizGenerated }: QuizConfigProps) {
  const initialState = { quiz: null, error: null, text: null };
  const [state, formAction] = useActionState(generateQuizAction, initialState);
  const { toast } = useToast();
  const [numQuestions, setNumQuestions] = useState(10);
  const [textContent, setTextContent] = useState('');
  const [activeTab, setActiveTab] = useState('paste');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionSuccess, setExtractionSuccess] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');


  useEffect(() => {
    if (state.error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: state.error,
      });
    }
    if (state.quiz && state.text) {
      onQuizGenerated(state.quiz, state.text);
    }
  }, [state, onQuizGenerated, toast]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsExtracting(true);
    setExtractionSuccess(false);
    setProgress(0);
    setUploadStatus('Getting upload URL...');
    setActiveTab('paste'); // Switch to paste tab to show loader over textarea

    try {
      // 1. Get signed URL from server
      const signedUrlResult = await generateSignedUploadUrlAction({
        fileName: file.name,
        contentType: file.type,
      });

      if ('error' in signedUrlResult) {
        throw new Error(signedUrlResult.error);
      }
      
      const { url, filePath } = signedUrlResult;

      // 2. Upload file to Firebase Storage
      setUploadStatus('Uploading file...');
      setProgress(50); // Simulate progress
      
      const response = await fetch(url, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!response.ok) {
        throw new Error('File upload failed.');
      }
      
      setProgress(75);
      setUploadStatus('Extracting text...');

      // 3. Call action to extract text from the uploaded file
      const result = await extractTextFromFileAction({ filePath });

      setProgress(100);
      setIsExtracting(false);

      if (result.error) {
        throw new Error(result.error);
      } else if (result.text) {
        setTextContent(result.text);
        setExtractionSuccess(true);
        setTimeout(() => {
          setExtractionSuccess(false);
        }, 3000);
      }
    } catch (error) {
      setIsExtracting(false);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: (error as Error).message || 'An unexpected error occurred.',
      });
      setTextContent('');
    } finally {
        // Reset file input to allow uploading the same file again
        if(fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  }

  return (
    <Card className="w-full shadow-lg relative">
       {extractionSuccess && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-md z-10">
          <div className="flex flex-col items-center gap-2 bg-secondary p-6 rounded-lg shadow-xl">
            <CheckCircle className="h-10 w-10 text-green-500" />
            <p className="text-lg font-semibold text-foreground">Text extracted successfully!</p>
          </div>
        </div>
      )}
      <CardHeader>
        <CardTitle className="text-2xl">Create Your Quiz</CardTitle>
        <CardDescription>Start by providing some content. We'll use AI to generate a quiz from it.</CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="paste">Paste Text</TabsTrigger>
              <TabsTrigger value="upload" disabled={isExtracting}>Upload File</TabsTrigger>
            </TabsList>
            <TabsContent value="paste" className="mt-4">
              <div className="grid w-full gap-2 relative">
                <Label htmlFor="text-content">Your Text Content</Label>
                <Textarea
                  id="text-content"
                  name="text"
                  placeholder="Paste your notes, article, or any content here... (min. 50 characters)"
                  className="min-h-[200px] text-base"
                  required
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  disabled={isExtracting}
                />
                 {isExtracting && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 rounded-md p-8">
                    <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
                    <p className="mt-4 text-sm font-semibold text-muted-foreground">{uploadStatus}</p>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mt-4">
                        <div className="bg-primary h-2.5 rounded-full" style={{ width: `${progress}%`}}></div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{progress}%</p>
                  </div>
                )}
              </div>
            </TabsContent>
            <TabsContent value="upload" className="mt-4">
              <div 
                className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-12 text-center cursor-pointer hover:border-primary transition-colors"
                onClick={triggerFileSelect}
              >
                <FileUp className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-4 font-semibold text-primary">Click to upload a file</p>
                <p className="text-sm text-muted-foreground">Supported: .pdf, .doc, .docx, .txt</p>
                <input
                  ref={fileInputRef}
                  id="file-upload"
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={handleFileChange}
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="mt-6">
            <Label htmlFor="num-questions" className="mb-2 block">Number of Questions: {numQuestions}</Label>
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">5</span>
              <Slider
                id="num-questions"
                name="numQuestions"
                min={5}
                max={50}
                step={1}
                value={[numQuestions]}
                onValueChange={(value) => setNumQuestions(value[0])}
              />
              <span className="text-sm font-medium">50</span>
            </div>
            <input type="hidden" name="numQuestions" value={numQuestions} />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <SubmitButton />
        </CardFooter>
      </form>
    </Card>
  );
}
