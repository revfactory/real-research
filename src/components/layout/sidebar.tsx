'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Plus,
  Search,
  LogOut,
  Settings,
  FileText,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ThemeToggle } from './theme-toggle';
import { useUIStore } from '@/stores/ui-store';
import { createClient } from '@/lib/supabase/client';
import type { Research, UserProfile } from '@/types';

const navItems = [
  { icon: LayoutDashboard, label: '대시보드', href: '/dashboard' },
  { icon: Plus, label: '새 리서치', href: '/research/new' },
  { icon: Search, label: '검색', href: '/search' },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { sidebarCollapsed, setSidebarCollapsed } = useUIStore();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [recentResearches, setRecentResearches] = useState<Research[]>([]);
  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        setUser({
          id: authUser.id,
          email: authUser.email || '',
          display_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || '',
          avatar_url: authUser.user_metadata?.avatar_url || null,
          created_at: authUser.created_at,
          updated_at: authUser.updated_at || authUser.created_at,
        });

        const { data } = await supabase
          .from('research')
          .select('id, topic, status, created_at')
          .eq('user_id', authUser.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (data) {
          setRecentResearches(data as unknown as Research[]);
        }
      }
    }
    loadData();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col border-r bg-sidebar transition-all duration-200 ease-in-out',
        sidebarCollapsed ? 'w-16' : 'w-[280px]'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between h-14 px-4 border-b">
        {!sidebarCollapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">R</span>
            </div>
            <span className="font-semibold text-sm">Real Research</span>
          </Link>
        )}
        <div className="flex items-center gap-1">
          {!sidebarCollapsed && <ThemeToggle />}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-2">
        <nav className="space-y-1 px-2">
          {navItems.map((item) => {
            const isActive =
              item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Recent Researches */}
        {!sidebarCollapsed && recentResearches.length > 0 && (
          <>
            <Separator className="my-4" />
            <div className="px-4 mb-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                최근 리서치
              </p>
            </div>
            <nav className="space-y-0.5 px-2">
              {recentResearches.map((r) => (
                <Link
                  key={r.id}
                  href={
                    r.status === 'completed'
                      ? `/research/${r.id}`
                      : `/research/${r.id}/progress`
                  }
                  className={cn(
                    'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors',
                    'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <FileText className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{r.topic}</span>
                </Link>
              ))}
            </nav>
          </>
        )}
      </ScrollArea>

      {/* User Menu */}
      <div className="border-t p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                'w-full justify-start gap-2 px-2',
                sidebarCollapsed && 'justify-center px-0'
              )}
            >
              <Avatar className="h-7 w-7">
                <AvatarImage src={user?.avatar_url || undefined} />
                <AvatarFallback className="text-xs">
                  {user?.display_name?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              {!sidebarCollapsed && (
                <span className="text-sm truncate">
                  {user?.display_name || user?.email || '사용자'}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem disabled>
              <Settings className="mr-2 h-4 w-4" />
              설정
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              로그아웃
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
