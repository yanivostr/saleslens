export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Anthropic API key not configured' });
  }

  try {
    const { transcript } = req.body;
    if (!transcript) {
      return res.status(400).json({ error: 'Missing transcript' });
    }

    const shortTranscript = transcript.slice(0, 12000);
    console.log("Transcript length:", shortTranscript.length);

    const prompt = `אתה מאמן מכירות מנוסה עם 20 שנה ניסיון...

שיחה:
"""
${shortTranscript}
"""

החזר JSON בלבד (ללא markdown)...`;

    // 🔥 timeout ארוך יותר
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    console.log("Sending request to Claude...");

    let response;

    try {
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1500,
          messages: [{ role: 'user', content: prompt }]
        }),
        signal: controller.signal
      });
    } catch (err) {
      clearTimeout(timeout);

      if (err.name === 'AbortError') {
        console.error("Request timed out");
        return res.status(504).json({ error: 'Request timeout (Claude took too long)' });
      }

      console.error("Fetch failed:", err);
      return res.status(500).json({ error: 'Fetch failed', details: err.message });
    }

    clearTimeout(timeout);

    if (!response.ok) {
      const e = await response.json().catch(() => ({}));
      console.error("Claude API error:", e);
      return res.status(response.status).json({
        error: e?.error?.message || 'Claude error'
      });
    }

    console.log("Claude response received");

    const data = await response.json();

    // 🔥 בדיקה אם יש תוכן בכלל
    if (!data.content || !Array.isArray(data.content)) {
      console.error("Invalid Claude response structure:", data);
      return res.status(500).json({
        error: "Invalid response structure from Claude",
        raw: data
      });
    }

    const text = data.content.map(b => b.text || '').join('');
    const cleanText = text.replace(/```json|```/g, '').trim();

    console.log("Raw AI response:", cleanText);

    let parsed;
    try {
      parsed = JSON.parse(cleanText);
    } catch (e) {
      console.error("JSON parse failed:", cleanText);
      return res.status(500).json({
        error: "Invalid AI JSON",
        raw: cleanText
      });
    }

    return res.status(200).json(parsed);

  } catch (err) {
    console.error("SERVER ERROR:", err);

    return res.status(500).json({
      error: err.message || "Server error"
    });
  }
}
