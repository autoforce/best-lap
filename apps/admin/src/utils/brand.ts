// Best Lap mark (same as apps/web/public/favicon.svg), inlined so no static route is needed
const LOGO_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">' +
  '<rect width="32" height="32" rx="8" fill="#2563EB"/>' +
  '<path d="M9.64 22.86A9 9 0 1 1 22.36 22.86" fill="none" stroke="#FFFFFF" stroke-opacity=".32" stroke-width="3" stroke-linecap="round"/>' +
  '<path d="M9.64 22.86A9 9 0 1 1 24.46 13.42" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/>' +
  '<path d="M16 16.5 21.17 14.62" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round"/>' +
  '<circle cx="16" cy="16.5" r="2.1" fill="#FFFFFF"/>' +
  '</svg>';

export const LOGO_DATA_URI = `data:image/svg+xml;base64,${Buffer.from(LOGO_SVG).toString('base64')}`;
