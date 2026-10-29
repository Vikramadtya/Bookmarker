import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './infrastructure/persistence/user.schema';
import { UserMongooseRepository } from './infrastructure/persistence/user.mongoose.repository';
import { UsersService } from './application/services/users.service';
import { UsersController } from './presentation/http/users.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [UsersController],
  providers: [
    UsersService,
    {
      provide: 'IUserRepository',
      useClass: UserMongooseRepository,
    },
  ],
  exports: [UsersService, 'IUserRepository'],
})
export class UsersModule {}
