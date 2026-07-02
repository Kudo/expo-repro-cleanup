export interface CleanupOptions {
  /** When true (the default), prompt before each change. CI or `--yes` sets this false. */
  interactive: boolean;
  /** When false (`--no-prebuild`), never run `expo prebuild --clean`. */
  prebuild: boolean;
}

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
