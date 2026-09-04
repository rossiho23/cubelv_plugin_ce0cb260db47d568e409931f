import React, { useMemo, useState } from 'react';
import {
  PluginTopbar, CustomScrollbar, Button, Input, Select, SelectTrigger, SelectValue,
  SelectContent, SelectItem, toast, useItemsByType, useSelectedItemsStore,
  useItemStore,
} from '@cubelv/sdk';
import { GithubUploadRecord } from '../schemas/uploadRecordSchema';

type FilterStatus = '' | 'success' | 'partial' | 'failed';

const STATUS_LABEL: Record<string, string> = {
  success: '全部成功',
  partial: '部分成功',
  failed: '失敗',
};

const STATUS_COLOR: Record<string, string> = {
  success: 'bg-green-500/15 text-green-700 dark:text-green-300',
  partial: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-300',
  failed: 'bg-red-500/15 text-red-700 dark:text-red-300',
};

export function HistoryLeafView() {
  const folderId = useSelectedItemsStore((s) => s.lastFolderId);
  const records = useItemsByType<GithubUploadRecord>('GITHUB_UPLOAD_RECORD', folderId);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('');

  const sorted = useMemo(() => {
    let list = [...records].sort((a, b) => {
      const ta = (a as any).createdAt ?? 0;
      const tb = (b as any).createdAt ?? 0;
      return tb - ta;
    });
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((r) =>
        `${r.repoOwner}/${r.repoName}`.toLowerCase().includes(q) ||
        (r.commitMessage ?? '').toLowerCase().includes(q)
      );
    }
    if (statusFilter) {
      list = list.filter((r) => r.status === statusFilter);
    }
    return list;
  }, [records, search, statusFilter]);

  const totalSuccess = useMemo(() => records.reduce((sum, r) => sum + (r.fileCount ?? 0), 0), [records]);

  const deleteRecord = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (!confirm(`確定刪除「${name}」？`)) return;
    try {
      await useItemStore.getState().removeItems([id], { needSync: true });
      toast('已刪除');
    } catch (err: any) {
      toast(err?.message ?? '刪除失敗');
    }
  };

  const parseFailed = (s: string): { path: string; error: string }[] => {
    if (!s) return [];
    try { return JSON.parse(s); } catch { return []; }
  };

  const fmtTime = (ts: number) => {
    if (!ts) return '';
    const d = new Date(ts);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className="h-full flex flex-col min-h-0">
      <PluginTopbar
        title={folderId ? '上傳紀錄' : 'GitHub 上傳紀錄'}
      />

      {records.length > 0 && (
        <div className="px-3 py-2 border-b border-border flex flex-col gap-2">
          <div className="flex gap-2 items-center">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜尋倉庫或 commit 訊息..."
              className="flex-1"
            />
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as FilterStatus)}>
              <SelectTrigger className="w-32"><SelectValue placeholder="全部狀態" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">全部狀態</SelectItem>
                <SelectItem value="success">全部成功</SelectItem>
                <SelectItem value="partial">部分成功</SelectItem>
                <SelectItem value="failed">失敗</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="text-xs text-muted-foreground">
            {statusFilter || search
              ? `${sorted.length} / ${records.length} 筆`
              : `${records.length} 筆紀錄`}
            {' · '}累計上傳 {totalSuccess} 個檔案
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0">
        <CustomScrollbar orientation="vertical">
          {records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-3">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                </svg>
              </div>
              <p className="text-muted-foreground text-sm mb-1">尚無上傳紀錄</p>
              <p className="text-xs text-muted-foreground">回到「GitHub 上傳助手」開始第一次上傳</p>
            </div>
          ) : sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <p className="text-muted-foreground text-sm">沒有符合條件的紀錄</p>
            </div>
          ) : (
            <div className="px-3 py-2 flex flex-col gap-2">
              {sorted.map((r) => {
                const failed = parseFailed(r.failedFiles ?? '');
                return (
                  <div
                    key={r.id}
                    className="rounded-lg border border-border bg-card p-3 hover:bg-accent/30 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${STATUS_COLOR[r.status] ?? 'bg-muted text-muted-foreground'}`}>
                            {STATUS_LABEL[r.status] ?? r.status}
                          </span>
                          {r.isPrivate && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                              私人
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {fmtTime((r as any).createdAt ?? 0)}
                          </span>
                        </div>

                        {r.repoUrl ? (
                          <a
                            href={r.repoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[var(--linkcolor)] hover:underline font-medium block truncate"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {r.repoOwner}/{r.repoName}
                          </a>
                        ) : (
                          <div className="font-medium text-muted-foreground">{r.repoOwner}/{r.repoName}</div>
                        )}

                        {r.commitMessage && (
                          <p className="text-xs text-muted-foreground mt-1 truncate" title={r.commitMessage}>
                            {r.commitMessage}
                          </p>
                        )}

                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                          {r.status === 'success' && <span>✓ {r.fileCount} 個檔案</span>}
                          {r.status === 'partial' && (
                            <>
                              <span>✓ {r.fileCount} 個成功</span>
                              {failed.length > 0 && <span className="text-destructive">✗ {failed.length} 個失敗</span>}
                            </>
                          )}
                          {r.status === 'failed' && r.errorMessage && (
                            <span className="text-destructive truncate" title={r.errorMessage}>{r.errorMessage}</span>
                          )}
                        </div>
                      </div>

                      <button
                        className="shrink-0 p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                        onClick={(e) => deleteRecord(e, r.id, `${r.repoOwner}/${r.repoName}`)}
                        title="刪除紀錄"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CustomScrollbar>
      </div>
    </div>
  );
}
