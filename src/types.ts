export interface CleanupTarget {
  path: string;
  type:
    | 'file'
    | 'lockfile'
    | 'config'
    | 'package-scripts'
    | 'app-config'
    | 'git-hook'
    | 'source-file'
    | 'ai-instructions'
    | 'ai-config';
  description: string;
  content?: string;
  autoRemove?: boolean;
}
