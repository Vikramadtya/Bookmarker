import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { CurrentUser } from '@core/common/decorators/current-user.decorator';
import { AdminGuard } from './admin.guard';
import { CouponsService } from './coupons.service';

class CreateCouponDto {
  @IsIn(['access', 'discount'])
  type: 'access' | 'discount';

  /** Leave out to generate one. */
  @IsOptional()
  @IsString()
  @MaxLength(40)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;

  /** The code can be used from this moment... */
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsDateString()
  startsAt?: string | null;

  /** ...until this one. */
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsDateString()
  expiresAt?: string | null;

  /** How many times it can be used in total; omit for unlimited. */
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  maxRedemptions?: number | null;

  /** access: days of Pro it grants. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3650)
  accessDays?: number;

  /** access: Pro for life instead of a number of days. */
  @IsOptional()
  @IsBoolean()
  lifetime?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  percentOff?: number;

  /** discount: fixed amount off, in the smallest currency unit (cents). */
  @IsOptional()
  @IsInt()
  @Min(1)
  amountOff?: number;

  @IsOptional()
  @IsIn(['once', 'repeating', 'forever'])
  duration?: 'once' | 'repeating' | 'forever';

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(36)
  durationMonths?: number;
}

class UpdateCouponDto {
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;

  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsDateString()
  startsAt?: string | null;

  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsDateString()
  expiresAt?: string | null;

  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsInt()
  @Min(1)
  maxRedemptions?: number | null;
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), AdminGuard)
@Controller('api/v1/admin/coupons')
export class AdminController {
  constructor(private readonly coupons: CouponsService) {}

  @Get()
  @ApiOperation({ summary: 'All access and discount codes' })
  list() {
    return this.coupons.list();
  }

  @Post()
  @ApiOperation({ summary: 'Create an access or discount code' })
  create(@CurrentUser('email') admin: string, @Body() dto: CreateCouponDto) {
    return this.coupons.create(admin, dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Switch a code on or off, or change its dates and limit',
  })
  update(@Param('id') id: string, @Body() dto: UpdateCouponDto) {
    return this.coupons.update(id, dto);
  }

  @Get(':id/redemptions')
  @ApiOperation({ summary: 'Who used a code' })
  redemptions(@Param('id') id: string) {
    return this.coupons.redemptionsFor(id);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a code that has never been used' })
  remove(@Param('id') id: string) {
    return this.coupons.remove(id);
  }
}
