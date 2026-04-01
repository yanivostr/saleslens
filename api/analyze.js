export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Anthropic API key not configured' });
  try {
    const { transcript } = req.body;
    if (!transcript) return res.status(400).json({ error: 'Missing transcript' });

    const prompt = `אתה סוכן ביטוח ותיק עם 20 שנה ניסיון שעכשיו מנחה נציגים צעירים. אתה מנתח שיחות מהנקודת מבט של מי שעשה את העבודה הזו בעצמו – לא מהצד, לא מנקודת מבט של לקוח, ולא מנקודת מבט מוסרית.

שלב ראשון – זהה את סוג השיחה:
- עדכון/הודעה (מחיר עלה, שינוי בפוליסה, חידוש): המטרה היא לעבור את השיחה חלק, לא ליצור עימות, ולשמור את הלקוח. זה לא שיחת שדרוג. לא מצפים ש"יברר צרכים" – זה לא רלוונטי כאן.
- מכירה ראשונה: המטרה לסגור. כאן כן רוצים שיבנה rapport ויזהה מה חשוב ללקוח.
- שדרוג/הרחבה: המטרה לסגור תוספת. כאן כן רצוי לנסות להוסיף.
- שימור/ביטול: המטרה לשמור את הלקוח בכל מחיר.
- גביה/חוב: המטרה לקבל תשלום.

כללים ברורים לפני שאתה מנתח:
1. אם זו שיחת עדכון – אל תצפה לזיהוי צרכים, upsell, בדיקת שביעות רצון. זה לא חלק מהמשימה. ציין רק אם הנציג הצליח לעבור את השיחה חלק ולשמור את הלקוח.
2. אי-חשיפת עלות ישירה = טקטיקה לגיטימית. לספר על השינוי, לעגן יתרונות קודם, ואז להגיד את הסכום – זה מקצועי. אל תסמן את זה כבעיה.
3. לחץ עדין, יצירת דחיפות, framing חיובי = כלים מקצועיים. לא עבירות.
4. אם הלקוח הסכים בסוף – זו הצלחה, גם אם הדרך הייתה "מכירתית".
5. risk_flags = רק אם משהו עלול לגרום לתלונה אמיתית, ביטול, או עימות עתידי עם הלקוח. לא "זה לא מוסרי".

שיחה:
"""
${transcript}
"""

החזר JSON בלבד (ללא markdown, ללא backticks):
{
  "call_type": "<עדכון/הודעה / מכירה ראשונה / שדרוג / שימור / גביה / אחר>",
  "call_goal": "<המטרה הספציפית של השיחה>",
  "outcome": "closed" | "lost" | "follow_up" | "unclear",
  "overall_score": <0-100, מבוסס על הצלחת המטרה הספציפית בלבד>,
  "score_label": "<מצוין / טוב / בינוני / חלש>",
  "verdict": "<משפט אחד חד – מה קרה בשיחה הזו>",
  "estimated_duration_minutes": <הערכת אורך בדקות>,
  "phase_scores": [
    {"phase":"<שם השלב הרלוונטי לסוג השיחה>","score":<0-10>,"what_happened":"<מה קרה בפועל>","verdict":"הצלחה"|"חמצון"|"כשל"}
  ],
  "highlights": [
    {"type":"peak"|"drop"|"objection"|"critical_error"|"missed_close"|"successful_close"|"interest_spike"|"lost_interest"|"turning_point","label":"<שם קצר>","quote":"<ציטוט מהשיחה>","impact":"positive"|"negative","explanation":"<למה זה משמעותי מבחינת הצלחת המשימה>","what_to_say_instead":"<ניסוח יעיל יותר, או למה זה עבד>"}
  ],
  "point_of_no_return": {"exists":true|false,"quote":"<ציטוט>","explanation":"<למה זו הנקודה>","recovery_script":"<מה היה אפשר להגיד>"},
  "critical_missed_moments": [
    {"moment":"<מה קרה>","what_was_said":"<מה הנציג אמר>","what_should_have_been_said":"<ניסוח יעיל יותר>"}
  ],
  "strengths": ["<חוזקה שסייעה להצלחת המשימה>"],
  "weaknesses": ["<חולשה שפגעה בהצלחת המשימה>"],
  "risk_flags": ["<בעיה עתידית ממשית בלבד – ביטול, תלונה, עימות>"],
  "coaching_summary": "<3-4 משפטים ישירים לנציג, מנקודת מבט של מנחה מנוסה שעשה את העבודה הזו בעצמו>"
}
ציטוטים מגיעים מהשיחה בלבד. אל תמציא.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 4000, messages: [{ role: 'user', content: prompt }] })
    });
    if (!response.ok) { const e = await response.json().catch(() => ({})); return res.status(response.status).json({ error: e?.error?.message || 'Claude error' }); }
    const data = await response.json();
    const text = data.content.map(b => b.text || '').join('');
    res.status(200).json(JSON.parse(text.replace(/```json|```/g, '').trim()));
  } catch (err) { res.status(500).json({ error: err.message }); }
}
