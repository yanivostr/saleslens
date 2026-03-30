export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'OpenAI API key not configured' });

  try {
    // קרא את כל ה-body
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);
    const contentType = req.headers['content-type'] || '';

    // חלץ את ה-boundary מה-content-type
    const boundaryMatch = contentType.match(/boundary=(.+)$/);
    if (!boundaryMatch) return res.status(400).json({ error: 'No boundary found' });
    const boundary = boundaryMatch[1];

    // חלץ את קובץ האודיו מה-multipart
    const boundaryBuf = Buffer.from('--' + boundary);
    const parts = [];
    let start = 0;
    while (start < buffer.length) {
      const idx = buffer.indexOf(boundaryBuf, start);
      if (idx === -1) break;
      const end = buffer.indexOf(boundaryBuf, idx + boundaryBuf.length);
      if (end === -1) break;
      const part = buffer.slice(idx + boundaryBuf.length + 2, end - 2);
      parts.push(part);
      start = end;
    }

    // מצא את חלק הקובץ
    let audioBuffer = null;
    let filename = 'audio.mp3';
    let mimeType = 'audio/mpeg';
    for (const part of parts) {
      const headerEnd = part.indexOf('\r\n\r\n');
      if (headerEnd === -1) continue;
      const header = part.slice(0, headerEnd).toString();
      if (header.includes('name="file"')) {
        audioBuffer = part.slice(headerEnd + 4);
        const fnMatch = header.match(/filename="([^"]+)"/);
        if (fnMatch) filename = fnMatch[1];
        const ctMatch = header.match(/Content-Type: (.+)/);
        if (ctMatch) mimeType = ctMatch[1].trim();
        break;
      }
    }

    if (!audioBuffer) return res.status(400).json({ error: 'No audio file found in request' });

    // בנה multipart חדש ל-OpenAI
    const newBoundary = 'boundary' + Date.now();
    const enc = new TextEncoder();
    const CRLF = '\r\n';

    const fields = [
      { name: 'model', value: 'whisper-1' },
      { name: 'language', value: 'he' },
      { name: 'response_format', value: 'text' },
    ];

    const bufs = [];
    for (const f of fields) {
      bufs.push(Buffer.from(`--${newBoundary}${CRLF}Content-Disposition: form-data; name="${f.name}"${CRLF}${CRLF}${f.value}${CRLF}`));
    }
    bufs.push(Buffer.from(`--${newBoundary}${CRLF}Content-Disposition: form-data; name="file"; filename="${filename}"${CRLF}Content-Type: ${mimeType}${CRLF}${CRLF}`));
    bufs.push(audioBuffer);
    bufs.push(Buffer.from(`${CRLF}--${newBoundary}--${CRLF}`));

    const body = Buffer.concat(bufs);

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': `multipart/form-data; boundary=${newBoundary}`,
      },
      body,
    });

    const text = await response.text();
    if (!response.ok) return res.status(response.status).json({ error: text });
    res.status(200).send(text);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export const config = { api: { bodyParser: false } };
