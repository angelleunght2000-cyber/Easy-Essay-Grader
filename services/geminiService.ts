
import { GoogleGenAI, Type } from "@google/genai";
import { EssayResult } from "../types";

// Initialize GoogleGenAI strictly using process.env.API_KEY in a named parameter
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Extracts raw text from a .docx file using mammoth.js (loaded via script tag in index.html)
 */
const extractTextFromDocx = async (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      const arrayBuffer = event.target?.result as ArrayBuffer;
      try {
        // @ts-ignore - mammoth is loaded globally via CDN
        const result = await window.mammoth.extractRawText({ arrayBuffer });
        resolve(result.value);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(blob);
  });
};

export const scoreEssay = async (
  fileName: string, 
  content: string | Blob, 
  mimeType: string
): Promise<Partial<EssayResult>> => {
  const model = 'gemini-3-pro-preview';
  
  const systemInstruction = `
    You are a DETERMINISTIC SCORING ENGINE for management trainee essays. 
    Your goal is absolute consistency: the same input MUST yield the same score every time.
    
    EVALUATION PROTOCOL (Total 100 Points):

    1. LOGIC & FLOW (60 Points Total) - THE CRITICAL COMPONENT:
       Apply a strict 4-pillar objective checklist. Award EXACTLY 15 points for each pillar met:
       - Pillar A: STRUCTURAL INTEGRITY (15 pts) - Evidence of distinct Introduction, Body, and Conclusion sections.
       - Pillar B: ARGUMENTATIVE SEQUENCE (15 pts) - Each paragraph follows a logical "Point -> Evidence -> Explanation" pattern.
       - Pillar C: CONNECTIVITY (15 pts) - Effective use of at least 4 unique logical transitions (e.g., "Furthermore", "Conversely", "Consequently", "In addition").
       - Pillar D: THESIS CONSISTENCY (15 pts) - The conclusion directly answers or reinforces the thesis stated in the introduction without contradiction.

    2. CONTEXT & VALUES (20 Points Total):
       Evaluate the presence of 9 specific Company Values. Award EXACTLY 2.22 points for each value present/demonstrated. 
       Values: Leadership, Versatility, Safety, Vision, Innovation, Customer-orientation, Positive Communication, Teamwork, Result-driven performance.
       Calculation: (Number of Values Identified) * 2.22. Round to nearest integer.

    3. GRAMMAR & VOCABULARY (20 Points Total):
       - Start at 20 points.
       - Subtract 2 points for every unique major grammatical error or spelling mistake found.
       - Minimum score for this section is 0.

    AI DETECTION:
    - If patterns indicate LLM generation (e.g., generic lists, "As an AI language model", overly repetitive sentence structures), set "isSuspectedAI" to true.
    - If "isSuspectedAI" is true, include "suspected ai generated" in the reason field.

    OUTPUT RULES:
    - Score: Integer (Sum of 1+2+3).
    - Reason: Maximum 30 words. MUST summarize why the Logic/Flow score was given and list found values.
    - Summary: Maximum 100 words. Neutral overview of the candidate's core argument.
    - isSuspectedAI: Boolean.

    CRITICAL: You are a machine. Use the checklist. If a pillar isn't 100% met, award 0 for that pillar. Absolute objectivity is required.
  `;

  try {
    const parts: any[] = [{ text: "Apply the strict deterministic scoring protocol to this essay. Focus heavily on Logic and Flow (60%)." }];
    
    if (content instanceof Blob && (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileName.endsWith('.docx'))) {
      try {
        const extractedText = await extractTextFromDocx(content);
        parts.push({ text: `ESSAY TEXT:\n${extractedText}` });
      } catch (docxError) {
        console.error("Error extracting text from DOCX:", docxError);
        parts.push({ text: "Error: Could not extract text." });
      }
    } else if (typeof content === 'string') {
      parts.push({ text: `ESSAY TEXT:\n${content}` });
    } else {
      const base64Data = await blobToBase64(content);
      parts.push({
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      });
    }

    const response = await ai.models.generateContent({
      model,
      contents: { parts },
      config: {
        systemInstruction,
        temperature: 0, // CRITICAL for consistency
        seed: 42,       // CRITICAL for reproducibility
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.INTEGER },
            reason: { type: Type.STRING },
            summary: { type: Type.STRING },
            isSuspectedAI: { type: Type.BOOLEAN }
          },
          required: ["score", "reason", "summary", "isSuspectedAI"]
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    return {
      score: result.score || 0,
      reason: result.reason || "Processed successfully.",
      summary: result.summary || "Summary unavailable.",
      isSuspectedAI: result.isSuspectedAI || false,
      status: 'completed'
    };
  } catch (error) {
    console.error("Gemini Scoring Error:", error);
    return {
      score: 0,
      reason: "Error processing document.",
      summary: "Error during deterministic analysis.",
      isSuspectedAI: false,
      status: 'error'
    };
  }
};

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};