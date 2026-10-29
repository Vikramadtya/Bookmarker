export interface Folder {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  userId: string;
  isPublic: boolean;
  isHidden: boolean;
  isLocked: boolean;
  isInbox: boolean;
  passwordHash: string | null;
}

/** Folder as sent to clients: never includes the password hash. */
export type FolderView = Omit<Folder, 'passwordHash'>;

export function toFolderView({
  passwordHash: _hash,
  ...view
}: Folder): FolderView {
  return view;
}
