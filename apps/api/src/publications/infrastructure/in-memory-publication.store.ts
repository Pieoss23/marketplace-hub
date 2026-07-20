import type { Publication } from '@marketplace-hub/domain';
import type { PublicationStore } from '../application/publication-store';

export class InMemoryPublicationStore implements PublicationStore {
  private readonly publications = new Map<string, Publication>();
  private readonly histories = new Map<string, Publication[]>();

  save(publication: Publication): Promise<void> {
    const snapshot = { ...publication };
    this.publications.set(publication.id, snapshot);

    const history = this.histories.get(publication.id) ?? [];
    history.push(snapshot);
    this.histories.set(publication.id, history);

    return Promise.resolve();
  }

  findById(id: string): Publication | undefined {
    return this.publications.get(id);
  }

  getHistory(id: string): readonly Publication[] {
    return this.histories.get(id) ?? [];
  }
}
