import React, { useCallback, useRef, useState } from 'react';
import {
  PluginTopbar, CustomScrollbar, Button, Input, Switch, ToggleGroup, ToggleGroupItem,
  toast, useItemStore, generateObjectID,
} from '@cubelv/sdk';
import { GithubUploadRecord, GithubUploadRecordFolder } from '../schemas/uploadRecordSchema';
import { FileDropzone, type FileDropzoneHandle, type SelectedFile } from '../components/FileDropzone';
import { PatGuideDialog } from '../components/PatGuideDialog';
import { uploadToGithub, type UploadMode, type UploadProgress, type UploadResult, type UploadFileEntry } from '../lib/githubApi';

type UploadModeUI = 'create' | 'update';

export function UploadLeafView() {
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [owner, setOwner] = useState('');
  const [token, setToken] = useState('');
  const [repoName, setRepoName] = useState('');
  const [commitMessage, setCommitMessage] = useState('Initial upload via CubeLV');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);
  const [mode, setMode] = useState<UploadModeUI>('create');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [showPatGuide, setShowPatGuide] = useState(false);
  const dropzoneRef = useRef<FileDropzoneHandle>(null);

  const validate = (): string | null => {
    if (files.length === 0) return '請先選擇檔案或資料夾';
    if (!owner.trim()) return '請輸入 GitHub 帳號';
    if (!token.trim()) return '請輸入 GitHub PAT';
    if (!repoName.trim()) return '請輸入倉庫名稱';
    if (!/^[A-Za-z0-9._-]+$/.test(repoName.trim())) {
      return '倉庫名稱只能包含英文字母、數字、點、底線、連字號';
    }
    if (!commitMessage.trim()) return '請輸入 commit 訊息';
    return null;
  };

  const handleUpload = async () => {
    const err = validate();
    if (err) { toast(err); return; }

    setUploading(true);
    setResult(null);
    setProgress({ current: 0, total: files.length, currentFile: '', status: 'preparing', message: '準備中...' });

    const entries: UploadFileEntry[] = files.map((f) => ({
      path: f.repoPath,
      file: f.file,
    }));

    try {
      const uploadResult = await uploadToGithub(
        owner.trim(),
        repoName.trim(),
        token.trim(),
        entries,
        {
          mode: mode as UploadMode,
          isPrivate,
          commitMessage: commitMessage.trim(),
          description: description.trim(),
          onProgress: setProgress,
        },
      );
      setResult(uploadResult);
      toast(`上傳完成：成功 ${uploadResult.uploadedCount} 個${uploadResult.failedFiles.length > 0 ? `，失敗 ${uploadResult.failedFiles.length} 個` : ''}`);

      // 寫入上傳紀錄
      try {
        const folders = useItemStore.getState().getByType('GITHUB_UPLOAD_RECORD_FOLDER');
        const folderId = folders.length > 0 ? folders[0].id : null;
        const now = Date.now();
        const record: any = {
          id: generateObjectID(),
          itemType: 'GITHUB_UPLOAD_RECORD',
          name: `${owner.trim()}/${repoName.trim()} - ${new Date().toLocaleString('zh-TW')}`,
          repoOwner: owner.trim(),
          repoName: repoName.trim(),
          repoUrl: uploadResult.repoUrl,
          isPrivate,
          commitSha: uploadResult.commitSha,
          commitMessage: commitMessage.trim(),
          fileCount: uploadResult.uploadedCount,
          failedFiles: JSON.stringify(uploadResult.failedFiles),
          status: uploadResult.failedFiles.length === 0 ? 'success' : 'partial',
          errorMessage: '',
          updatedAt: now,
        };
        if (folderId) record.parents = { [folderId]: now };
        record.createdAt = now;
        await useItemStore.getState().upsertItem(record, { needSync: true });
      } catch (recErr: any) {
        // 紀錄寫入失敗不影響上傳成功
        console.error('寫入上傳紀錄失敗：', recErr);
      }
    } catch (e: any) {
      const msg = e?.message ?? '上傳失敗';
      toast(msg);
      setProgress({ current: 0, total: files.length, currentFile: '', status: 'error', message: msg });

      // 失敗也寫一筆紀錄
      try {
        const folders = useItemStore.getState().getByType('GITHUB_UPLOAD_RECORD_FOLDER');
        const folderId = folders.length > 0 ? folders[0].id : null;
        const now = Date.now();
        const record: any = {
          id: generateObjectID(),
          itemType: 'GITHUB_UPLOAD_RECORD',
          name: `${owner.trim()}/${repoName.trim()} - 失敗 ${new Date().toLocaleString('zh-TW')}`,
          repoOwner: owner.trim(),
          repoName: repoName.trim(),
          repoUrl: '',
          isPrivate,
          commitSha: '',
          commitMessage: commitMessage.trim(),
          fileCount: 0,
          failedFiles: '',
          status: 'failed',
          errorMessage: msg,
          updatedAt: now,
        };
        if (folderId) record.parents = { [folderId]: now };
        record.createdAt = now;
        await useItemStore.getState().upsertItem(record, { needSync: true });
      } catch { /* ignore */ }
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setFiles([]);
    dropzoneRef.current?.clear();
    setResult(null);
    setProgress(null);
    setCommitMessage('Initial upload via CubeLV');
  };

  const progressPercent = progress && progress.total > 0
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  return (
    <div className="h-full flex flex-col min-h-0">
      <PluginTopbar
        title="GitHub 上傳助手"
        rightButtons={[
          { icon: 'help-circle', onClick: () => setShowPatGuide(true), title: '如何取得 PAT' },
        ]}
      />

      <div className="flex-1 min-h-0">
        <CustomScrollbar orientation="vertical">
          <div className="max-w-3xl mx-auto p-4 flex flex-col gap-4">
            {/* 步驟 1：選擇檔案 */}
            <section>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-semibold">1</span>
                <h2 className="text-base font-semibold">選擇檔案或資料夾</h2>
              </div>
              <FileDropzone ref={dropzoneRef} files={files} onFilesChange={setFiles} />
            </section>

            {/* 步驟 2：填寫 GitHub 資訊 */}
            <section>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-semibold">2</span>
                <h2 className="text-base font-semibold">填寫 GitHub 資訊</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">GitHub 帳號</label>
                  <Input
                    value={owner}
                    onChange={(e) => setOwner(e.target.value)}
                    placeholder="octocat"
                    disabled={uploading}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">倉庫名稱</label>
                  <Input
                    value={repoName}
                    onChange={(e) => setRepoName(e.target.value)}
                    placeholder="my-new-repo"
                    disabled={uploading}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-2">
                    <span>GitHub PAT</span>
                    <button
                      onClick={() => setShowPatGuide(true)}
                      className="text-[var(--linkcolor)] hover:underline text-xs"
                    >
                      如何取得？
                    </button>
                  </label>
                  <Input
                    type="password"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="github_pat_xxxxxxxxxxxx"
                    disabled={uploading}
                  />
                </div>
              </div>
            </section>

            {/* 步驟 3：上傳選項 */}
            <section>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-semibold">3</span>
                <h2 className="text-base font-semibold">上傳選項</h2>
              </div>
              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">上傳模式</label>
                  <ToggleGroup type="single" value={mode} onValueChange={(v) => v && setMode(v as UploadModeUI)}>
                    <ToggleGroupItem value="create">建立新倉庫</ToggleGroupItem>
                    <ToggleGroupItem value="update">推到既有倉庫</ToggleGroupItem>
                  </ToggleGroup>
                  <p className="text-xs text-muted-foreground mt-1">
                    {mode === 'create'
                      ? '若同名倉庫已存在會自動切換為「推到既有倉庫」模式'
                      : '若倉庫不存在會自動切換為「建立新倉庫」模式'}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Commit 訊息</label>
                  <Input
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    placeholder="Initial upload via CubeLV"
                    disabled={uploading}
                  />
                </div>
                {mode === 'create' && (
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">倉庫描述（選填）</label>
                    <Input
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="從 CubeLV 上傳"
                      disabled={uploading}
                    />
                  </div>
                )}
                <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">私人倉庫</p>
                    <p className="text-xs text-muted-foreground">只有你自己能存取這個倉庫</p>
                  </div>
                  <Switch
                    checked={isPrivate}
                    onCheckedChange={setIsPrivate}
                    disabled={uploading}
                  />
                </div>
              </div>
            </section>

            {/* 上傳按鈕 */}
            <div className="flex gap-2">
              <Button
                onClick={handleUpload}
                disabled={uploading || files.length === 0}
                className="flex-1"
              >
                {uploading
                  ? '上傳中...'
                  : mode === 'create'
                    ? '建立並上傳'
                    : '上傳到既有倉庫'}
              </Button>
              <Button variant="outline" onClick={handleReset} disabled={uploading}>
                重設
              </Button>
            </div>

            {/* 進度條 */}
            {progress && uploading && (
              <div className="rounded-md border border-border bg-card p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium">{progress.message ?? '處理中...'}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">{progressPercent}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-200"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                {progress.status === 'error' && (
                  <p className="text-xs text-destructive mt-2">{progress.message}</p>
                )}
              </div>
            )}

            {/* 結果 */}
            {result && (
              <div className="rounded-md border border-border bg-card p-4 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-semibold ${
                    result.failedFiles.length === 0 ? 'bg-green-500/20 text-green-700 dark:text-green-300' : 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300'
                  }`}>
                    ✓
                  </span>
                  <h3 className="font-semibold">
                    {result.failedFiles.length === 0 ? '全部上傳成功' : `部分上傳成功（${result.failedFiles.length} 個失敗）`}
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground">倉庫</div>
                    <a
                      href={result.repoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--linkcolor)] hover:underline truncate block"
                    >
                      {result.repoUrl}
                    </a>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">成功檔案</div>
                    <div className="font-medium">{result.uploadedCount} 個</div>
                  </div>
                  {result.created && (
                    <div className="col-span-2 text-xs text-muted-foreground">
                      已建立新倉庫（{isPrivate ? '私人' : '公開'}）
                    </div>
                  )}
                </div>

                {result.failedFiles.length > 0 && (
                  <details className="text-sm">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                      查看失敗清單（{result.failedFiles.length}）
                    </summary>
                    <div className="mt-2 max-h-40 overflow-y-auto rounded border border-border bg-muted/30 p-2">
                      {result.failedFiles.map((f, i) => (
                        <div key={i} className="py-1 text-xs">
                          <div className="font-mono text-foreground">{f.path}</div>
                          <div className="text-destructive">{f.error}</div>
                        </div>
                      ))}
                    </div>
                  </details>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => window.open(result.repoUrl, '_blank', 'noopener')}>
                    開啟倉庫
                  </Button>
                  <Button variant="outline" onClick={() => {
                    navigator.clipboard.writeText(result.repoUrl).then(() => toast('已複製倉庫網址'));
                  }}>
                    複製網址
                  </Button>
                  <Button variant="ghost" onClick={handleReset}>
                    再上傳一批
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CustomScrollbar>
      </div>

      <PatGuideDialog open={showPatGuide} onOpenChange={setShowPatGuide} />
    </div>
  );
}
