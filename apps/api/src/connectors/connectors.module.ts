import { Module } from '@nestjs/common';
import { MockConnector } from './mock/mock.connector';

@Module({
  providers: [MockConnector],
  exports: [MockConnector],
})
export class ConnectorsModule {}
