import { Plugin, plugin, View, useItemsByType } from '@cubelv/sdk';
import {
  GithubUploadVirtualFolder,
  GithubUploadRecordFolder,
  GithubUploadRecord,
} from './schemas/uploadRecordSchema';
import { UploadLeafView } from './views/UploadView';
import { HistoryLeafView } from './views/HistoryView';
import { GithubUploadRecordItem } from './components/GithubUploadRecordItem';

class UploadMainLeafView extends View {
  getViewType() { return 'github-upload-main'; }
  getDisplayText() { return 'GitHub 上傳助手'; }
  renderComponent() { return <UploadLeafView />; }
}

class HistoryListLeafView extends View {
  getViewType() { return 'github-upload-history'; }
  getDisplayText() { return '上傳紀錄'; }
  renderComponent() { return <HistoryLeafView />; }
}

function useSidebarData() {
  const folders = useItemsByType('GITHUB_UPLOAD_RECORD_FOLDER');
  return { items: folders, renderIcon: () => 'cloud-upload' };
}

const MAIN_VIEWS = [{ type: 'github-upload-main', creator: (leaf: any) => new UploadMainLeafView(leaf) }];
const HISTORY_VIEWS = [{ type: 'github-upload-history', creator: (leaf: any) => new HistoryListLeafView(leaf) }];

@plugin('ce0cb260db47d568e409931f', {
  description: '選擇本機檔案或資料夾，輸入 GitHub 帳號、PAT、倉庫名稱，一鍵自動建立並上傳到 GitHub',
})
export class GithubUploadPlugin extends Plugin {
  onload() {
    this.registerPluginRoot('githubUpload');

    this.registerSection({
      id: 'github-upload',
      title: 'GitHub 上傳',
      orderAt: 720,
      useData: useSidebarData,
    });

    this.registerVirtualFolderType(GithubUploadVirtualFolder, {
      icon: 'cloud-upload',
      useDisplayName: () => 'GitHub 上傳助手',
      views: MAIN_VIEWS,
      panes: { centerPane2: { leafId: 'leaf-github-main', viewType: 'github-upload-main', flex: 1 } },
    });

    this.registerFolderType(GithubUploadRecordFolder, {
      folderIcon: 'cloud-upload',
      views: HISTORY_VIEWS,
      panes: {
        centerPane2: { leafId: 'leaf-github-history', viewType: 'github-upload-history', flex: 1 },
      },
      children: [
        {
          class: GithubUploadRecord,
          icon: 'cloud-upload',
          displayText: (item: any) => `${item.repoOwner}/${item.repoName} (${item.fileCount ?? 0} 檔)`,
          embedView: {
            row: {
              component: GithubUploadRecordItem,
              description: '單列上傳紀錄：倉庫、狀態與檔案數',
            },
          },
          sampleItems: [
            {
              name: 'octocat/my-repo - 範例',
              repoOwner: 'octocat',
              repoName: 'my-repo',
              repoUrl: 'https://github.com/octocat/my-repo',
              isPrivate: true,
              commitSha: 'abc123',
              commitMessage: 'Initial upload via CubeLV',
              fileCount: 12,
              failedFiles: '[]',
              status: 'success',
              errorMessage: '',
            },
          ],
          aiUsageHint: '使用者要查看過去的 GitHub 上傳紀錄時用',
        },
      ],
    });
  }
}
