'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Plus,
  Search,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ThemeToggle } from './theme-toggle';
import { useUIStore } from '@/stores/ui-store';
import { createClient } from '@/lib/supabase/client';

const navItems = [
  { icon: LayoutDashboard, label: '대시보드', href: '/dashboard' },
  { icon: Plus, label: '새 리서치', href: '/research/new' },
  { icon: Search, label: '검색', href: '/search' },
];

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSidebarOpen(false);
    router.push('/login');
  };

  return (
    <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <SheetContent side="left" className="w-[280px] p-0">
        <SheetHeader className="h-14 flex flex-row items-center justify-between px-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">R</span>
            </div>
            <span className="font-semibold text-sm">Real Research</span>
          </SheetTitle>
          <ThemeToggle />
        </SheetHeader>

        <nav className="space-y-1 p-2 mt-2">
          {navItems.map((item) => {
            const isActive =
              item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <Separator className="my-2" />

        <div className="p-2">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-muted-foreground"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            <span>로그아웃</span>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
