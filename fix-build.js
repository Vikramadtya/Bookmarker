const fs = require("fs");

// 1. Revert BookmarksService
const bService =
  "backend/src/modules/content/bookmarks/application/services/bookmarks.service.ts";
let bsContent = fs.readFileSync(bService, "utf8");
bsContent = bsContent.replace(
  /async bulkMove\(userId: string, ids: string\[\], folderId: string\) \{\n    if \(folderId && folderId !== 'root' && folderId !== 'favorites'\) \{\n      const folder = await this\.foldersService\.getFolderById\(userId, folderId\);\n      if \(!folder\) throw new NotFoundException\('Target folder not found'\);\n    \}\n    await this\.bookmarksRepository\.bulkMove\(userId, ids, folderId\);\n  \}/g,
  `async bulkMove(userId: string, ids: string[], folderId: string) {
    await this.bookmarksRepository.bulkMove(userId, ids, folderId);
  }`
);
fs.writeFileSync(bService, bsContent);

// 2. Add check to BookmarksController
const bController =
  "backend/src/modules/content/bookmarks/presentation/http/bookmarks.controller.ts";
let bcContent = fs.readFileSync(bController, "utf8");
bcContent = bcContent.replace(
  /async bulkMove\(\n    @CurrentUser\('email'\) userId: string,\n    @Body\(\) body: BulkMoveDto,\n  \) \{\n    await this\.bookmarksService\.bulkMove\(userId, body\.ids, body\.folderId\);\n  \}/g,
  `async bulkMove(
    @CurrentUser('email') userId: string,
    @Body() body: BulkMoveDto,
  ) {
    if (body.folderId && body.folderId !== 'root' && body.folderId !== 'favorites') {
      await this.foldersService.getFolderById(userId, body.folderId);
    }
    await this.bookmarksService.bulkMove(userId, body.ids, body.folderId);
  }`
);
fs.writeFileSync(bController, bcContent);

// 3. Fix settings.service.ts error
const sService = "backend/src/modules/identity/settings/settings.service.ts";
let ssContent = fs.readFileSync(sService, "utf8");
ssContent = ssContent.replace(
  /\/\/ Optimized deletion\n    try \{\n      await this\.foldersService\['foldersRepository'\]\.deleteByFolderId\(userId, 'does-not-matter-because-we-will-add-deleteMany'\);\n    \} catch\(e\) \{\}\n    \/\/ The proper way without exposing repo:\n    \/\/ We will just leave it if it's too risky to change repo surface, but we can do Promise\.all\n    await Promise\.allSettled\(folders\.map\(f => this\.foldersService\.deleteFolder\(userId, f\.id\)\)\);/g,
  `await Promise.allSettled(folders.map(f => this.foldersService.deleteFolder(userId, f.id)));`
);
fs.writeFileSync(sService, ssContent);
