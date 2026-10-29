import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { EventsGateway } from './events.gateway';
import { jwtModuleOptions } from '@core/config/jwt.config';

@Global()
@Module({
  imports: [JwtModule.registerAsync(jwtModuleOptions)],
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class EventsModule {}
