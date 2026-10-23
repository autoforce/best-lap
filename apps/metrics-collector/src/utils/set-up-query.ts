import { env } from "@best-lap/env";

const PSI_ENDPOINT = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

export function setUpQuery(url: string): string {
  const fullUrl = url.startsWith('http') ? url : `https://${url}`;

  // PSI ignores the `locale` parameter (results always come in en-US); the dashboard translates audit titles
  const params = new URLSearchParams({
    url: fullUrl,
    strategy: 'mobile',
  });
  if (env.GOOGLE_API_KEY) params.set('key', env.GOOGLE_API_KEY);
  params.append('category', 'performance');
  params.append('category', 'seo');

  return `${PSI_ENDPOINT}?${params.toString()}`;
}
