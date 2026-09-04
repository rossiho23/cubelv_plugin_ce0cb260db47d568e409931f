import { fetchExternal } from '@cubelv/sdk';

const API = 'https://api.github.com';

export type UploadMode = 'create' | 'update';

export interface UploadFileEntry {
  /** 檔案在倉庫中的路徑（含子資料夾時含目錄） */
  path: string;
  /** 原始 File 物件（瀏覽器 File） */
  file: File;
}

export interface UploadProgress {
  current: number;
  total: number;
  currentFile: string;
  status: 'preparing' | 'creating' | 'uploading' | 'done' | 'error';
  message?: string;
}

interface ApiOptions {
  method?: string;
  body?: any;
  token: string;
}

async function ghFetch(path: string, opts: ApiOptions): Promise<Response> {
  const resp = await fetchExternal(`${API}${path}`, {
    method: opts.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${opts.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  return resp;
}

export async function checkRepoExists(owner: string, repo: string, token: string): Promise<boolean> {
  const resp = await ghFetch(`/repos/${owner}/${repo}`, { token });
  return resp.status === 200;
}

export async function getAuthenticatedUser(token: string): Promise<string> {
  const resp = await ghFetch('/user', { token });
  if (resp.status !== 200) throw new Error(`無法取得 GitHub 用戶資訊（HTTP ${resp.status}）`);
  const data: any = await resp.json();
  if (!data.login) throw new Error('GitHub 回應缺少 login 欄位');
  return data.login as string;
}

export async function createRepo(
  owner: string,
  repo: string,
  token: string,
  isPrivate: boolean,
  description: string,
): Promise<void> {
  // 對個人帳號：POST /user/repos
  const resp = await ghFetch('/user/repos', {
    method: 'POST',
    token,
    body: {
      name: repo,
      private: isPrivate,
      auto_init: true,
      description: description || `Created by CubeLV GitHub 上傳助手`,
    },
  });
  if (resp.status === 201) return;
  if (resp.status === 422) {
    throw new Error('倉庫名稱無效或已被使用');
  }
  // 403 通常是 fine-grained token 缺少 Administration 權限
  if (resp.status === 403) {
    let detail = '';
    try {
      const data: any = await resp.json();
      if (data.message) detail = data.message;
    } catch { /* ignore */ }
    throw new Error(
      `建立倉庫失敗（HTTP 403）：${detail || '權限不足'}\n` +
      `如果是 fine-grained token，請到 GitHub 設定補勾「Administration: Read and write」權限後重發。\n` +
      `或改用 classic token 勾 repo 一項即可。`,
    );
  }
  let msg = `建立倉庫失敗（HTTP ${resp.status}）`;
  try {
    const data: any = await resp.json();
    if (data.message) msg = `建立倉庫失敗：${data.message}`;
  } catch { /* ignore */ }
  throw new Error(msg);
}

export async function getFileSha(
  owner: string,
  repo: string,
  path: string,
  token: string,
): Promise<string | null> {
  const resp = await ghFetch(`/repos/${owner}/${repo}/contents/${encodeURI(path)}`, { token });
  if (resp.status === 404) return null;
  if (resp.status !== 200) throw new Error(`取得檔案 SHA 失敗（HTTP ${resp.status}）`);
  const data: any = await resp.json();
  return (data.sha as string) ?? null;
}

export async function uploadSingleFile(
  owner: string,
  repo: string,
  entry: UploadFileEntry,
  message: string,
  token: string,
  onProgress?: (loaded: number, total: number) => void,
): Promise<{ path: string; sha: string }> {
  const contentBase64 = await readFileAsBase64(entry.file, onProgress);
  // 先看既有檔案的 SHA（更新需要）
  const existingSha = await getFileSha(owner, repo, entry.path, token);
  const resp = await ghFetch(`/repos/${owner}/${repo}/contents/${encodeURI(entry.path)}`, {
    method: 'PUT',
    token,
    body: {
      message,
      content: contentBase64,
      ...(existingSha ? { sha: existingSha } : {}),
    },
  });
  if (resp.status !== 200 && resp.status !== 201) {
    let msg = `上傳 ${entry.path} 失敗（HTTP ${resp.status}）`;
    try {
      const data: any = await resp.json();
      if (data.message) msg = `上傳 ${entry.path} 失敗：${data.message}`;
    } catch { /* ignore */ }
    throw new Error(msg);
  }
  const data: any = await resp.json();
  return { path: entry.path, sha: data.content?.sha ?? '' };
}

function readFileAsBase64(file: File, onProgress?: (loaded: number, total: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // result 是 "data:<mime>;base64,XXXX"，取逗號後面那段
      const commaIdx = result.indexOf(',');
      resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
    };
    reader.onerror = () => reject(new Error(`讀取檔案 ${file.name} 失敗`));
    if (onProgress) {
      reader.onprogress = (e) => {
        if (e.lengthComputable) onProgress(e.loaded, e.total);
      };
    }
    reader.readAsDataURL(file);
  });
}

export interface UploadResult {
  repoUrl: string;
  commitSha: string;
  uploadedCount: number;
  failedFiles: { path: string; error: string }[];
  created: boolean;
}

/**
 * 主流程：建立或更新 repo，逐一上傳檔案，回傳結果與最終 commit SHA
 */
export async function uploadToGithub(
  owner: string,
  repo: string,
  token: string,
  files: UploadFileEntry[],
  options: {
    mode: UploadMode;
    isPrivate: boolean;
    commitMessage: string;
    description?: string;
    onProgress?: (p: UploadProgress) => void;
  },
): Promise<UploadResult> {
  const { mode, isPrivate, commitMessage, description, onProgress } = options;

  if (files.length === 0) throw new Error('沒有要上傳的檔案');

  // 1. 檢查 repo 是否存在
  onProgress?.({ current: 0, total: files.length, currentFile: '', status: 'preparing', message: '檢查倉庫狀態...' });
  const exists = await checkRepoExists(owner, repo, token);

  if (!exists && mode === 'update') {
    throw new Error(`倉庫 ${owner}/${repo} 不存在，無法更新。請改用「建立新倉庫」或先建立倉庫。`);
  }

  if (!exists) {
    // 2. 建立新 repo
    onProgress?.({ current: 0, total: files.length, currentFile: '', status: 'creating', message: `建立倉庫 ${owner}/${repo}...` });
    await createRepo(owner, repo, token, isPrivate, description ?? '');
  }

  // 3. 逐一上傳檔案
  const failedFiles: { path: string; error: string }[] = [];
  let lastCommitSha = '';

  for (let i = 0; i < files.length; i++) {
    const entry = files[i];
    onProgress?.({
      current: i,
      total: files.length,
      currentFile: entry.path,
      status: 'uploading',
      message: `上傳 ${i + 1}/${files.length}: ${entry.path}`,
    });
    try {
      const result = await uploadSingleFile(owner, repo, entry, commitMessage, token);
      lastCommitSha = result.sha;
    } catch (e: any) {
      failedFiles.push({ path: entry.path, error: e?.message ?? '未知錯誤' });
    }
  }

  const uploadedCount = files.length - failedFiles.length;
  if (uploadedCount === 0) {
    throw new Error(`所有檔案上傳失敗。第一個錯誤：${failedFiles[0]?.error ?? '未知'}`);
  }

  onProgress?.({
    current: files.length,
    total: files.length,
    currentFile: '',
    status: 'done',
    message: `完成：成功 ${uploadedCount} 個、失敗 ${failedFiles.length} 個`,
  });

  return {
    repoUrl: `https://github.com/${owner}/${repo}`,
    commitSha: lastCommitSha,
    uploadedCount,
    failedFiles,
    created: !exists,
  };
}
