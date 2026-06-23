/* ============================================
   CRIMEGPT 2.0 — GROQ AI PROXY
   ============================================
   Serverless function that proxies AI calls
   to Groq. The API key lives server-side only
   and is never sent to the browser.

   Endpoint: POST /api/analyze
   Body: { systemPrompt, userPrompt, temperature?, maxTokens? }
   ============================================ */

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

// Simple per-IP rate limiting (in-memory, per function instance)
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 10;
const rateLimitMap = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip) || { count: 0, windowStart: now };
  if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    entry.count = 0;
    entry.windowStart = now;
  }
  entry.count++;
  rateLimitMap.set(ip, entry);
  return entry.count <= RATE_LIMIT_MAX;
}

// Clean up stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap.entries()) {
    if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS * 5) {
      rateLimitMap.delete(ip);
    }
  }
}, 5 * 60 * 1000);

export default async function handler(req, res) {
  // CORS headers — restrict to your domain only
  const allowedOrigin = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.ALLOWED_ORIGIN || 'http://localhost:5173';

  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Session validation — require authenticated session
  // Check for Firebase ID token in Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Note: Full Firebase token verification would require admin SDK
  // For now, we validate the token format exists
  // In production, use firebase-admin to verify: await admin.auth().verifyIdToken(token)
  const token = authHeader.split('Bearer ')[1];
  if (!token || token.length < 10) {
    return res.status(401).json({ error: 'Invalid authentication token' });
  }

  // Rate limit check
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({ error: 'Rate limit exceeded. Maximum 10 requests per minute.' });
  }

  // Server-side API key — never exposed to the browser
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'AI service not configured' });
  }

  const { systemPrompt, userPrompt, temperature = 0.15, maxTokens = 2048 } = req.body || {};

  if (!systemPrompt || !userPrompt) {
    return res.status(400).json({ error: 'Missing systemPrompt or userPrompt' });
  }

  // Input sanitization — prevent prompt injection
  // Strip control characters (except newlines/tabs)
  const sanitizePrompt = (prompt) => {
    return prompt
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control chars
      .replace(/<\|.*?\|>/g, '') // Remove special tokens
      .replace(/\[INST\]|\[\/INST\]/g, '') // Remove instruction tags
      .substring(0, 50000); // Hard limit
  };

  const sanitizedSystemPrompt = sanitizePrompt(systemPrompt);
  const sanitizedUserPrompt = sanitizePrompt(userPrompt);

  // Input size guard — reject excessively large payloads
  if (userPrompt.length > 50000 || systemPrompt.length > 50000) {
    return res.status(413).json({ error: 'Prompt too large (max 50,000 characters each)' });
  }

  try {
    const groqResponse = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: sanitizedSystemPrompt },
          { role: 'user', content: sanitizedUserPrompt },
        ],
        temperature,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' },
      }),
    });

    if (!groqResponse.ok) {
      const errText = await groqResponse.text();
      console.error('[CrimeGPT Proxy] Groq error:', groqResponse.status, errText);
      return res.status(groqResponse.status).json({ error: 'AI provider error' });
    }

    const data = await groqResponse.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return res.status(502).json({ error: 'Empty response from AI provider' });
    }

    return res.status(200).json({ content });
  } catch (err) {
    console.error('[CrimeGPT Proxy] Exception:', err.message);
    return res.status(500).json({ error: 'Internal proxy error' });
  }
}
