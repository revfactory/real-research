'use client';

import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/stores/ui-store';

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  const { setSidebarOpen } = useUIStore();

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-border/40 bg-background/60 backdrop-blur-xl px-4 lg:px-6 shadow-sm">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden h-9 w-9 hover:bg-accent/50 transition-colors"
        onClick={() => setSidebarOpen(true)}
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">메뉴 열기</span>
      </Button>

      {title && (
        <h1 className="text-lg font-semibold truncate">{title}</h1>
      )}
    </header>
  );
}
