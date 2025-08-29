'use server';
/**
 * @fileOverview Extracts text from a given PDF file.
 *
 * - extractTextFromPdf - A function that extracts text from a PDF file.
 * - ExtractTextFromPdfInput - The input type for the extractTextFromPdf function.
 * - ExtractTextFromPdfOutput - The return type for the extractTextFromPdf function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
// import pdfParse from 'pdf-parse'; // Commenting out direct import
import pdfParse from 'pdf-parse-debugging-disabled'; // Use the patched version

const ExtractTextFromPdfInputSchema = z.object({
  fileDataUri: z
    .string()
    .describe(
      "A PDF file as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:application/pdf;base64,<encoded_data>'."
    ),
});
export type ExtractTextFromPdfInput = z.infer<typeof ExtractTextFromPdfInputSchema>;

const ExtractTextFromPdfOutputSchema = z.object({
  text: z.string().describe('The extracted text from the PDF file.'),
});
export type ExtractTextFromPdfOutput = z.infer<typeof ExtractTextFromPdfOutputSchema>;


export async function extractTextFromPdf(input: ExtractTextFromPdfInput): Promise<ExtractTextFromPdfOutput> {
  return extractTextFromPdfFlow(input);
}


const extractTextFromPdfFlow = ai.defineFlow(
    {
      name: 'extractTextFromPdfFlow',
      inputSchema: ExtractTextFromPdfInputSchema,
      outputSchema: ExtractTextFromPdfOutputSchema,
    },
    async (input) => {
      try {
        // Extract base64 data from the data URI
        const base64 = input.fileDataUri.split(',')[1];
        const pdfBuffer = Buffer.from(base64, 'base64');

        // Dynamically import pdf-parse
        const pdfParse = (await import('pdf-parse-debugging-disabled')).default;
        // Use pdf-parse to extract text
        const data = await pdfParse(pdfBuffer, { 
          pagerender: (pageData: any) => pageData.getTextContent().then((textContent: any) => textContent.items.map((item: any) => item.str).join('')),
          max: undefined, // Removed max:1 for all pages
          // Disable worker to prevent file system access errors in server environment
          // pdfjs: { 
          //   workerSrc: '' 
          // }
        });

        return {text: data.text};
      } catch (e) {
        console.error("Error during PDF text extraction:", e);
        console.error("PDF extraction error details:", e); // Add detailed logging
        throw e;
      }
    }
  );
  
