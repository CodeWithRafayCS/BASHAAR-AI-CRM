let baseUrl: string | null = null;

export function setBaseUrl(url: string | null): void {
  baseUrl = url ? url.replace(/\/+$/, '') : null;
}

export function getBaseUrl(): string | null {
  return baseUrl;
}
