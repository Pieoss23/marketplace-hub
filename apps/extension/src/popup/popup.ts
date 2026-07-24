import { fetchAnnouncements } from '../lib/api-client';
import { login, logout, refreshSession } from '../lib/auth-client';
import {
  clearAuthSession,
  getApiBaseUrl,
  getAuthSession,
  getWebAppBaseUrl,
  setApiBaseUrl,
  setAuthSession,
  setWebAppBaseUrl,
} from '../lib/config';
import type { FillDemoFormMessage, FillDemoFormResponse } from '../lib/fill-message';
import { buildApiOriginPermission } from '../lib/host-permission';
import {
  PopupController,
  type CopyTarget,
  type PopupDependencies,
  type PopupElements,
} from './popup-controller';

function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Elemento richiesto non trovato: ${selector}`);
  }
  return element;
}

function sendFillDemoFormMessage(message: FillDemoFormMessage): Promise<FillDemoFormResponse> {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const queryError = chrome.runtime.lastError;
      if (queryError) {
        reject(new Error(queryError.message));
        return;
      }

      const tabId = tabs[0]?.id;
      if (tabId === undefined) {
        resolve({ applied: false, matchedFields: [] });
        return;
      }

      chrome.tabs.sendMessage(tabId, message, (response: FillDemoFormResponse | undefined) => {
        const sendError = chrome.runtime.lastError;
        if (sendError) {
          resolve({ applied: false, matchedFields: [] });
          return;
        }
        resolve(response ?? { applied: false, matchedFields: [] });
      });
    });
  });
}

function getActiveTabUrl(): Promise<string | undefined> {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        resolve(undefined);
        return;
      }
      resolve(tabs[0]?.url);
    });
  });
}

function ensureApiOriginPermission(apiBaseUrl: string): Promise<boolean> {
  const origin = buildApiOriginPermission(apiBaseUrl);
  return new Promise((resolve, reject) => {
    chrome.permissions.contains({ origins: [origin] }, (alreadyGranted) => {
      const containsError = chrome.runtime.lastError;
      if (containsError) {
        reject(new Error(containsError.message));
        return;
      }
      if (alreadyGranted) {
        resolve(true);
        return;
      }

      chrome.permissions.request({ origins: [origin] }, (granted) => {
        const requestError = chrome.runtime.lastError;
        if (requestError) {
          reject(new Error(requestError.message));
          return;
        }
        resolve(granted);
      });
    });
  });
}

const elements: PopupElements = {
  apiBaseUrlInput: requiredElement<HTMLInputElement>('#api-base-url'),
  webAppBaseUrlInput: requiredElement<HTMLInputElement>('#web-app-base-url'),
  loginEmailInput: requiredElement<HTMLInputElement>('#login-email'),
  loginPasswordInput: requiredElement<HTMLInputElement>('#login-password'),
  loginForm: requiredElement<HTMLElement>('#login-form'),
  logoutButton: requiredElement<HTMLButtonElement>('#logout'),
  authStatus: requiredElement<HTMLParagraphElement>('#auth-status'),
  status: requiredElement<HTMLParagraphElement>('#status'),
  feedback: requiredElement<HTMLParagraphElement>('#feedback'),
  announcementSearchInput: requiredElement<HTMLInputElement>('#announcement-search'),
  announcementSelect: requiredElement<HTMLSelectElement>('#announcement-select'),
  actions: requiredElement<HTMLElement>('#actions'),
};

const dependencies: PopupDependencies = {
  getApiBaseUrl,
  setApiBaseUrl,
  getWebAppBaseUrl,
  setWebAppBaseUrl,
  fetchAnnouncements,
  getAuthSession,
  setAuthSession,
  clearAuthSession,
  login,
  refreshSession,
  logout,
  writeClipboard: (text) => navigator.clipboard.writeText(text),
  fillDemoForm: sendFillDemoFormMessage,
  openWebApp: (url) =>
    new Promise((resolve) => {
      chrome.tabs.create({ url }, () => resolve());
    }),
  getActiveTabUrl,
  ensureApiOriginPermission,
};

const controller = new PopupController(elements, dependencies);

requiredElement<HTMLButtonElement>('#save-api-base-url').addEventListener('click', () => {
  void controller.saveApiBaseUrl();
});
requiredElement<HTMLButtonElement>('#refresh').addEventListener('click', () => {
  void controller.loadAnnouncements();
});
elements.announcementSearchInput.addEventListener('input', () => {
  controller.setSearchQuery(elements.announcementSearchInput.value);
});
requiredElement<HTMLButtonElement>('#save-web-app-base-url').addEventListener('click', () => {
  void controller.saveWebAppBaseUrl();
});
requiredElement<HTMLButtonElement>('#login').addEventListener('click', () => {
  void controller.login();
});
requiredElement<HTMLButtonElement>('#logout').addEventListener('click', () => {
  void controller.logout();
});
requiredElement<HTMLButtonElement>('#open-signup').addEventListener('click', () => {
  void controller.openSignupInWebApp();
});

const copyButtons: ReadonlyArray<readonly [string, CopyTarget]> = [
  ['#copy-title', 'title'],
  ['#copy-description', 'description'],
  ['#copy-price', 'price'],
  ['#copy-summary', 'summary'],
];

for (const [selector, target] of copyButtons) {
  requiredElement<HTMLButtonElement>(selector).addEventListener('click', () => {
    void controller.copy(target);
  });
}

requiredElement<HTMLButtonElement>('#fill-demo-form').addEventListener('click', () => {
  void controller.fillDemoForm();
});
requiredElement<HTMLButtonElement>('#open-in-web-app').addEventListener('click', () => {
  void controller.openSelectedInWebApp();
});

void controller.initialize();
