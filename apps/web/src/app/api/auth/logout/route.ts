import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: 'Logged out successfully'
  });

  const cookieKeys = [
    'zecratary_session',
    'zecratary_current_user',
    'zecratary_auth_session',
    'currentUser',
    'user',
    'token'
  ];

  cookieKeys.forEach(k => {
    response.cookies.set({
      name: k,
      value: '',
      path: '/',
      maxAge: 0,
      expires: new Date(0),
      sameSite: 'lax'
    });
  });

  return response;
}

export async function GET() {
  return POST();
}
