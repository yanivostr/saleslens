import formidable from "formidable";
import FormData from "form-data";
import fetch from "node-fetch";

export const config = {
  api: { bodyParser: false } // חשוב! אנחנו קוראים את הקובץ ידנית
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "OpenAI API key not configured" });
  }

  try {
    // שימוש ב-formidable כדי לקרוא קובץ מכל דפדפן, כולל נייד
    const form = new formidable.IncomingForm();
    form.keepExtensions = true;

    const data = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    const file = data.files.file;
    if (!file) return res.status(400).json({ error: "No file uploaded" });

    // קורא את הקובץ כ-buffer
    const buffer = await fs.promises.readFile(file.filepath || file.path);

    // מוכן לשליחה ל-OpenAI
    const formData = new FormData();
    formData.append("file", buffer, { filename: file.originalFilename || "audio.mp3" });
    formData.append("model", "gpt-4o-transcribe");

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        ...formData.getHeaders(),
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    const text = await response.text();
    if (!response.ok) return res.status(response.status).json({ error: text });

    res.status(200).send(text);

  } catch (err) {
    console.error("❌ Handler error:", err);
    res.status(500).json({ error: err.message });
  }
}
