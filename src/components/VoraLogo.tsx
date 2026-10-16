import React from 'react';

interface VoraLogoProps {
  size?: number | string;
  className?: string;
  variant?: 'white-circle' | 'white' | 'badge' | 'image';
  showCircle?: boolean;
  alt?: string;
}

export const VoraLogo: React.FC<VoraLogoProps> = ({
  size = 32,
  className = '',
  variant = 'white-circle',
  showCircle = true,
  alt = 'Logo Vora - La voce dei tuoi libri',
}) => {
  // If explicitly requested as generated image:
  if (variant === 'image') {
    const logoImgSrc = '/src/assets/images/vora_app_logo_1791750019551.jpg';
    return (
      <img
        src={logoImgSrc}
        alt={alt}
        referrerPolicy="no-referrer"
        width={typeof size === 'number' ? size : undefined}
        height={typeof size === 'number' ? size : undefined}
        className={`object-cover rounded-full border-2 border-white shadow-xs shrink-0 select-none ${className}`}
        style={typeof size === 'string' ? { width: size, height: size } : undefined}
      />
    );
  }

  // Pure Vector SVG representation of Vora:
  // Logo Bianco con Cerchio Bianco (White open book + Vora V letter + voice soundwaves inside a white circle)
  const isCircleActive = variant === 'white-circle' || showCircle;

  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      width={typeof size === 'number' ? size : undefined}
      height={typeof size === 'number' ? size : undefined}
      style={typeof size === 'string' ? { width: size, height: size } : undefined}
      aria-label={alt}
      role="img"
    >
      {/* Cerchio bianco esterno */}
      {isCircleActive && (
        <circle
          cx="32"
          cy="32"
          r="29.5"
          stroke="#FFFFFF"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
      )}

      {/* Book base & spine in pure white */}
      <path
        d="M32 44C26.5 41.5 16 41.5 10 44V50C16 47.5 26.5 47.5 32 50C37.5 47.5 48 47.5 54 50V44C48 41.5 37.5 41.5 32 44Z"
        fill="#FFFFFF"
      />
      <path
        d="M32 44V50"
        stroke="#000000"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* Open Book Pages */}
      <path
        d="M11 41C17 38.5 25 38.5 31 41.5V26C25 23 17 23 11 26V41Z"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M53 41C47 38.5 39 38.5 33 41.5V26C39 23 47 23 53 26V41Z"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Central stylized 'V' for Vora & Voice */}
      <path
        d="M23 15L32 35L41 15"
        stroke="#FFFFFF"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Acoustic Audio Soundwave bars */}
      {/* Left soundwaves */}
      <line
        x1="16.5"
        y1="27"
        x2="16.5"
        y2="33"
        stroke="#FFFFFF"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <line
        x1="19.5"
        y1="24"
        x2="19.5"
        y2="36"
        stroke="#FFFFFF"
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* Right soundwaves */}
      <line
        x1="44.5"
        y1="24"
        x2="44.5"
        y2="36"
        stroke="#FFFFFF"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <line
        x1="47.5"
        y1="27"
        x2="47.5"
        y2="33"
        stroke="#FFFFFF"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
};
