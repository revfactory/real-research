'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Plus,
  Search,
  LogOut,
  FileText,
  Trash2,
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
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { useUIStore } from '@/stores/ui-store';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { Research } from '@/types';

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
  const [recentResearches, setRecentResearches] = useState<Research[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; topic: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadRecent = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('research')
      .select('id, topic, status, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);
    if (data) setRecentResearches(data as unknown as Research[]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, pathname]);

  useEffect(() => {
    if (sidebarOpen) loadRecent();
  }, [sidebarOpen, loadRecent]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSidebarOpen(false);
    router.push('/login');
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/research/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('삭제에 실패했습니다.');
      toast.success('리서치가 삭제되었습니다.');
      setRecentResearches((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      if (pathname.includes(deleteTarget.id)) {
        setSidebarOpen(false);
        router.push('/dashboard');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '삭제에 실패했습니다.');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <>
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

          {recentResearches.length > 0 && (
            <>
              <Separator className="my-2" />
              <div className="px-4 mb-1">
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
                      onClick={() => setSidebarOpen(false)}
                      className="flex items-center gap-2 flex-1 min-w-0 px-3 py-2"
                    >
                      <FileText className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{r.topic}</span>
                    </Link>
                    <button
                      onClick={() => setDeleteTarget({ id: r.id, topic: r.topic })}
                      className="flex items-center justify-center h-7 w-7 mr-1 rounded hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0"
                      title="삭제"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </nav>
            </>
          )}

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

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="리서치 삭제"
        description={`"${deleteTarget?.topic || ''}" 리서치를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        confirmLabel="삭제"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </>
  );
}
