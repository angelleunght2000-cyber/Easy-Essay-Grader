import type { VercelRequest, VercelResponse } from '@vercel/node';

// Add CORS headers
function setCorsHeaders(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Set CORS headers
    setCorsHeaders(res);
    
    // Handle OPTIONS request (preflight)
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
      console.error('Method not allowed:', req.method);
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const apiKey = process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY;
    const baseUrl = process.env.DASHSCOPE_BASE_URL || 'https://dashscope-intl.aliyuncs.com';
    
    console.log('=== Environment Check ===');
    console.log('API Key present:', !!apiKey);
    console.log('API Key length:', apiKey?.length);
    console.log('API Key starts with sk-:', apiKey?.startsWith('sk-'));
    console.log('Base URL:', baseUrl);
    console.log('========================');

    if (!apiKey) {
      console.error('API key not configured in environment variables');
      return res.status(500).json({ error: 'API key not configured' });
    }

    // Get the endpoint path from query parameter
    const { endpoint } = req.query;
    
    if (!endpoint || typeof endpoint !== 'string') {
      console.error('Endpoint parameter missing or invalid');
      return res.status(400).json({ error: 'Endpoint parameter is required' });
    }
    
    // Construct the full DashScope API URL
    const apiUrl = `${baseUrl}${endpoint}`;
    console.log('Using base URL:', baseUrl);
    console.log('Forwarding request to:', apiUrl);
    console.log('Request body:', JSON.stringify(req.body).substring(0, 200));

    // Forward the request to DashScope
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'X-DashScope-SSE': 'disable',
      },
      body: JSON.stringify(req.body),
    });

    console.log('DashScope response status:', response.status);
    const data = await response.json();

    if (!response.ok) {
      console.error('DashScope API error:', response.status, JSON.stringify(data));
      return res.status(response.status).json(data);
    }

    console.log('Success! Returning data');
    return res.status(200).json(data);
  } catch (error: any) {
    console.error('Qwen API Error:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

