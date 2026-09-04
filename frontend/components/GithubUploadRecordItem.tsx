interface GithubUploadRecordItemProps {
  itemId: string;
  item: any;
}

const STATUS_COLOR: Record<string, string> = {
  success: 'bg-green-500/15 text-green-700 dark:text-green-300',
  partial: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-300',
  failed: 'bg-red-500/15 text-red-700 dark:text-red-300',
};

const STATUS_LABEL: Record<string, string> = {
  success: '全部成功',
  partial: '部分成功',
  failed: '失敗',
};

export function GithubUploadRecordItem({ itemId, item }: GithubUploadRecordItemProps) {
  const status = item.status ?? 'success';
  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-border last:border-b-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`text-xs px-1.5 py-0.5 rounded ${STATUS_COLOR[status] ?? 'bg-muted text-muted-foreground'}`}>
            {STATUS_LABEL[status] ?? status}
          </span>
          {item.isPrivate && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">私人</span>
          )}
        </div>
        <div className="font-medium text-sm truncate">
          {item.repoOwner}/{item.repoName}
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {item.commitMessage || `${item.fileCount ?? 0} 個檔案`}
        </div>
      </div>
    </div>
  );
}
