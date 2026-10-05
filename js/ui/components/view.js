/**
 * A page region that loads data, shows a skeleton first, renders, and re-renders on refresh().
 * Failures show an error state with "Try again" (first load) or a toast (later refreshes).
 * Layer: ui.
 */

import { render } from '../dom.js';
import { skeleton, errorState } from './states.js';
import { toastError } from './toast.js';
import { friendlyError } from '../messages.js';

export function createView(container, { load, draw, skeletonBlocks = 3 }) {
  let hasContent = false;
  let sequence = 0;

  async function refresh() {
    const mine = ++sequence;
    if (!hasContent) render(container, skeleton(skeletonBlocks));
    try {
      const data = await load();
      if (mine !== sequence) return;
      render(container, draw(data));
      hasContent = true;
    } catch (error) {
      if (mine !== sequence) return;
      const info = friendlyError(error);
      if (hasContent) {
        toastError(info.message);
      } else {
        render(container, errorState({ title: info.fatal ? info.title : 'We could not load this', message: info.message, onRetry: refresh }));
      }
    }
  }

  return { refresh };
}
