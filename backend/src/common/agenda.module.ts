import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Agenda } from 'agenda';

import { MongoBackend } from '@agendajs/mongo-backend';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'AGENDA',
      useFactory: (config: ConfigService) => {
        return new Agenda({
          backend: new MongoBackend({
            address: config.get<string>(
              'MONGODB_URI',
              'mongodb://localhost:27017/bookmarker',
            ),
          }),
          processEvery: '10 seconds', // Check for jobs every 10 seconds
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: ['AGENDA'],
})
export class AgendaModule {}
