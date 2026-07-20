import type { Publication } from '@marketplace-hub/domain';

export interface PublicationStore {
  save(publication: Publication): Promise<void>;
}
