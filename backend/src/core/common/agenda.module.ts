import {
  Global,
  Inject,
  Injectable,
  Module,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Agenda } from 'agenda';
import { MongoBackend } from '@agendajs/mongo-backend';
import { getMongoUri } from '@core/config/app.config';

@Injectable()
class AgendaShutdown implements OnApplicationShutdown {
  constructor(@Inject('AGENDA') private readonly agenda: Agenda) {}

  async onApplicationShutdown() {
    await this.agenda.stop(); // releases job locks so another instance can pick them up
  }
}

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'AGENDA',
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new Agenda({
          backend: new MongoBackend({ address: getMongoUri(config) }),
          processEvery: '10 seconds',
        }),
    },
    AgendaShutdown,
  ],
  exports: ['AGENDA'],
})
export class AgendaModule {}
