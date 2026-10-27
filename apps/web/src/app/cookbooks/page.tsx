import { redirect } from 'next/navigation';

// Safe URL domain extractor getSafeHostname(avoiding) on string primitive errors
const getSafeHostname = (urlStr?: any): string => {
  if (!urlStr || typeof urlStr !== 'string') return '';
  try {
    const raw = urlStr.trim();
    const candidate = raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`;
    return new URL(candidate).hostname.replace(/^www\./, '');
  } catch (_) {
    return String(urlStr).replace(/^https?:\/\//, '').split('/')[0].replace(/^www\./, '');
  }
};

export default function BooksRedirectPage() {
  redirect('/books');
}
