import { handleFillDemoFormMessage } from '../lib/fill-message';

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleFillDemoFormMessage(document, message, sendResponse);
  return undefined;
});
