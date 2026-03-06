import { env } from "@best-lap/env";

export function setUpQuery(url: string): string {
  const api = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
  const fullUrl = url.startsWith('http') ? url : `https://${url}`;
  const targetUrl = encodeURIComponent(fullUrl);
  const key = env.GOOGLE_API_KEY;

  const strategy = 'mobile';
  const categories = ['performance', 'seo']
    .map(c => `category=${c}`)
    .join('&');


  const query = `${api}?url=${targetUrl}&key=${key}&${categories}&strategy=${strategy}`;

  return query;
}
