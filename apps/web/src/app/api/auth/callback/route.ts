import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state'); 
  const provider = state || 'google'; // Standardize provider from state param

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=missing_oauth_code', request.url));
  }

  try {
    /* 
      ===================================================================
      PRODUCTION OAUTH HANDSHAKE (Scaffolded)
      ===================================================================
      In a production environment, exchange the 'code' for an access_token here:
      
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          redirect_uri: 'http://localhost:3000/api/auth/callback',
          grant_type: 'authorization_code',
        })
      });
      const tokenData = await tokenRes.json();
      
      const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });
      const userData = await userRes.json();
      ===================================================================
    */

    // Simulated Extraction for Client-Side Sync
    const mockEmail = `user.${provider}@example.com`;
    const mockName = `${provider.charAt(0).toUpperCase() + provider.slice(1)} User`;

    // Securely redirect back to the client login flow with the extracted profile
    const redirectUrl = new URL(`/login?social_success=true&provider=${provider}&email=${encodeURIComponent(mockEmail)}&name=${encodeURIComponent(mockName)}`, request.url);
    return NextResponse.redirect(redirectUrl);

  } catch (error) {
    return NextResponse.redirect(new URL('/login?error=oauth_exchange_failed', request.url));
  }
}

export async function POST(request: Request) {
  // Apple OAuth often utilizes POST form-urlencoded responses
  try {
    const formData = await request.formData();
    const code = formData.get('code');
    const id_token = formData.get('id_token'); // Apple JWT containing user profile

    if (!code) {
       return NextResponse.redirect(new URL('/login?error=missing_apple_code', request.url));
    }

    /*
      PRODUCTION APPLE JWT DECODE (Scaffolded)
      const decodedToken = jwt.decode(id_token);
      const email = decodedToken.email;
    */

    const redirectUrl = new URL(`/login?social_success=true&provider=apple&email=user.apple@privaterelay.appleid.com&name=Apple%20User`, request.url);
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    return NextResponse.redirect(new URL('/login?error=apple_oauth_failed', request.url));
  }
}
