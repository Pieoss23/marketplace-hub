export interface MockConnectorConfiguration {
  readonly category: string;
}

export interface MockConnectorPayload {
  readonly category: string;
  readonly title: string;
  readonly description: string;
  readonly price: {
    readonly amountMinor: number;
    readonly currency: string;
  };
  readonly imageUrls: readonly string[];
}
