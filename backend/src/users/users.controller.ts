import { Controller, Put, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

class UpdateUsernameDto {
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
  @ApiBody({ type: UpdateUsernameDto })
  async updateUsername(
    @CurrentUser('id') userId: string,
    @Body() body: UpdateUsernameDto,
  ) {
    return this.usersService.updateUsername(userId, body.username);
  }
}
