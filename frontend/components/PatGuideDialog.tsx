import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  Button,
} from '@cubelv/sdk';

interface PatGuideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PatGuideDialog({ open, onOpenChange }: PatGuideDialogProps) {
  const openGitHubSettings = () => {
    window.open('https://github.com/settings/tokens?type=beta', '_blank', 'noopener');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>如何取得 GitHub PAT</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 text-sm max-h-[60vh] overflow-y-auto">
          <div className="rounded-lg bg-muted/50 border border-border p-3">
            <p className="font-semibold text-foreground mb-1">PAT 是什麼？</p>
            <p className="text-muted-foreground">
              Personal Access Token（個人存取令牌）讓插件可以代替你操作 GitHub API。
              令牌只在你這次操作期間存在於瀏覽器記憶體，不會被儲存到 CubeLV。
            </p>
          </div>

          <div>
            <p className="font-semibold mb-1.5">步驟一：開啟 GitHub 設定頁</p>
            <button
              onClick={openGitHubSettings}
              className="w-full text-left rounded-md border border-border bg-card hover:bg-accent p-3 transition-colors"
            >
              <div className="text-xs text-muted-foreground mb-0.5">連結</div>
              <div className="text-[var(--linkcolor)] break-all">https://github.com/settings/tokens?type=beta</div>
            </button>
          </div>

          <div>
            <p className="font-semibold mb-1.5">步驟二：建立 Fine-grained token</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 pl-1">
              <li>點 <b>Generate new token</b> → 選 <b>Fine-grained personal access token</b></li>
              <li>Resource owner 選自己的帳號</li>
              <li>Expiration 建議 30 天或 90 天（過期可再申請）</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold mb-1.5">步驟三：設定權限</p>
            <div className="rounded-md border border-border bg-card p-3 space-y-1.5">
              <p className="text-muted-foreground">Repository permissions（必要）：</p>
              <ul className="list-disc list-inside text-foreground space-y-0.5 pl-1">
                <li><b>Contents</b>：Read and write（建立/更新檔案）</li>
                <li><b>Metadata</b>：Read-only（自動帶入）</li>
              </ul>
              <p className="text-xs text-muted-foreground mt-2">
                其他權限不必勾。Account permissions 也保持預設即可。
              </p>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-1.5">步驟四：複製並貼到插件</p>
            <p className="text-muted-foreground">
              建立後 GitHub 只會顯示完整 token 一次，請立刻複製（會以 <code className="px-1 py-0.5 rounded bg-muted">github_pat_</code> 開頭），
              回到插件貼到「GitHub PAT」欄位即可。
            </p>
          </div>

          <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/30 p-3 text-xs">
            <p className="font-semibold text-yellow-700 dark:text-yellow-300 mb-1">安全提醒</p>
            <p className="text-muted-foreground">
              本插件不會儲存你的 PAT 到任何地方。如果 token 不慎外洩，到 GitHub 設定頁刪除後重發一組即可。
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>了解</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
