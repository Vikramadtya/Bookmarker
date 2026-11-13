import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { CurrentUser } from '@core/common/decorators/current-user.decorator';
import { SORTS } from '@content/bookmarks/presentation/http/dto/list-bookmarks.dto';
import { SavedView } from './saved-view.schema';

const MAX_VIEWS = 50;

class ViewDto {
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name: string;

  @IsString()
  @MaxLength(500)
  q: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  folderId?: string;

  @IsOptional()
  @IsIn(SORTS)
  sort?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  icon?: string;
}

const present = (v: any) => ({
  id: v._id,
  name: v.name,
  q: v.q,
  folderId: v.folderId ?? null,
  sort: v.sort ?? null,
  icon: v.icon ?? '',
});

@ApiTags('views')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('api/v1/views')
export class ViewsController {
  constructor(
    @InjectModel(SavedView.name) private readonly model: Model<SavedView>,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List saved views (smart collections)' })
  async list(@CurrentUser('email') userId: string) {
    const views = await this.model
      .find({ userId })
      .sort({ createdAt: 1 })
      .lean()
      .exec();
    return views.map(present);
  }

  @Post()
  @ApiOperation({ summary: 'Save a search as a view' })
  async create(@CurrentUser('email') userId: string, @Body() dto: ViewDto) {
    if ((await this.model.countDocuments({ userId })) >= MAX_VIEWS)
      throw new BadRequestException(`You can save up to ${MAX_VIEWS} views`);
    const view = await this.model.create({ ...dto, userId } as any);
    return present(view.toObject());
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a saved view' })
  async update(
    @CurrentUser('email') userId: string,
    @Param('id') id: string,
    @Body() dto: ViewDto,
  ) {
    const view = await this.model
      .findOneAndUpdate(
        { _id: id, userId },
        { $set: dto },
        { returnDocument: 'after' },
      )
      .lean()
      .exec();
    if (!view) throw new NotFoundException('View not found');
    return present(view);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a saved view' })
  async remove(@CurrentUser('email') userId: string, @Param('id') id: string) {
    const result = await this.model.deleteOne({ _id: id, userId }).exec();
    if (result.deletedCount === 0)
      throw new NotFoundException('View not found');
  }
}
