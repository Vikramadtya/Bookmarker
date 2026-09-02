export class Folder {
  constructor(
    public readonly id: string,
    public name: string,
    public slug: string,
    public parentId: string | null,
    public readonly userId: string,
    public isPublic: boolean,
    public isHidden: boolean,
    public isLocked: boolean,
    public passwordHash: string | null,
  ) {}

  lock(hash: string): void {
    this.isLocked = true;
    this.passwordHash = hash;
  }

  unlock(): void {
    this.isLocked = false;
    this.passwordHash = null;
  }

  rename(newName: string, newSlug: string): void {
    this.name = newName;
    this.slug = newSlug;
  }
}
