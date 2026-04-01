export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No auth token' });

  const token = authHeader.replace('Bearer ', '');
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;

  // Get user
  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { 'Authorization': `Bearer ${token}`, 'apikey': serviceKey }
  });
  if (!userRes.ok) return res.status(401).json({ error: 'Invalid token' });
  const { id: userId } = await userRes.json();

  // Get analysis id from URL
  const id = req.url.split('/api/analysis/')[1]?.split('?')[0];
  if (!id) return res.status(400).json({ error: 'Missing id' });

  const dataRes = await fetch(
    `${supabaseUrl}/rest/v1/analyses?id=eq.${id}&user_id=eq.${userId}&select=*`,
    {
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey
      }
    }
  );

  const data = await dataRes.json();
  if (!data?.length) return res.status(404).json({ error: 'Not found' });
  res.status(200).json(data[0]);
}
