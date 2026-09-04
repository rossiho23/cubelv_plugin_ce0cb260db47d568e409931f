import React, { useCallback, useRef, useState } from 'react';
import { Button } from '@cubelv/sdk';

interface SelectedFile {
  /** 顯示用路徑（含選擇的資料夾根） */
  displayPath: string;
  /** 倉庫內路徑（去除根目錄前綴） */
  repoPath: string;
  file: File;
}

interface FileDropzoneProps {
  files: SelectedFile[];
  onFilesChange: (files: SelectedFile[]) => void;
}

export interface FileDropzoneHandle {
  /** 程式化呼叫：清空所有檔案 */
  clear: () => void;
}

export const FileDropzone = React.forwardRef<FileDropzoneHandle, FileDropzoneProps>(
  function FileDropzone({ files, onFilesChange }, ref) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const folderInputRef = useRef<HTMLInputElement>(null);
    const [dragOver, setDragOver] = useState(false);
    const [rootName, setRootName] = useState('');

    React.useImperativeHandle(ref, () => ({
      clear: () => {
        onFilesChange([]);
        setRootName('');
      },
    }));

    const pickFiles = () => fileInputRef.current?.click();
    const pickFolder = () => folderInputRef.current?.click();

    const processFiles = useCallback((rawFiles: FileList | File[], prefix: string) => {
      const list = Array.from(rawFiles);
      const next: SelectedFile[] = list
        .filter((f) => !f.name.startsWith('.') && f.name !== '.DS_Store')
        .map((file) => {
          // File.webkitRelativePath 在 webkitDirectory 時才有值
          const relPath = (file as any).webkitRelativePath as string | undefined;
          const displayPath = relPath || file.name;
          // 去掉根目錄前綴（如「myfolder/sub/file.txt」→「sub/file.txt」）
          let repoPath = displayPath;
          if (prefix) {
            if (displayPath.startsWith(prefix + '/')) {
              repoPath = displayPath.slice(prefix.length + 1);
            } else if (displayPath === prefix) {
              repoPath = file.name;
            }
          }
          return { displayPath, repoPath, file };
        });
      onFilesChange(next);
    }, [onFilesChange]);

    const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files;
      if (!f || f.length === 0) return;
      setRootName('');
      processFiles(f, '');
      e.target.value = '';
    };

    const onFolderInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files;
      if (!f || f.length === 0) return;
      const first = f[0] as File;
      const rel = (first as any).webkitRelativePath as string | undefined;
      const root = rel ? rel.split('/')[0] : '';
      setRootName(root);
      processFiles(f, root);
      e.target.value = '';
    };

    const onDrop = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const files = e.dataTransfer.files;
      if (!files || files.length === 0) return;

      // 拖入檔案（瀏覽器拖拽資料夾路徑不可靠，請用點擊「加資料夾」按鈕選擇目錄）
      setRootName('');
      processFiles(files, '');
    }, [processFiles]);

    const onDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(true);
    };
    const onDragLeave = () => setDragOver(false);

    const removeFile = (idx: number) => {
      const next = files.filter((_, i) => i !== idx);
      onFilesChange(next);
    };

    const totalSize = files.reduce((sum, f) => sum + f.file.size, 0);
    const fmtSize = (b: number) => {
      if (b < 1024) return `${b} B`;
      if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
      if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
      return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;
    };

    return (
      <div className="flex flex-col gap-2">
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          className={`rounded-lg border-2 border-dashed transition-colors p-6 text-center cursor-pointer ${
            dragOver ? 'border-primary bg-primary/5' : 'border-border bg-muted/30 hover:bg-muted/50'
          }`}
          onClick={files.length === 0 ? pickFiles : undefined}
        >
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
            </svg>
            <p className="text-sm">
              {files.length === 0
                ? '拖拽檔案或資料夾到此處，或點擊選擇'
                : `已選擇 ${files.length} 個檔案（共 ${fmtSize(totalSize)}）`}
            </p>
            {rootName && (
              <p className="text-xs">根目錄：<code className="px-1 py-0.5 rounded bg-background">{rootName}</code></p>
            )}
            {files.length > 0 && (
              <div className="flex gap-2 mt-2">
                <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); pickFiles(); }}>
                  加檔案
                </Button>
                <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); pickFolder(); }}>
                  加資料夾
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onFilesChange([]);
                    setRootName('');
                  }}
                >
                  清空
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* hidden inputs */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={onFileInputChange}
        />
        <input
          ref={folderInputRef}
          type="file"
          multiple
          // @ts-ignore webkitdirectory 非標準
          webkitdirectory="true"
          directory=""
          className="hidden"
          onChange={onFolderInputChange}
        />

        {files.length > 0 && (
          <div className="max-h-48 overflow-y-auto rounded-md border border-border bg-card">
            {files.map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-3 py-1.5 text-xs border-b border-border last:border-b-0 hover:bg-accent/40"
              >
                <span className="flex-1 truncate font-mono" title={f.repoPath}>{f.repoPath}</span>
                <span className="text-muted-foreground shrink-0">{fmtSize(f.file.size)}</span>
                <button
                  onClick={() => removeFile(i)}
                  className="shrink-0 w-5 h-5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive flex items-center justify-center"
                  title="移除"
                >×</button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  },
);

export type { SelectedFile };
