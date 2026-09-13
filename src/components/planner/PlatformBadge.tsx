import React from 'react';
import { Platform } from '@/types/planner';
import {
  IconTikTok,
  IconInstagram,
  IconYouTube,
  IconFacebook,
  IconXTwitter,
} from '@/components/common/Icons';

interface PlatformBadgeProps {
  platform: Platform;
  showLabel?: boolean;
}

const PLATFORM_CONFIG: Record<
  Platform,
  {
    name: string;
    icon: React.ComponentType<{ className?: string; size?: number }>;
    bg: string;
    text: string;
    border: string;
  }
> = {
  tiktok: {
    name: 'TikTok',
    icon: IconTikTok,
    bg: 'bg-neutral-900',
    text: 'text-white',
    border: 'border-neutral-800',
  },
  instagram: {
    name: 'Instagram',
    icon: IconInstagram,
    bg: 'bg-gradient-to-r from-purple-50 to-pink-50',
    text: 'text-pink-700',
    border: 'border-pink-200',
  },
  youtube: {
    name: 'YouTube',
    icon: IconYouTube,
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
  },
  facebook: {
    name: 'Facebook',
    icon: IconFacebook,
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
  },
  x: {
    name: 'X',
    icon: IconXTwitter,
    bg: 'bg-neutral-100',
    text: 'text-neutral-900',
    border: 'border-neutral-300',
  },
};

export function PlatformBadge({ platform, showLabel = false }: PlatformBadgeProps) {
  const config = PLATFORM_CONFIG[platform] || {
    name: platform,
    icon: IconTikTok,
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    border: 'border-gray-200',
  };

  const IconComponent = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border text-xs font-medium ${config.bg} ${config.text} ${config.border} ${
        showLabel ? 'px-2 py-0.5' : 'p-1'
      }`}
      title={config.name}
      aria-label={config.name}
    >
      <IconComponent className="w-3.5 h-3.5" size={14} />
      {showLabel && <span>{config.name}</span>}
    </span>
  );
}
