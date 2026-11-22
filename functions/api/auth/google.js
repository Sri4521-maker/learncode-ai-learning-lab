import { verifyGoogleIdentityToken } from '../../_shared/google-auth.js';

export async function onRequestPost(context) {
  let body;
  try { body = await context.request.json(); } catch { body = {}; }
  if (context.env.LOCAL_PREVIEW === 'true' && body.preview === true) return new Response(JSON.stringify({ success: true, profile: { sub: 'local-preview-student', email: 'demo@example.invalid', name: 'Demo Learner', email_verified: true, preview: true }, access_token: 'local-preview' }), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
  if (context.env.LOCAL_PREVIEW === 'true' && body.credential === 'local-preview') return new Response(JSON.stringify({ success: true, profile: { sub: 'local-preview-student', email: 'demo@example.invalid', name: 'Demo Learner', email_verified: true, preview: true }, access_token: 'local-preview' }), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
  const profile = await verifyGoogleIdentityToken(body.credential, context.env.GOOGLE_CLIENT_ID);
  if (!profile) return new Response(JSON.stringify({ success: false, message: 'Google sign-in could not be verified. Check the Google OAuth client configuration and try again.' }), { status: 401, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
  return new Response(JSON.stringify({ success: true, profile }), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
}
