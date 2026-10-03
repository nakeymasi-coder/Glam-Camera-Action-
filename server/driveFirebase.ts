import { verify } from 'node:crypto';

const CERT_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
interface Claims { sub: string; aud: string; iss: string; exp: number; iat: number; auth_time: number; }
export function verifyFirebaseClaims(token: string, projectId: string, certificates: Record<string, string>, now = Date.now()): string {
  if (token.length > 12_000) throw Error('Invalid identity token.');
  const pieces = token.split('.');
  if (pieces.length !== 3 || pieces.some(piece => !/^[A-Za-z0-9_-]+$/.test(piece))) throw Error('Invalid identity token.');
  const header = JSON.parse(Buffer.from(pieces[0], 'base64url').toString('utf8'));
  const claim = JSON.parse(Buffer.from(pieces[1], 'base64url').toString('utf8')) as Claims;
  const seconds = Math.floor(now / 1000);
  if (header.alg !== 'RS256' || typeof header.kid !== 'string' || !Object.hasOwn(certificates, header.kid) || typeof claim.sub !== 'string' || !claim.sub || claim.sub.length > 128 || claim.aud !== projectId || claim.iss !== `https://securetoken.google.com/${projectId}` || !Number.isFinite(claim.exp) || claim.exp <= seconds || !Number.isFinite(claim.iat) || claim.iat > seconds || !Number.isFinite(claim.auth_time) || claim.auth_time > seconds || claim.auth_time <= 0 || !verify('RSA-SHA256', Buffer.from(`${pieces[0]}.${pieces[1]}`), certificates[header.kid], Buffer.from(pieces[2], 'base64url'))) throw Error('Invalid identity token.');
  return claim.sub;
}
export function createFirebaseVerifier(projectId: string, fetcher: typeof fetch = fetch) {
  let expires = 0;
  let certificates: Record<string, string> = {};
  let refreshing: Promise<void> | undefined;
  return async (authorization: string | undefined) => {
    if (!authorization?.startsWith('Bearer ')) throw Error('Sign in to connect your private Drive.');
    if (Date.now() >= expires) {
      if (!refreshing) refreshing = (async () => {
        const response = await fetcher(CERT_URL, { signal: AbortSignal.timeout(10_000), redirect: 'error' });
        if (!response.ok) throw Error('Identity verification unavailable.');
        const body = await response.json();
        if (!body || typeof body !== 'object' || Object.values(body).some(value => typeof value !== 'string')) throw Error('Identity verification unavailable.');
        certificates = body;
        expires = Date.now() + Math.min(3600, Number(response.headers.get('cache-control')?.match(/max-age=(\d+)/)?.[1] || 300)) * 1000;
      })().finally(() => { refreshing = undefined; });
      await refreshing;
    }
    return verifyFirebaseClaims(authorization.slice(7), projectId, certificates);
  };
}
