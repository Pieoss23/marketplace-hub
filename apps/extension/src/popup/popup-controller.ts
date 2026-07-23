import type {
  AnnouncementResponse,
  AuthResponse,
  LoginRequest,
} from '@marketplace-hub/contracts';

import { ApiRequestError } from '../lib/api-client';
import { buildFillMessage, type FillDemoFormMessage } from '../lib/fill-message';
import { buildSummary, formatPriceEuros } from '../lib/format';

export interface PopupElements {
  readonly apiBaseUrlInput: HTMLInputElement;
  readonly webAppBaseUrlInput: HTMLInputElement;
  readonly loginEmailInput: HTMLInputElement;
  readonly loginPasswordInput: HTMLInputElement;
  readonly loginForm: HTMLElement;
  readonly logoutButton: HTMLButtonElement;
  readonly authStatus: HTMLParagraphElement;
  readonly status: HTMLParagraphElement;
  readonly feedback: HTMLParagraphElement;
  readonly announcementSelect: HTMLSelectElement;
  readonly actions: HTMLElement;
}

export interface PopupDependencies {
  readonly getApiBaseUrl: () => Promise<string>;
  readonly setApiBaseUrl: (url: string) => Promise<void>;
  readonly getWebAppBaseUrl: () => Promise<string>;
  readonly setWebAppBaseUrl: (url: string) => Promise<void>;
  readonly fetchAnnouncements: (
    apiBaseUrl: string,
    accessToken: string,
  ) => Promise<AnnouncementResponse[]>;
  readonly getAuthSession: () => Promise<AuthResponse | null>;
  readonly setAuthSession: (session: AuthResponse) => Promise<void>;
  readonly clearAuthSession: () => Promise<void>;
  readonly login: (apiBaseUrl: string, request: LoginRequest) => Promise<AuthResponse>;
  readonly writeClipboard: (text: string) => Promise<void>;
  readonly fillDemoForm: (message: FillDemoFormMessage) => Promise<boolean>;
  readonly openWebApp: (url: string) => Promise<void>;
  readonly getActiveTabUrl: () => Promise<string | undefined>;
  readonly ensureApiOriginPermission: (apiBaseUrl: string) => Promise<boolean>;
}

export type CopyTarget = 'title' | 'description' | 'price' | 'summary';

const COPY_FEEDBACK: Readonly<Record<CopyTarget, string>> = {
  title: 'Titolo copiato.',
  description: 'Descrizione copiata.',
  price: 'Prezzo copiato.',
  summary: 'Riepilogo copiato.',
};

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim().length > 0 ? error.message : fallback;
}

export class PopupController {
  private announcements: readonly AnnouncementResponse[] = [];
  private authSession: AuthResponse | null = null;

  constructor(
    private readonly elements: PopupElements,
    private readonly dependencies: PopupDependencies,
  ) {}

  async initialize(): Promise<void> {
    let preferredAnnouncementId: string | undefined;
    try {
      const [apiBaseUrl, webAppBaseUrl, activeTabUrl, authSession] = await Promise.all([
        this.dependencies.getApiBaseUrl(),
        this.dependencies.getWebAppBaseUrl(),
        this.dependencies.getActiveTabUrl(),
        this.dependencies.getAuthSession(),
      ]);
      this.elements.apiBaseUrlInput.value = apiBaseUrl;
      this.elements.webAppBaseUrlInput.value = webAppBaseUrl;
      preferredAnnouncementId = activeTabUrl
        ? readAnnouncementIdFromWebAppUrl(activeTabUrl, webAppBaseUrl)
        : undefined;
      this.authSession = authSession;
      this.renderAuthSession();
    } catch (error) {
      this.elements.feedback.textContent = errorMessage(
        error,
        "Impossibile leggere la configurazione dell'API.",
      );
    }
    await this.loadAnnouncements(preferredAnnouncementId);
  }

  async loadAnnouncements(preferredSelection?: string): Promise<void> {
    const selection = preferredSelection ?? this.elements.announcementSelect.value;
    this.elements.feedback.textContent = '';
    if (!this.authSession) {
      this.announcements = [];
      this.renderAnnouncements();
      this.elements.status.textContent = 'Accedi per caricare i tuoi annunci.';
      return;
    }
    this.elements.status.textContent = 'Caricamento…';

    try {
      const apiBaseUrl = await this.dependencies.getApiBaseUrl();
      this.announcements = await this.dependencies.fetchAnnouncements(
        apiBaseUrl,
        this.authSession.accessToken,
      );
      this.renderAnnouncements(selection);
      this.elements.status.textContent =
        this.announcements.length === 0
          ? 'Nessun annuncio disponibile.'
          : `${this.announcements.length} annunci trovati.`;
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 401) {
        await this.expireSession();
        this.elements.status.textContent = 'Sessione scaduta. Accedi di nuovo.';
        return;
      }
      this.announcements = [];
      this.renderAnnouncements();
      this.elements.status.textContent = errorMessage(error, 'Errore imprevisto.');
    }
  }

  async saveApiBaseUrl(): Promise<void> {
    try {
      const granted = await this.dependencies.ensureApiOriginPermission(
        this.elements.apiBaseUrlInput.value,
      );
      if (!granted) {
        this.elements.feedback.textContent =
          "Permesso non concesso: l'estensione non può contattare questa origine API.";
        return;
      }
      await this.dependencies.setApiBaseUrl(this.elements.apiBaseUrlInput.value);
      await this.expireSession();
      this.elements.feedback.textContent = 'URL API salvato. Accedi al nuovo endpoint.';
    } catch (error) {
      this.elements.feedback.textContent = errorMessage(
        error,
        "Impossibile salvare la configurazione dell'API.",
      );
    }
  }

  async login(): Promise<void> {
    const email = this.elements.loginEmailInput.value.trim();
    const password = this.elements.loginPasswordInput.value;
    if (!email || !password) {
      this.elements.feedback.textContent = 'Inserisci email e password.';
      return;
    }

    try {
      const apiBaseUrl = await this.dependencies.getApiBaseUrl();
      const session = await this.dependencies.login(apiBaseUrl, { email, password });
      await this.dependencies.setAuthSession(session);
      this.authSession = session;
      this.elements.loginPasswordInput.value = '';
      this.renderAuthSession();
      this.elements.feedback.textContent = 'Accesso effettuato.';
      await this.loadAnnouncements();
    } catch (error) {
      this.elements.feedback.textContent = errorMessage(error, 'Accesso non riuscito.');
    }
  }

  async logout(): Promise<void> {
    await this.expireSession();
    this.elements.feedback.textContent = 'Sessione terminata.';
    this.elements.status.textContent = 'Accedi per caricare i tuoi annunci.';
  }

  async openSignupInWebApp(): Promise<void> {
    try {
      const webAppBaseUrl = await this.dependencies.getWebAppBaseUrl();
      await this.dependencies.openWebApp(buildSignupWebUrl(webAppBaseUrl));
      this.elements.feedback.textContent = 'Registrazione aperta nella web app.';
    } catch (error) {
      this.elements.feedback.textContent = errorMessage(
        error,
        'Impossibile aprire la registrazione nella web app.',
      );
    }
  }

  async saveWebAppBaseUrl(): Promise<void> {
    try {
      await this.dependencies.setWebAppBaseUrl(this.elements.webAppBaseUrlInput.value);
      this.elements.feedback.textContent = 'URL web app salvato.';
    } catch (error) {
      this.elements.feedback.textContent = errorMessage(
        error,
        "Impossibile salvare la configurazione della web app.",
      );
    }
  }

  async copy(target: CopyTarget): Promise<void> {
    const announcement = this.selectedAnnouncement();
    if (!announcement) {
      this.elements.feedback.textContent = 'Seleziona un annuncio da copiare.';
      return;
    }

    const values: Readonly<Record<CopyTarget, string>> = {
      title: announcement.title,
      description: announcement.description,
      price: formatPriceEuros(announcement.price, announcement.currency),
      summary: buildSummary(announcement),
    };

    try {
      await this.dependencies.writeClipboard(values[target]);
      this.elements.feedback.textContent = COPY_FEEDBACK[target];
    } catch (error) {
      this.elements.feedback.textContent = errorMessage(
        error,
        'Impossibile copiare il contenuto negli appunti.',
      );
    }
  }

  async fillDemoForm(): Promise<void> {
    const announcement = this.selectedAnnouncement();
    if (!announcement) {
      this.elements.feedback.textContent = 'Seleziona un annuncio da usare.';
      return;
    }

    try {
      const applied = await this.dependencies.fillDemoForm(buildFillMessage(announcement));
      this.elements.feedback.textContent = applied
        ? 'Form demo compilato.'
        : 'Impossibile compilare il form: apri la pagina demo del progetto nella scheda attiva.';
    } catch (error) {
      this.elements.feedback.textContent = errorMessage(
        error,
        'Impossibile comunicare con la pagina demo.',
      );
    }
  }

  async openSelectedInWebApp(): Promise<void> {
    const announcement = this.selectedAnnouncement();
    if (!announcement) {
      this.elements.feedback.textContent = 'Seleziona un annuncio da aprire.';
      return;
    }

    try {
      const webAppBaseUrl = await this.dependencies.getWebAppBaseUrl();
      const url = buildAnnouncementWebUrl(webAppBaseUrl, announcement.id);
      await this.dependencies.openWebApp(url);
      this.elements.feedback.textContent = 'Annuncio aperto nella web app.';
    } catch (error) {
      this.elements.feedback.textContent = errorMessage(
        error,
        'Impossibile aprire la web app.',
      );
    }
  }

  private selectedAnnouncement(): AnnouncementResponse | undefined {
    const selectedId = this.elements.announcementSelect.value;
    return this.announcements.find(({ id }) => id === selectedId);
  }

  private renderAnnouncements(preferredSelection?: string): void {
    this.elements.announcementSelect.replaceChildren();

    for (const announcement of this.announcements) {
      const option = document.createElement('option');
      option.value = announcement.id;
      option.textContent = `${announcement.title} — ${formatPriceEuros(
        announcement.price,
        announcement.currency,
      )}`;
      this.elements.announcementSelect.append(option);
    }

    if (
      preferredSelection &&
      this.announcements.some((announcement) => announcement.id === preferredSelection)
    ) {
      this.elements.announcementSelect.value = preferredSelection;
    }

    this.elements.actions.hidden = this.announcements.length === 0;
  }

  private renderAuthSession(): void {
    const authenticated = this.authSession !== null;
    this.elements.loginForm.hidden = authenticated;
    this.elements.logoutButton.hidden = !authenticated;
    this.elements.authStatus.textContent = this.authSession
      ? `Connesso come ${this.authSession.user.email}`
      : 'Non autenticato';
  }

  private async expireSession(): Promise<void> {
    this.authSession = null;
    await this.dependencies.clearAuthSession();
    this.announcements = [];
    this.renderAnnouncements();
    this.renderAuthSession();
  }
}

export function buildAnnouncementWebUrl(webAppBaseUrl: string, announcementId: string): string {
  const normalizedBaseUrl = webAppBaseUrl.trim();
  if (normalizedBaseUrl.length === 0) {
    throw new Error("L'URL della web app non può essere vuoto.");
  }

  const url = new URL(normalizedBaseUrl);
  url.searchParams.set('announcementId', announcementId);
  return url.toString();
}

export function buildSignupWebUrl(webAppBaseUrl: string): string {
  const url = new URL(webAppBaseUrl.trim());
  const basePath = url.pathname.replace(/\/+$/, '');
  url.pathname = `${basePath}/signup`;
  url.search = '';
  url.hash = '';
  return url.toString();
}

export function readAnnouncementIdFromWebAppUrl(
  activeTabUrl: string,
  webAppBaseUrl: string,
): string | undefined {
  try {
    const activeUrl = new URL(activeTabUrl);
    const configuredUrl = new URL(webAppBaseUrl);
    const configuredPath = configuredUrl.pathname.replace(/\/+$/, '') || '/';
    const activePath = activeUrl.pathname.replace(/\/+$/, '') || '/';

    if (activeUrl.origin !== configuredUrl.origin || activePath !== configuredPath) {
      return undefined;
    }

    const announcementId = activeUrl.searchParams.get('announcementId')?.trim();
    return announcementId || undefined;
  } catch {
    return undefined;
  }
}
