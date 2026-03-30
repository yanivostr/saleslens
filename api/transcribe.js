import { IncomingForm } from 'formidable';
import { readFileSync } from 'fs';
import FormData from 'form-data';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'OpenAI API key not configured' });
  
  const form = new IncomingForm();
  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: err.message });
    try {
      const file = files.file?.[0] || files.file;
      const fileBuffer = readFileSync(file.filepath);
      const fd = new FormData();
      fd.append('file', fileBuffer, { filename: file.originalFilename || 'audio.mp3', contentType: file.mimetype });
      fd.append('model', 'whisper-1');
      fd.append('language', 'he');
      fd.append('response_format', 'text');
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, ...fd.getHeaders() },
        body: fd
      });
      const text = await response.text();
      if (!response.ok) return res.status(response.status).json({ error: text });
      res.status(200).send(text);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });
}

export const config = { api: { bodyParser: false } };
