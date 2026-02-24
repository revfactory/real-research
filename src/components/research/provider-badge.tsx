'use client';

import { Badge } from '@/components/ui/badge';
import { Bot, Sparkles, Stars } from 'lucide-react';
import { PROVIDER_CONFIG } from '@/lib/constants';
import type { Provider } from '@/types';

const providerIcons: Record<Provider, React.ElementType> = {
  openai: Bot,
  anthropic: Sparkles,
  gemini: Stars,
};

interface ProviderBadgeProps {
  provider: Provider;
}

export function ProviderBadge({ provider }: ProviderBadgeProps) {
  const config = PROVIDER_CONFIG[provider];
  const Icon = providerIcons[provider];

  return (
    <Badge
      variant="outline"
      className="text-[11px] font-semibold gap-1"
      style={{ borderColor: config.color, color: config.color }}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
