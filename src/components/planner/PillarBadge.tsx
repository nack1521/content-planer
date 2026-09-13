import React from 'react';
import { ContentPillar } from '@/types/planner';
import { useLocale } from '@/context/LocaleContext';

interface PillarBadgeProps {
  pillar?: ContentPillar | null;
}

export function PillarBadge({ pillar }: PillarBadgeProps) {
  const { locale } = useLocale();

  if (!pillar) return null;

  const name = locale === 'th' ? pillar.name_th : pillar.name_en;

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-slate-100/80 text-slate-800 border border-slate-200/80"
      style={{
        backgroundColor: `${pillar.color}15`,
        borderColor: `${pillar.color}35`,
        color: pillar.color,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: pillar.color }}
        aria-hidden="true"
      />
      <span className="truncate max-w-[130px]">{name}</span>
    </span>
  );
}
