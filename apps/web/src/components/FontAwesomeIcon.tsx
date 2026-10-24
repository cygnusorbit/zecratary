import React from 'react';

export type FontAwesomeIconName = 
  | 'google' 
  | 'facebook' 
  | 'apple' 
  | 'github' 
  | 'f179' // Apple
  | 'f09a' // Facebook
  | 'f1a0'; // Google

interface FontAwesomeIconProps extends React.SVGProps<SVGSVGElement> {
  name?: FontAwesomeIconName | string;
  unicode?: string;
  size?: number | string;
  className?: string;
  color?: string;
}

// Official Font Awesome 6 Free SVG Vector Definitions
const FA_ICONS: Record<string, { viewBox: string; path: React.ReactNode; unicode: string }> = {
  // Apple Icon (Unicode: f179)
  f179: {
    unicode: 'f179',
    viewBox: '0 0 384 512',
    path: (
      <path
        fill="currentColor"
        d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.3-41.8-84.2-44.8-35.4-2.8-74.4 20.8-88.5 20.8-15 0-50.4-19.8-77.5-19.8-37.4 0-73.4 21.6-94.2 56.6-40.8 70.8-10.6 175.6 28.7 232.8 19.2 27.8 42.1 58.7 72.4 57.6 29.2-1.2 40.5-18.8 75.5-18.8 35.8 0 46.1 18.8 76.2 18.2 31.3-1.1 51.5-28 70.7-56.1 22.3-32.4 31.4-63.9 31.9-65.5-.7-.4-61.9-23.8-62.3-91.8zM245.5 106.1c15.8-19.2 26.6-45.9 23.7-72.6-23.2 1-50.6 15.5-66.7 34.7-14.2 16.5-26.6 43.6-23.2 69.8 25.8 2 51.4-13.4 66.2-31.9z"
      />
    )
  },
  apple: {
    unicode: 'f179',
    viewBox: '0 0 384 512',
    path: (
      <path
        fill="currentColor"
        d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.3-41.8-84.2-44.8-35.4-2.8-74.4 20.8-88.5 20.8-15 0-50.4-19.8-77.5-19.8-37.4 0-73.4 21.6-94.2 56.6-40.8 70.8-10.6 175.6 28.7 232.8 19.2 27.8 42.1 58.7 72.4 57.6 29.2-1.2 40.5-18.8 75.5-18.8 35.8 0 46.1 18.8 76.2 18.2 31.3-1.1 51.5-28 70.7-56.1 22.3-32.4 31.4-63.9 31.9-65.5-.7-.4-61.9-23.8-62.3-91.8zM245.5 106.1c15.8-19.2 26.6-45.9 23.7-72.6-23.2 1-50.6 15.5-66.7 34.7-14.2 16.5-26.6 43.6-23.2 69.8 25.8 2 51.4-13.4 66.2-31.9z"
      />
    )
  },

  // Facebook Icon (Unicode: f09a - fa-facebook-f)
  f09a: {
    unicode: 'f09a',
    viewBox: '0 0 320 512',
    path: (
      <path
        fill="currentColor"
        d="M279.14 288l14.22-92.66h-88.91v-60.13c0-25.35 12.42-50.06 52.24-50.06h40.42V6.26S260.43 0 225.36 0c-73.22 0-121.08 44.38-121.08 124.72v70.62H22.89V288h81.39v224h100.17V288z"
      />
    )
  },
  facebook: {
    unicode: 'f09a',
    viewBox: '0 0 320 512',
    path: (
      <path
        fill="currentColor"
        d="M279.14 288l14.22-92.66h-88.91v-60.13c0-25.35 12.42-50.06 52.24-50.06h40.42V6.26S260.43 0 225.36 0c-73.22 0-121.08 44.38-121.08 124.72v70.62H22.89V288h81.39v224h100.17V288z"
      />
    )
  },

  // Google Icon (Unicode: f1a0 - fa-google)
  f1a0: {
    unicode: 'f1a0',
    viewBox: '0 0 488 512',
    path: (
      <path
        fill="currentColor"
        d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
      />
    )
  },
  google: {
    unicode: 'f1a0',
    viewBox: '0 0 488 512',
    path: (
      <path
        fill="currentColor"
        d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
      />
    )
  }
};

export default function FontAwesomeIcon({
  name,
  unicode,
  size = 16,
  className = '',
  color,
  style,
  ...props
}: FontAwesomeIconProps) {
  const lookupKey = String(unicode || name || '').toLowerCase().trim();
  const iconDef = FA_ICONS[lookupKey];

  if (!iconDef) {
    return null;
  }

  const dimension = typeof size === 'number' ? `${size}px` : size;

  return (
    <svg
      viewBox={iconDef.viewBox}
      width={dimension}
      height={dimension}
      className={`inline-block shrink-0 fill-current align-middle ${className}`}
      style={{
        width: dimension,
        height: dimension,
        color: color || undefined,
        transition: 'color 200ms cubic-bezier(0.4, 0, 0.2, 1)',
        ...style
      }}
      aria-hidden="true"
      {...props}
    >
      {iconDef.path}
    </svg>
  );
}
