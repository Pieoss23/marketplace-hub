import { Injectable } from '@nestjs/common';
import type { AnnouncementChannelConnector } from './announcement-channel-connector';
import { MockChannelConnector } from './mock-channel.connector';

@Injectable()
export class ConnectorRegistry {
  private readonly connectors: ReadonlyMap<string, AnnouncementChannelConnector>;

  constructor(mockChannelConnector: MockChannelConnector) {
    this.connectors = new Map([[mockChannelConnector.connectorCode, mockChannelConnector]]);
  }

  get(connectorCode: string): AnnouncementChannelConnector | undefined {
    return this.connectors.get(connectorCode);
  }
}
