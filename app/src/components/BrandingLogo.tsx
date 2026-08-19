'use client';

import React from 'react';
import { cn } from '@/lib/utils/common';
import DarkLogo from './DarkLogo';
import LightLogo from './LightLogo';

interface BrandingLogoProps {
  width?: number | string;
  height?: number | string;
  collapsed?: boolean;
  className?: string;
}

const BrandingLogo: React.FC<BrandingLogoProps> = ({
  width = 87,
  height = 46,
  collapsed = false,
  className,
}) => {
  return (
    <div className={cn('flex items-center justify-center', className)}>
      <div className="hidden dark:block">
        <LightLogo width={width} height={height} collapsed={collapsed} />
      </div>
      <div className="block dark:hidden">
        <DarkLogo width={width} height={height} collapsed={collapsed} />
      </div>
    </div>
  );
};

export default BrandingLogo;
