const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function allowed(url: URL) {
  return url.hostname === 'maps.app.goo.gl'
    || url.hostname === 'google.com'
    || url.hostname.endsWith('.google.com');
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
    if (request.method !== 'GET') return Response.json({ error: 'Method not allowed' }, { status: 405, headers: corsHeaders });
    const input = new URL(request.url).searchParams.get('url');
    if (!input) return Response.json({ error: 'Missing url' }, { status: 400, headers: corsHeaders });
    let current: URL;
    try { current = new URL(input); } catch { return Response.json({ error: 'Invalid url' }, { status: 400, headers: corsHeaders }); }
    if (current.hostname !== 'maps.app.goo.gl') return Response.json({ error: 'Only Google Maps short links are allowed' }, { status: 400, headers: corsHeaders });

    for (let redirect = 0; redirect < 6; redirect += 1) {
      if (!allowed(current)) return Response.json({ error: 'Unexpected redirect host' }, { status: 400, headers: corsHeaders });
      const response = await fetch(current.toString(), { redirect: 'manual', headers: { 'User-Agent': 'Songsong Maps Resolver' } });
      if (response.status < 300 || response.status >= 400) return Response.json({ url: current.toString() }, { headers: corsHeaders });
      const location = response.headers.get('location');
      if (!location) return Response.json({ url: current.toString() }, { headers: corsHeaders });
      current = new URL(location, current);
    }
    return Response.json({ error: 'Too many redirects' }, { status: 508, headers: corsHeaders });
  },
};
