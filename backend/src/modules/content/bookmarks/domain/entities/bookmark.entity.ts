export class Bookmark {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public title: string,
    public readonly bookmarkURL: string,
    public description: string,
    public logoURL: string,
    public tags: string[],
    public isFavorite: boolean,
    public folderId: string | null,
    public author: string,
    public comments: string[],
    public content: string | null,
    public isArticle: boolean,
    public isDeadLink: boolean,
    public lastCheckedAt: Date | null,
  ) {}

  isScraped(): boolean {
    return (
      this.title !== 'Scraping...' &&
      this.description !== 'Extracting metadata...'
    );
  }

  markAsFavorite(): void {
    this.isFavorite = true;
  }

  unmarkAsFavorite(): void {
    this.isFavorite = false;
  }
}
