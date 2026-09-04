import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  Button,
} from '@cubelv/sdk';

interface PatGuideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PatGuideDialog({ open, onOpenChange }: PatGuideDialogProps) {
  const openFineGrained = () => {
    window.open('https://github.com/settings/personal-access-tokens/new', '_blank', 'noopener');
  };
  const openClassic = () => {
    window.open('https://github.com/settings/tokens/new', '_blank', 'noopener');
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

          {/* 推薦 classic token */}
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-foreground mb-1.5 flex items-center gap-2">
              <span className="text-xs px-1.5 py-0.5 rounded bg-primary text-primary-foreground">推薦</span>
              方法一：Classic token（最簡單）
            </p>
            <button
              onClick={openClassic}
              className="w-full text-left rounded-md border border-border bg-card hover:bg-accent p-2.5 transition-colors"
            >
              <div className="text-xs text-muted-foreground mb-0.5">連結</div>
              <div className="text-[var(--linkcolor)] break-all">https://github.com/settings/tokens/new</div>
            </button>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 pl-1 mt-2 text-xs">
              <li>點 <b>Generate new token</b> → 選 <b>Generate new token (classic)</b></li>
              <li>Note 隨意填（如 CubeLV 上傳助手）</li>
              <li>Expiration 建議 30 或 90 天</li>
              <li><b>Scopes</b> 只勾 <b>repo</b> 一項就夠（建立 / 寫入倉庫）</li>
              <li>捲到最下按 <b>Generate token</b>，複製 <code className="px-1 py-0.5 rounded bg-muted">ghp_</code> 開頭的 token</li>
            </ul>
          </div>

          {/* 進階 fine-grained */}
          <div>
            <p className="font-semibold mb-1.5">方法二：Fine-grained token（推薦給重視安全者）</p>
            <button
              onClick={openFineGrained}
              className="w-full text-left rounded-md border border-border bg-card hover:bg-accent p-2.5 transition-colors"
            >
              <div className="text-xs text-muted-foreground mb-0.5">連結</div>
              <div className="text-[var(--linkcolor)] break-all">https://github.com/settings/personal-access-tokens/new</div>
            </button>
            <div className="rounded-md border border-border bg-card p-2.5 mt-2 space-y-1.5">
              <p className="text-xs text-muted-foreground">Repository permissions（必須勾兩個）：</p>
              <ul className="list-disc list-inside text-foreground space-y-0.5 pl-1 text-xs">
                <li><b>Administration</b>：Read and write（建立倉庫需要）</li>
                <li><b>Contents</b>：Read and write（上傳檔案需要）</li>
                <li><b>Metadata</b>：Read-only（自動帶入）</li>
              </ul>
              <p className="text-xs text-muted-foreground mt-1">
                漏勾 Administration 就會出現「Resource not accessible by personal access token」錯誤。
              </p>
            </div>
          </div>

          <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/30 p-3 text-xs">
            <p className="font-semibold text-yellow-700 dark:text-yellow-300 mb-1">安全提醒</p>
            <p className="text-muted-foreground">
              本插件不會儲存你的 PAT 到任何地方。如果 token 不慎外洩，到 GitHub 設定頁刪除後重發一組即可。
              若只想推到既有倉庫（不建立新 repo），可以只用 Contents 權限的 fine-grained token。
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
