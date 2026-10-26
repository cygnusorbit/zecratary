import React from 'react';

/**
 * Pixel-precise 3x3 Grid Icon (9 cells)
 * Outer frame: 18x18, Dividers at 9 and 15
 */
export const IconGrid3x3: React.FC<{ className?: string }> = ({ className = "h-4 w-4" }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
    aria-hidden="true"
  >
    <rect width="18" height="18" x="3" y="3" rx="2" />
    <path d="M3 9h18" />
    <path d="M3 15h18" />
    <path d="M9 3v18" />
    <path d="M15 3v18" />
  </svg>
);

/**
 * Pixel-precise 4x4 Grid Icon (16 cells)
 * Outer frame: 18x18, Dividers at 7.5, 12, and 16.5
 */
export const IconGrid4x4: React.FC<{ className?: string }> = ({ className = "h-4 w-4" }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="1.75" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
    aria-hidden="true"
  >
    <rect width="18" height="18" x="3" y="3" rx="2" />
    <path d="M3 7.5h18" />
    <path d="M3 12h18" />
    <path d="M3 16.5h18" />
    <path d="M7.5 3v18" />
    <path d="M12 3v18" />
    <path d="M16.5 3v18" />
  </svg>
);

/**
 * Pixel-precise 5x5 Grid Icon (25 cells)
 * Outer frame: 18x18, Dividers at 6.6, 10.2, 13.8, and 17.4
 */
export const IconGrid5x5: React.FC<{ className?: string }> = ({ className = "h-4 w-4" }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="1.5" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
    aria-hidden="true"
  >
    <rect width="18" height="18" x="3" y="3" rx="2" />
    <path d="M3 6.6h18" />
    <path d="M3 10.2h18" />
    <path d="M3 13.8h18" />
    <path d="M3 17.4h18" />
    <path d="M6.6 3v18" />
    <path d="M10.2 3v18" />
    <path d="M13.8 3v18" />
    <path d="M17.4 3v18" />
  </svg>
);
