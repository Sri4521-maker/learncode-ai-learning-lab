export async function verifyGoogleIdentityToken(token, clientId) {
  if (!token || !clientId) return null;
  try {
    const endpoint = new URL('https://oauth2.googleapis.com/tokeninfo');
    endpoint.searchParams.set('id_token', token);
    const response = await fetch(endpoint);
    if (!response.ok) return null;
    const claims = await response.json();
    const expiresAt = Number(claims.exp);
    if (claims.aud !== clientId || !['accounts.google.com', 'https://accounts.google.com'].includes(claims.iss) || !claims.sub || ![true, 'true'].includes(claims.email_verified) || expiresAt <= Math.floor(Date.now() / 1000)) return null;
    return { sub: claims.sub, email: claims.email, name: claims.name || claims.given_name || 'Student', email_verified: true };
  } catch {
    return null;
  }
}

export async function requireGoogleIdentity(request, env) {
  const header = request.headers.get('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  return verifyGoogleIdentityToken(token, env.GOOGLE_CLIENT_ID);
}
