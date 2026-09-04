import { BaseItem, itemType } from '@cubelv/sdk';

@itemType('GITHUB_UPLOAD_VIRTUAL_FOLDER', 'GitHub 上傳助手入口')
export class GithubUploadVirtualFolder extends BaseItem {}

@itemType('GITHUB_UPLOAD_RECORD_FOLDER', 'GitHub 上傳紀錄資料夾', { defaultFolder: 'GitHub 上傳紀錄' })
export class GithubUploadRecordFolder extends BaseItem {}

@itemType('GITHUB_UPLOAD_RECORD', 'GitHub 上傳紀錄')
export class GithubUploadRecord extends BaseItem {
  /** GitHub 帳號 */
  repoOwner: string = '';
  /** 倉庫名稱 */
  repoName: string = '';
  /** 倉庫 URL */
  repoUrl: string = '';
  /** 是否私人 */
  isPrivate: boolean = false;
  /** Commit SHA */
  commitSha: string = '';
  /** Commit Message */
  commitMessage: string = '';
  /** 成功上傳檔案數 */
  fileCount: number = 0;
  /** 失敗檔案名稱清單（JSON 陣列字串） */
  failedFiles: string = '';
  /** 上傳狀態：success / partial / failed */
  status: string = 'success';
  /** 失敗時的錯誤訊息 */
  errorMessage: string = '';
}
