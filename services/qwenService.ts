
import { EssayResult } from "../types";

/**
 * Extracts raw text from a .docx file using mammoth.js
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

export const scoreEssay = async (
  fileName: string, 
  content: string | Blob, 
  mimeType: string
): Promise<Partial<EssayResult>> => {
  const isMultimodal = mimeType.startsWith('image/');
  
  // Detect if we're in production (Vercel) or development (localhost)
  const isProduction = typeof window !== 'undefined' && window.location.hostname !== 'localhost';
  
  // Use different endpoints for dev vs production
  let endpoint: string;
  if (isProduction) {
    // Production: Use Vercel serverless function
    const path = isMultimodal 
      ? '/api/v1/services/aigc/multimodal-generation/generation'
      : '/api/v1/services/aigc/text-generation/generation';
    endpoint = `/api/qwen?endpoint=${encodeURIComponent(path)}`;
  } else {
    // Development: Use Vite proxy
    endpoint = isMultimodal 
      ? '/api/qwen/api/v1/services/aigc/multimodal-generation/generation'
      : '/api/qwen/api/v1/services/aigc/text-generation/generation';
  }

  const systemPrompt = `You are a DETERMINISTIC SCORING ENGINE. Absolute consistency is required.

EVALUATION PROTOCOL (Total 100 Points):
1. LOGIC & FLOW (60 Points Total) - THE CRITICAL COMPONENT:
   - Pillar A: STRUCTURAL INTEGRITY (15 pts) - Intro, Body, Conclusion present.
   - Pillar B: ARGUMENTATIVE SEQUENCE (15 pts) - Point -> Evidence -> Explanation flow.
   - Pillar C: CONNECTIVITY (15 pts) - Use of 4+ unique logical transitions.
   - Pillar D: THESIS CONSISTENCY (15 pts) - Conclusion reinforces the intro thesis.

2. CONTEXT & VALUES (20 Points Total):
   Award 2.22 pts for each of these 9 values found: Leadership, Versatility, Safety, Vision, Innovation, Customer-orientation, Positive Communication, Teamwork, Result-driven performance.

3. GRAMMAR & VOCABULARY (20 Points Total):
   Start at 20. Subtract 2 pts for every unique major error.

OUTPUT FORMAT (Strict JSON):
{
  "score": number,
  "reason": "max 30 words explaining logic score and found values",
  "summary": "max 100 words overview",
  "isSuspectedAI": boolean
}`;

  try {
    let textToAnalyze = "";
    
    // Extract text content
    if (typeof content === 'string') {
      textToAnalyze = content;
    } else if (content instanceof Blob) {
      if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileName.endsWith('.docx')) {
        textToAnalyze = await extractTextFromDocx(content);
      } else if (mimeType.startsWith('text/') || fileName.endsWith('.txt')) {
        textToAnalyze = await content.text();
      } else if (isMultimodal) {
        // Handle images separately
        const base64Data = await blobToBase64(content);
        
        // Note: qwen-vl-plus is available in free tier, qwen-vl-max requires purchase
        const payload = {
          model: "qwen-vl-plus",
          input: {
            messages: [
              {
                role: "user",
                content: [
                  { text: systemPrompt },
                  { image: `data:${mimeType};base64,${base64Data}` },
                  { text: "Analyze this essay image according to the protocol above and respond with ONLY valid JSON." }
                ]
              }
            ]
          },
          parameters: {
            seed: 42,
            result_format: "message"
          }
        };

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Qwen API Error Response:", errorText);
          throw new Error(`Qwen API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const contentText = data.output?.choices?.[0]?.message?.content?.[0]?.text || "";
        
        const jsonMatch = contentText.match(/\{[\s\S]*\}/);
        const result = JSON.parse(jsonMatch ? jsonMatch[0] : contentText);

        return {
          score: result.score || 0,
          reason: result.reason || "Processed with Qwen-VL-Plus.",
          summary: result.summary || "Summary generated by Qwen.",
          isSuspectedAI: result.isSuspectedAI || false,
          status: 'completed'
        };
      }
    }

    // For text-based content, use native DashScope API format
    // Using qwen-turbo - most commonly available model
    const payload = {
      model: "qwen-turbo",
      input: {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyze this essay and respond with ONLY valid JSON:\n\n${textToAnalyze}` }
        ]
      },
      parameters: {
        result_format: "message",
        temperature: 0.1
      }
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Qwen API Error Response:", errorText);
      throw new Error(`Qwen API Error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    const contentText = data.output?.choices?.[0]?.message?.content || "";
    
    // Parse JSON response
    const result = JSON.parse(contentText);

    return {
      score: result.score || 0,
      reason: result.reason || "Processed with Qwen-Turbo.",
      summary: result.summary || "Summary generated by Qwen.",
      isSuspectedAI: result.isSuspectedAI || false,
      status: 'completed'
    };
  } catch (error: any) {
    console.error("Qwen Scoring Error:", error);
    console.error("Error details:", error.message);
    return {
      score: 0,
      reason: `Error: ${error.message || 'Unknown error'}`,
      summary: "Could not process document via DashScope. Check API key and network connection.",
      isSuspectedAI: false,
      status: 'error'
    };
  }
};
