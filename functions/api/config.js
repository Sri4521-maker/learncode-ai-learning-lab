export async function onRequestGet(context) {
  return new Response(JSON.stringify({ google_client_id: context.env.GOOGLE_CLIENT_ID || '' }), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
}
