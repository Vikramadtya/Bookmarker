import { Controller, Put, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';
import { UsersService } from '../../application/services/users.service';
import { CurrentUser } from '@core/common/decorators/current-user.decorator';

class UpdateUsernameDto {
  // Format is checked in the service so it can return a precise message.
  @IsString()
  @MaxLength(30)
  username: string;
}

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('api/v1/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Put('me/username')
  @ApiOperation({ summary: 'Update current user username' })
  updateUsername(
    @CurrentUser('id') userId: string,
    @Body() body: UpdateUsernameDto,
  ) {
    return this.usersService.updateUsername(userId, body.username);
  }
}
