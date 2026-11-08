
const SYSTEM = `You are an expert ATS and technical recruiter. Analyze the resume
(and the job description if given). Respond with ONLY valid JSON in this shape:
{"atsScore":0-100,"summary":"string","strengths":["..."],"weaknesses":["..."],
"missingKeywords":["..."],"suggestions":["specific, actionable rewrites"],
"jobMatchScore":0-100 or null}`;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export async function analyzeResume(resumeText, jobDescription = '') {
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': process.env.GEMINI_API_KEY,
          },
          signal: AbortSignal.timeout(60000),
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: SYSTEM }],
            },
            contents: [{
              role: 'user',
              parts: [{
                text: `RESUME:\n${resumeText.slice(0, 15000)}

JOB DESCRIPTION:\n${jobDescription.slice(0, 6000) || 'None provided'}`,
              }],
            }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.3,
            },
          }),
        }
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.error('Gemini API error:', res.status, data);

        // Retry temporary server or rate-limit errors
        if ([429, 500, 502, 503, 504].includes(res.status) && attempt < 3) {
          await sleep(attempt * 2000);
          continue;
        }

        const error = new Error(
          data.error?.message || 'Gemini API request failed'
        );

        error.status = res.status;
        throw error;
      }

      const responseText =
        data.candidates?.[0]?.content?.parts
          ?.map(part => part.text)
          .join('') || '';

      if (!responseText) {
        throw new Error('Gemini returned an empty response.');
      }

      return JSON.parse(
        responseText.replace(/```json|```/g, '').trim()
      );

    } catch (error) {
      if (
        error.name === 'TimeoutError' ||
        error.name === 'AbortError'
      ) {
        if (attempt < 3) {
          await sleep(attempt * 2000);
          continue;
        }

        const timeoutError = new Error(
          'Gemini took too long to respond. Please try again.'
        );
        timeoutError.status = 504;
        throw timeoutError;
      }

      throw error;
    }
  }
}
