// The redesign preview lives in its own Vercel project (sam-newell-v2) under /v2. vercel.json rewrites reach
// it for files, but page URLs are caught by this site's own routes first, so this route proxies /v2/* there.
import type { APIRoute } from 'astro';

export const prerender = false;

const ORIGIN = 'https://sam-newell-v2.vercel.app';
const DROP = new Set(['content-encoding', 'content-length', 'transfer-encoding', 'connection']);

export const ALL: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const init: RequestInit = { method: request.method, headers: { accept: request.headers.get('accept') ?? '*/*' }, redirect: 'manual' };
  const ct = request.headers.get('content-type');
  if (ct) (init.headers as Record<string, string>)['content-type'] = ct;
  if (request.method !== 'GET' && request.method !== 'HEAD') init.body = await request.arrayBuffer();
  const res = await fetch(ORIGIN + url.pathname + url.search, init);
  const headers = new Headers();
  res.headers.forEach((v, k) => { if (!DROP.has(k)) headers.set(k, v); });
  return new Response(res.body, { status: res.status, headers });
};
