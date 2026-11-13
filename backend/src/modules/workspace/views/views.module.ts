import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SavedView, SavedViewSchema } from './saved-view.schema';
import { ViewsController } from './views.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SavedView.name, schema: SavedViewSchema },
    ]),
  ],
  controllers: [ViewsController],
})
export class ViewsModule {}
