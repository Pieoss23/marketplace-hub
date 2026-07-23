export function buildApiOriginPermission(apiBaseUrl: string): string {
  let url: URL;
  try {
    url = new URL(apiBaseUrl.trim());
  } catch {
    throw new Error("L'URL API non è valido.");
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error("L'URL API deve usare HTTP o HTTPS.");
  }
  if (url.username || url.password) {
    throw new Error("L'URL API non deve contenere credenziali.");
  }

  return `${url.origin}/*`;
}
