// 님비레일 동기화 릴레이 (Cloudflare Worker + KV)
// 계정 데이터를 짧은 코드(6자)로 저장/조회한다.
// 필요: KV 네임스페이스 하나를 만들어 변수명 SYNC 로 바인딩.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 혼동 문자(0,O,1,I) 제외
function genCode(n){ let s=''; for(let i=0;i<n;i++) s+=ALPHABET[Math.floor(Math.random()*ALPHABET.length)]; return s; }
function json(obj, status){ return new Response(JSON.stringify(obj), { status, headers: { ...CORS, 'Content-Type':'application/json' } }); }

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const url = new URL(request.url);
    const code = url.pathname.replace(/^\/+|\/+$/g, '').trim();
    try {
      if (request.method === 'POST') {
        const body = await request.text();
        if (!body || body.length > 300000) return json({ error: 'invalid size' }, 413);
        let key;
        for (let i = 0; i < 8; i++) { key = genCode(6); if (!(await env.SYNC.get(key))) break; }
        // 180일 후 자동 만료
        await env.SYNC.put(key, body, { expirationTtl: 60 * 60 * 24 * 180 });
        return json({ code: key }, 200);
      }
      if (request.method === 'GET' && code && code !== 'favicon.ico') {
        const v = await env.SYNC.get(code);
        if (!v) return json({ error: 'not found' }, 404);
        return new Response(v, { headers: { ...CORS, 'Content-Type': 'application/json' } });
      }
    } catch (e) {
      return json({ error: String(e) }, 500);
    }
    return json({ ok: true, service: 'nimbi-sync' }, 200);
  }
};
