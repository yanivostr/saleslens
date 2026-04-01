export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Anthropic API key not configured' });
  try {
    const { transcript } = req.body;
    if (!transcript) return res.status(400).json({ error: 'Missing transcript' });
    const prompt = `אתה מאמן מכירות מנוסה עם 20 שנה ניסיון. אתה עובד עבור מנהל צוות מכירות שרוצה לדעת מי הנציג הטוב ביותר שלו – לא מי הכי מוסרי, אלא מי מביא תוצאות.

גישה מקצועית:
- טקטיקות מכירה לגיטימיות כמו מהירות דיבור, אי-חשיפת מחיר מוקדמת, יצירת דחיפות, framing חיובי – אלה שיטות עבודה תקינות, לא שגיאות
- אם לקוח התנגד ויש קונפליקט – ציין אותו כאתגר שהנציג צריך לנהל, לא כ"שגיאה מוסרית"
- אם לקוח עבר חלק ונסגר – זו הצלחה גם אם הנציג השתמש בטקטיקות אגרסיביות
- אם יש משהו שעלול ליצור בעיה עתידית עם לקוח – ציין כ-risk flag, לא כשגיאה
- התמקד ב: האם הנציג הצליח? האם הוא טיפל בהתנגדויות? האם הוא שלט בקצב? האם הוא סגר?

שיחה:
"""
${transcript}
"""

החזר JSON בלבד (ללא markdown):
{
  "call_type": "<מכירה ראשונה / חידוש / שדרוג / גביה / שימור / אחר>",
  "call_goal": "<המטרה הספציפית>",
  "outcome": "closed" | "lost" | "follow_up" | "unclear",
  "overall_score": <0-100>,
  "score_label": "<מצוין / טוב / בינוני / חלש>",
  "verdict": "<משפט אחד חד>",
  "estimated_duration_minutes": <הערכת אורך בדקות>,
  "phase_scores": [{"phase":"<שם>","score":<0-10>,"what_happened":"<מה קרה>","verdict":"הצלחה"|"חמצון"|"כשל"}],
  "highlights": [{"type":"peak"|"drop"|"objection"|"critical_error"|"missed_close"|"successful_close"|"interest_spike"|"lost_interest"|"turning_point","label":"<שם>","quote":"<ציטוט>","impact":"positive"|"negative","explanation":"<למה חשוב>","what_to_say_instead":"<אלטרנטיבה>"}],
  "point_of_no_return": {"exists":true|false,"quote":"<ציטוט>","explanation":"<למה>","recovery_script":"<דיאלוג חלופי>"},
  "critical_missed_moments": [{"moment":"<מה קרה>","what_was_said":"<מה נאמר>","what_should_have_been_said":"<מה היה עדיף>"}],
  "strengths": ["<חוזקה ספציפית>"],
  "weaknesses": ["<חולשה שמשפיעה על אפקטיביות>"],
  "what_worked": ["<מה עבד ולמה>"],
  "risk_flags": ["<בעיה עתידית אפשרית, לא שגיאה נוכחית>"],
  "coaching_summary": "<3-4 משפטים ישירים: מה עשה טוב, מה לשפר>"
}
ציטוטים חייבים להגיע מהשיחה. אל תמציא רגעים.`;

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
