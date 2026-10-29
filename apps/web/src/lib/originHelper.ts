import { NextRequest } from 'next/server';

export function getSafeOrigin(req: NextRequest): string {
  const forwardedHost = req.headers.get('x-forwarded-host');
  const forwardedProto = req.headers.get('x-forwarded-proto');
  const hostHeader = req.headers.get('host');
  
  let host = (forwardedHost || hostHeader || '').trim();
  
  // Clean unroutable 0.0.0.0 addresses
  if (!host || host.includes('0.0.0.0')) {
    host = host ? host.replace(/0\.0\.0\.0/g, 'localhost') : 'localhost:3000';
  }

  // Resolve protocol
  let proto = forwardedProto || (req.url.startsWith('https') ? 'https' : 'http');
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    if (!forwardedProto) {
      proto = 'http';
    }
  }

  return `${proto}://${host}`;
}
