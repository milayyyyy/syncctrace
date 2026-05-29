/** True when the URL contains OAuth callback params (PKCE code or implicit hash tokens). */
export function isOAuthReturn(): boolean {
  const hash = globalThis.location.hash;
  const search = globalThis.location.search;
  return (
    hash.includes('access_token')
    || hash.includes('error')
    || search.includes('code=')
    || search.includes('error=')
  );
}

/** Remove OAuth params from the address bar after callback handling. */
export function cleanOAuthUrl(pathname: string): void {
  globalThis.history.replaceState(null, '', pathname);
}
