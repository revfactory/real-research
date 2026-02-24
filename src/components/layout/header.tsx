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
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 lg:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden h-9 w-9"
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
