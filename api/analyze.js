export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Anthropic API key not configured' });
  try {
    const { transcript } = req.body;
    if (!transcript) return res.status(400).json({ error: 'Missing transcript' });

    const prompt = `אתה מאמן מכירות ותיק שעבד שנים בשטח. אתה חושב כמו נציג מכירות מנוסה, לא כמו שופט. המטרה: לעזור למנהל לדעת מי הנציג הכי אפקטיבי בצוות.

כללי ברזל:

1. טקטיקות מכירה = כלים מקצועיים, לא עבירות:
   - אי-חשיפת מחיר מוקדם = שמירת מומנטום, לגיטימי לחלוטין
   - הוספת כיסויים/שדרוגים מבלי להדגיש מחיר מפורשות = upsell רגיל
   - מהירות דיבור, יצירת דחיפות, framing חיובי = שיטות עבודה סטנדרטיות
   - אלה לא ייסומנו כשגיאות בשום אופן – אם עברו חלק, זו הצלחה

2. מה מעניין אותנו:
   - האם הנציג שמר על הלקוח ב-flow והגיע לסגירה?
   - האם טיפל בהתנגדויות ביעילות?
   - האם שלט בקצב השיחה?
   - רגעים שגרמו ללקוח לעצור, לשאול שאלות קשות, או לאבד עניין

3. risk_flags – רק אם עלול לגרום לתלונה/ביטול עתידי:
   - לקוח שאל ישירות ונציג התחמק בצורה שתגרום לעימות עתידי
   - לקוח נשמע מבולבל/לחוץ בסוף – עלול לתת ביטול
   - נציג הבטיח משהו שלא ברור שיתקיים
   - טקטיקה שעברה חלק – לא flag

4. ציון מבוסס על: האם הושגה המטרה? באיזה קלות? כמה הלקוח שיתף פעולה?

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
  "highlights": [{"type":"peak"|"drop"|"objection"|"critical_error"|"missed_close"|"successful_close"|"interest_spike"|"lost_interest"|"turning_point","label":"<שם>","quote":"<ציטוט>","impact":"positive"|"negative","explanation":"<למה חשוב מבחינת אפקטיביות>","what_to_say_instead":"<אלטרנטיבה יעילה יותר>"}],
  "point_of_no_return": {"exists":true|false,"quote":"<ציטוט>","explanation":"<למה זו נקודת האל-חזור>","recovery_script":"<דיאלוג חלופי מדויק>"},
  "critical_missed_moments": [{"moment":"<מה קרה>","what_was_said":"<מה נאמר>","what_should_have_been_said":"<ניסוח יעיל יותר>"}],
  "strengths": ["<חוזקה ספציפית שתרמה לשיחה>"],
  "weaknesses": ["<חולשה שפגעה באפקטיביות>"],
  "risk_flags": ["<בעיה עתידית אפשרית בלבד>"],
  "coaching_summary": "<3-4 משפטים ישירים לנציג: מה עשה טוב, מה לשפר>"
}
ציטוטים חייבים להגיע מהשיחה בלבד.`;

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
