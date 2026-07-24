import type { AnnouncementResponse } from '@marketplace-hub/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildAnnouncementWebUrl,
  buildSignupWebUrl,
  filterAnnouncements,
  PopupController,
  readAnnouncementIdFromWebAppUrl,
  type PopupDependencies,
  type PopupElements,
} from '../src/popup/popup-controller';
import { ApiRequestError } from '../src/lib/api-client';

const firstAnnouncement: AnnouncementResponse = {
  id: 'announcement-1',
  title: 'Mechanical keyboard',
  description: 'Used mechanical keyboard in good condition.',
  price: 7500,
  currency: 'EUR',
  categoryCode: 'electronics',
  condition: 'USED_GOOD',
  quantity: 1,
  status: 'READY',
  channels: [],
  createdAt: '2026-07-12T08:00:00.000Z',
  updatedAt: '2026-07-12T08:00:00.000Z',
};

const secondAnnouncement: AnnouncementResponse = {
  ...firstAnnouncement,
  id: 'announcement-2',
  title: 'Vintage mouse',
  price: 2500,
};

const authSession = {
  accessToken: 'signed-token',
  refreshToken: 'opaque-refresh-token',
  user: { id: 'user-1', email: 'user@example.com' },
};

function createElements(): PopupElements {
  document.body.innerHTML = `
    <input id="api-base-url" />
    <input id="web-app-base-url" />
    <input id="login-email" />
    <input id="login-password" />
    <div id="login-form"></div>
    <button id="logout"></button>
    <p id="auth-status"></p>
    <p id="status"></p>
    <p id="feedback"></p>
    <input id="announcement-search" />
    <select id="announcement-select"></select>
    <section id="actions" hidden></section>
  `;

  return {
    apiBaseUrlInput: document.querySelector<HTMLInputElement>('#api-base-url')!,
    webAppBaseUrlInput: document.querySelector<HTMLInputElement>('#web-app-base-url')!,
    loginEmailInput: document.querySelector<HTMLInputElement>('#login-email')!,
    loginPasswordInput: document.querySelector<HTMLInputElement>('#login-password')!,
    loginForm: document.querySelector<HTMLElement>('#login-form')!,
    logoutButton: document.querySelector<HTMLButtonElement>('#logout')!,
    authStatus: document.querySelector<HTMLParagraphElement>('#auth-status')!,
    status: document.querySelector<HTMLParagraphElement>('#status')!,
    feedback: document.querySelector<HTMLParagraphElement>('#feedback')!,
    announcementSearchInput: document.querySelector<HTMLInputElement>('#announcement-search')!,
    announcementSelect: document.querySelector<HTMLSelectElement>('#announcement-select')!,
    actions: document.querySelector<HTMLElement>('#actions')!,
  };
}

function createDependencies(overrides: Partial<PopupDependencies> = {}): PopupDependencies {
  return {
    getApiBaseUrl: vi.fn().mockResolvedValue('http://localhost:3000/api'),
    setApiBaseUrl: vi.fn().mockResolvedValue(undefined),
    getWebAppBaseUrl: vi.fn().mockResolvedValue('http://localhost:4200'),
    setWebAppBaseUrl: vi.fn().mockResolvedValue(undefined),
    fetchAnnouncements: vi.fn().mockResolvedValue([firstAnnouncement, secondAnnouncement]),
    getAuthSession: vi.fn().mockResolvedValue(authSession),
    setAuthSession: vi.fn().mockResolvedValue(undefined),
    clearAuthSession: vi.fn().mockResolvedValue(undefined),
    login: vi.fn().mockResolvedValue(authSession),
    refreshSession: vi.fn().mockResolvedValue(authSession),
    logout: vi.fn().mockResolvedValue(undefined),
    writeClipboard: vi.fn().mockResolvedValue(undefined),
    fillDemoForm: vi.fn().mockResolvedValue(true),
    openWebApp: vi.fn().mockResolvedValue(undefined),
    getActiveTabUrl: vi.fn().mockResolvedValue(undefined),
    ensureApiOriginPermission: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe('PopupController', () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it('initializes the API URL and renders announcements', async () => {
    const elements = createElements();
    const controller = new PopupController(elements, createDependencies());

    await controller.initialize();

    expect(elements.apiBaseUrlInput.value).toBe('http://localhost:3000/api');
    expect(elements.webAppBaseUrlInput.value).toBe('http://localhost:4200');
    expect(elements.authStatus.textContent).toBe('Connesso come user@example.com');
    expect(elements.loginForm.hidden).toBe(true);
    expect(elements.status.textContent).toBe('2 annunci trovati.');
    expect(elements.announcementSelect.options).toHaveLength(2);
    expect(elements.actions.hidden).toBe(false);
  });

  it('renders an empty state and hides actions', async () => {
    const elements = createElements();
    const controller = new PopupController(
      elements,
      createDependencies({ fetchAnnouncements: vi.fn().mockResolvedValue([]) }),
    );

    await controller.initialize();

    expect(elements.status.textContent).toBe('Nessun annuncio disponibile.');
    expect(elements.actions.hidden).toBe(true);
  });

  it('does not call the announcements API before the user signs in', async () => {
    const elements = createElements();
    const dependencies = createDependencies({
      getAuthSession: vi.fn().mockResolvedValue(null),
    });
    const controller = new PopupController(elements, dependencies);

    await controller.initialize();

    expect(dependencies.fetchAnnouncements).not.toHaveBeenCalled();
    expect(elements.status.textContent).toBe('Accedi per caricare i tuoi annunci.');
    expect(elements.loginForm.hidden).toBe(false);
  });

  it('shows API errors and clears stale announcements', async () => {
    const elements = createElements();
    const fetchAnnouncements = vi
      .fn()
      .mockResolvedValueOnce([firstAnnouncement])
      .mockRejectedValueOnce(new Error('Backend non raggiungibile.'));
    const controller = new PopupController(elements, createDependencies({ fetchAnnouncements }));

    await controller.initialize();
    await controller.loadAnnouncements();

    expect(elements.status.textContent).toBe('Backend non raggiungibile.');
    expect(elements.announcementSelect.options).toHaveLength(0);
    expect(elements.actions.hidden).toBe(true);
  });

  it('preserves the selected announcement during refresh', async () => {
    const elements = createElements();
    const controller = new PopupController(elements, createDependencies());
    await controller.initialize();
    elements.announcementSelect.value = secondAnnouncement.id;

    await controller.loadAnnouncements();

    expect(elements.announcementSelect.value).toBe(secondAnnouncement.id);
  });

  it('filters announcements locally and hides actions when there are no matches', async () => {
    const elements = createElements();
    const controller = new PopupController(elements, createDependencies());
    await controller.initialize();

    controller.setSearchQuery('vintage');

    expect(elements.announcementSelect.options).toHaveLength(1);
    expect(elements.announcementSelect.value).toBe(secondAnnouncement.id);
    expect(elements.status.textContent).toBe('1 di 2 annunci visibili.');
    expect(elements.actions.hidden).toBe(false);

    controller.setSearchQuery('nessun risultato');

    expect(elements.announcementSelect.options).toHaveLength(0);
    expect(elements.status.textContent).toBe('0 di 2 annunci visibili.');
    expect(elements.actions.hidden).toBe(true);
  });

  it('preselects the announcement handed off by the active web app tab', async () => {
    const elements = createElements();
    const controller = new PopupController(
      elements,
      createDependencies({
        getActiveTabUrl: vi
          .fn()
          .mockResolvedValue('http://localhost:4200/?announcementId=announcement-2'),
      }),
    );

    await controller.initialize();

    expect(elements.announcementSelect.value).toBe(secondAnnouncement.id);
  });

  it('copies only after an explicit action and reports success', async () => {
    const elements = createElements();
    const dependencies = createDependencies();
    const controller = new PopupController(elements, dependencies);
    await controller.initialize();

    expect(dependencies.writeClipboard).not.toHaveBeenCalled();
    await controller.copy('title');

    expect(dependencies.writeClipboard).toHaveBeenCalledWith(firstAnnouncement.title);
    expect(elements.feedback.textContent).toBe('Titolo copiato.');
  });

  it('reports clipboard failures without an unhandled rejection', async () => {
    const elements = createElements();
    const controller = new PopupController(
      elements,
      createDependencies({
        writeClipboard: vi.fn().mockRejectedValue(new Error('Appunti non disponibili.')),
      }),
    );
    await controller.initialize();

    await controller.copy('summary');

    expect(elements.feedback.textContent).toBe('Appunti non disponibili.');
  });

  it('saves the standalone API configuration and reloads announcements', async () => {
    const elements = createElements();
    const dependencies = createDependencies();
    const controller = new PopupController(elements, dependencies);
    elements.apiBaseUrlInput.value = 'http://localhost:3100/api';

    await controller.saveApiBaseUrl();

    expect(dependencies.setApiBaseUrl).toHaveBeenCalledWith('http://localhost:3100/api');
    expect(dependencies.ensureApiOriginPermission).toHaveBeenCalledWith(
      'http://localhost:3100/api',
    );
    expect(dependencies.clearAuthSession).toHaveBeenCalled();
    expect(dependencies.fetchAnnouncements).not.toHaveBeenCalled();
    expect(elements.feedback.textContent).toContain('Accedi al nuovo endpoint');
  });

  it('logs in, stores the returned session and loads authenticated announcements', async () => {
    const elements = createElements();
    const dependencies = createDependencies({
      getAuthSession: vi.fn().mockResolvedValue(null),
    });
    const controller = new PopupController(elements, dependencies);
    await controller.initialize();
    elements.loginEmailInput.value = ' user@example.com ';
    elements.loginPasswordInput.value = 'password1234';

    await controller.login();

    expect(dependencies.login).toHaveBeenCalledWith('http://localhost:3000/api', {
      email: 'user@example.com',
      password: 'password1234',
    });
    expect(dependencies.setAuthSession).toHaveBeenCalledWith(authSession);
    expect(dependencies.fetchAnnouncements).toHaveBeenCalledWith(
      'http://localhost:3000/api',
      'signed-token',
    );
    expect(elements.loginPasswordInput.value).toBe('');
    expect(elements.authStatus.textContent).toBe('Connesso come user@example.com');
  });

  it('logs out, clears announcements and never retains the password', async () => {
    const elements = createElements();
    const dependencies = createDependencies();
    const controller = new PopupController(elements, dependencies);
    await controller.initialize();

    await controller.logout();

    expect(dependencies.clearAuthSession).toHaveBeenCalled();
    expect(dependencies.logout).toHaveBeenCalledWith('http://localhost:3000/api', {
      refreshToken: 'opaque-refresh-token',
    });
    expect(elements.announcementSelect.options).toHaveLength(0);
    expect(elements.status.textContent).toBe('Accedi per caricare i tuoi annunci.');
    expect(elements.loginForm.hidden).toBe(false);
  });

  it('opens account registration in the configured web app', async () => {
    const elements = createElements();
    const dependencies = createDependencies();
    const controller = new PopupController(elements, dependencies);

    await controller.openSignupInWebApp();

    expect(dependencies.openWebApp).toHaveBeenCalledWith('http://localhost:4200/signup');
    expect(elements.feedback.textContent).toBe('Registrazione aperta nella web app.');
  });

  it('refreshes an expired access token and retries loading announcements once', async () => {
    const elements = createElements();
    const refreshedSession = {
      ...authSession,
      accessToken: 'rotated-access-token',
      refreshToken: 'rotated-refresh-token',
    };
    const dependencies = createDependencies({
      fetchAnnouncements: vi
        .fn()
        .mockRejectedValueOnce(new ApiRequestError('Sessione non valida.', 401))
        .mockResolvedValueOnce([firstAnnouncement]),
      refreshSession: vi.fn().mockResolvedValue(refreshedSession),
    });
    const controller = new PopupController(elements, dependencies);

    await controller.initialize();

    expect(dependencies.refreshSession).toHaveBeenCalledWith('http://localhost:3000/api', {
      refreshToken: 'opaque-refresh-token',
    });
    expect(dependencies.setAuthSession).toHaveBeenCalledWith(refreshedSession);
    expect(dependencies.fetchAnnouncements).toHaveBeenLastCalledWith(
      'http://localhost:3000/api',
      'rotated-access-token',
    );
    expect(elements.status.textContent).toBe('1 annunci trovati.');
    expect(elements.loginForm.hidden).toBe(true);
  });

  it('shares one refresh request between concurrent expired loads', async () => {
    const elements = createElements();
    const refreshedSession = {
      ...authSession,
      accessToken: 'rotated-access-token',
      refreshToken: 'rotated-refresh-token',
    };
    let resolveRefresh: ((session: typeof refreshedSession) => void) | undefined;
    const refreshPromise = new Promise<typeof refreshedSession>((resolve) => {
      resolveRefresh = resolve;
    });
    const fetchAnnouncements = vi
      .fn()
      .mockResolvedValueOnce([firstAnnouncement])
      .mockRejectedValueOnce(new ApiRequestError('Sessione non valida.', 401))
      .mockRejectedValueOnce(new ApiRequestError('Sessione non valida.', 401))
      .mockResolvedValue([firstAnnouncement]);
    const dependencies = createDependencies({
      fetchAnnouncements,
      refreshSession: vi.fn().mockReturnValue(refreshPromise),
    });
    const controller = new PopupController(elements, dependencies);
    await controller.initialize();

    const firstLoad = controller.loadAnnouncements();
    const secondLoad = controller.loadAnnouncements();
    await vi.waitFor(() => {
      expect(dependencies.refreshSession).toHaveBeenCalledTimes(1);
    });
    resolveRefresh?.(refreshedSession);
    await Promise.all([firstLoad, secondLoad]);

    expect(dependencies.refreshSession).toHaveBeenCalledTimes(1);
    expect(fetchAnnouncements).toHaveBeenCalledTimes(5);
  });

  it('clears an expired session when refresh fails', async () => {
    const elements = createElements();
    const dependencies = createDependencies({
      fetchAnnouncements: vi
        .fn()
        .mockRejectedValue(new ApiRequestError('Sessione non valida.', 401)),
      refreshSession: vi.fn().mockRejectedValue(new Error('Refresh non valido.')),
    });
    const controller = new PopupController(elements, dependencies);

    await controller.initialize();

    expect(dependencies.clearAuthSession).toHaveBeenCalled();
    expect(elements.status.textContent).toBe('Sessione scaduta. Accedi di nuovo.');
    expect(elements.loginForm.hidden).toBe(false);
  });

  it('does not save or contact an API origin when host permission is declined', async () => {
    const elements = createElements();
    const dependencies = createDependencies({
      ensureApiOriginPermission: vi.fn().mockResolvedValue(false),
    });
    const controller = new PopupController(elements, dependencies);
    elements.apiBaseUrlInput.value = 'https://api.marketplace-hub.example/v1';

    await controller.saveApiBaseUrl();

    expect(dependencies.setApiBaseUrl).not.toHaveBeenCalled();
    expect(dependencies.fetchAnnouncements).not.toHaveBeenCalled();
    expect(elements.feedback.textContent).toContain('Permesso non concesso');
  });

  it('fills the controlled demo only after the explicit action', async () => {
    const elements = createElements();
    const dependencies = createDependencies();
    const controller = new PopupController(elements, dependencies);
    await controller.initialize();

    expect(dependencies.fillDemoForm).not.toHaveBeenCalled();
    await controller.fillDemoForm();

    expect(dependencies.fillDemoForm).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FILL_DEMO_FORM' }),
    );
    expect(elements.feedback.textContent).toBe('Form demo compilato.');
  });

  it('opens the selected announcement in the configured web app', async () => {
    const elements = createElements();
    const dependencies = createDependencies();
    const controller = new PopupController(elements, dependencies);
    await controller.initialize();

    await controller.openSelectedInWebApp();

    expect(dependencies.openWebApp).toHaveBeenCalledWith(
      'http://localhost:4200/?announcementId=announcement-1',
    );
    expect(elements.feedback.textContent).toBe('Annuncio aperto nella web app.');
  });

  it('shows guidance when the active tab is not the controlled demo', async () => {
    const elements = createElements();
    const controller = new PopupController(
      elements,
      createDependencies({ fillDemoForm: vi.fn().mockResolvedValue(false) }),
    );
    await controller.initialize();

    await controller.fillDemoForm();

    expect(elements.feedback.textContent).toContain('apri la pagina demo');
  });
});

describe('buildAnnouncementWebUrl', () => {
  it('preserves existing web app parameters and encodes the announcement id', () => {
    expect(buildAnnouncementWebUrl('http://localhost:4200/?mode=compact', 'id with spaces')).toBe(
      'http://localhost:4200/?mode=compact&announcementId=id+with+spaces',
    );
  });

  it('rejects an empty web app URL', () => {
    expect(() => buildAnnouncementWebUrl(' ', 'announcement-1')).toThrow(
      "L'URL della web app non può essere vuoto.",
    );
  });
});

describe('filterAnnouncements', () => {
  it('matches title, description and category without case sensitivity', () => {
    expect(filterAnnouncements([firstAnnouncement, secondAnnouncement], 'VINTAGE')).toEqual([
      secondAnnouncement,
    ]);
    expect(filterAnnouncements([firstAnnouncement], 'good condition')).toEqual([firstAnnouncement]);
    expect(filterAnnouncements([firstAnnouncement], 'ELECTRONICS')).toEqual([firstAnnouncement]);
  });
});

describe('buildSignupWebUrl', () => {
  it('builds the signup route relative to the configured web app path', () => {
    expect(buildSignupWebUrl('https://hub.example/app/?ignored=true#section')).toBe(
      'https://hub.example/app/signup',
    );
  });
});

describe('readAnnouncementIdFromWebAppUrl', () => {
  it('reads context only from the configured web app page', () => {
    expect(
      readAnnouncementIdFromWebAppUrl(
        'http://localhost:4200/?announcementId=announcement-2',
        'http://localhost:4200',
      ),
    ).toBe('announcement-2');
  });

  it('ignores other origins, paths and malformed URLs', () => {
    expect(
      readAnnouncementIdFromWebAppUrl(
        'http://localhost:4300/?announcementId=announcement-2',
        'http://localhost:4200',
      ),
    ).toBeUndefined();
    expect(
      readAnnouncementIdFromWebAppUrl(
        'http://localhost:4200/other?announcementId=announcement-2',
        'http://localhost:4200',
      ),
    ).toBeUndefined();
    expect(readAnnouncementIdFromWebAppUrl('not-a-url', 'http://localhost:4200')).toBeUndefined();
  });
});
