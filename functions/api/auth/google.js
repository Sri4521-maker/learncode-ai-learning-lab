import { verifyGoogleIdentityToken } from '../../_shared/google-auth.js';

export async function onRequestPost(context) {
  let body;
  try { body = await context.request.json(); } catch { body = {}; }
  const profile = await verifyGoogleIdentityToken(body.credential, context.env.GOOGLE_CLIENT_ID);
  if (!profile) return new Response(JSON.stringify({ success: false, message: 'Google sign-in could not be verified. Check the Google OAuth client configuration and try again.' }), { status: 401, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
  return new Response(JSON.stringify({ success: true, profile }), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
}
