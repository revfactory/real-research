'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
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
  Trash2,
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
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { useUIStore } from '@/stores/ui-store';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
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
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; topic: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const supabase = createClient();

  const userIdRef = useRef<string | null>(null);

  const loadRecentResearches = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('research')
      .select('id, topic, status, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);
    if (data) {
      setRecentResearches(data as unknown as Research[]);
    }
  }, [supabase]);

  useEffect(() => {
    async function loadData() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        userIdRef.current = authUser.id;
        setUser({
          id: authUser.id,
          email: authUser.email || '',
          display_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || '',
          avatar_url: authUser.user_metadata?.avatar_url || null,
          created_at: authUser.created_at,
          updated_at: authUser.updated_at || authUser.created_at,
        });
        loadRecentResearches(authUser.id);
      }
    }
    loadData();
  }, [supabase, loadRecentResearches]);

  // Realtime: keep recent researches in sync
  useEffect(() => {
    const channel = supabase
      .channel('sidebar-research')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'research' },
        (payload) => {
          const row = payload.new as Research;
          if (userIdRef.current && row.user_id === userIdRef.current) {
            setRecentResearches((prev) => [row, ...prev].slice(0, 5));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'research' },
        (payload) => {
          const row = payload.new as Research;
          if (userIdRef.current && row.user_id === userIdRef.current) {
            setRecentResearches((prev) =>
              prev.map((r) => (r.id === row.id ? { ...r, ...row } : r))
            );
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'research' },
        (payload) => {
          const deleted = payload.old as { id: string };
          if (deleted.id) {
            setRecentResearches((prev) => prev.filter((r) => r.id !== deleted.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const handleDeleteResearch = async () => {
    if (!deleteTarget || !user) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/research/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('삭제에 실패했습니다.');
      toast.success('리서치가 삭제되었습니다.');
      setRecentResearches((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      // If currently viewing the deleted research, redirect to dashboard
      if (pathname.includes(deleteTarget.id)) {
        router.push('/dashboard');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '삭제에 실패했습니다.');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

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
                <div
                  key={r.id}
                  className="group flex items-center rounded-md text-sm transition-colors text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                >
                  <Link
                    href={
                      r.status === 'completed'
                        ? `/research/${r.id}`
                        : `/research/${r.id}/progress`
                    }
                    className="flex items-center gap-2 flex-1 min-w-0 px-3 py-1.5"
                  >
                    <FileText className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{r.topic}</span>
                  </Link>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget({ id: r.id, topic: r.topic });
                    }}
                    className="hidden group-hover:flex items-center justify-center h-6 w-6 mr-1 rounded hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0"
                    title="삭제"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
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

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="리서치 삭제"
        description={`"${deleteTarget?.topic || ''}" 리서치를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        confirmLabel="삭제"
        variant="destructive"
        onConfirm={handleDeleteResearch}
        loading={deleting}
      />
    </aside>
  );
}
