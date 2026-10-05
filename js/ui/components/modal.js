/**
 * Sheets (modal dialogs) and confirmation dialogs. Built on the native <dialog> element, so focus
 * is trapped, Escape closes, and the page behind is inert. Never uses alert/confirm/prompt.
 * Layer: ui.
 */

import { h, uid } from '../dom.js';
import { icon } from '../icons.js';
import { friendlyError } from '../messages.js';

let openSheets = 0;

/**
 * openSheet({ title, content, size: 'sm' | 'md' | 'lg', dismissible })
 * -> { element, body, close(result), closed: Promise<result>, setTitle(text), setContent(node) }
 */
export function openSheet({ title, content, size = 'md', dismissible = true } = {}) {
  const returnFocus = document.activeElement;
  const titleId = uid('sheet-title');
  const titleElement = h('h2', { class: 'sheet__title', id: titleId }, title);
  const body = h('div', { class: 'sheet__body' }, content);
  const dialog = h(
    'dialog',
    { class: `sheet sheet--${size}`, 'aria-labelledby': titleId },
    h(
      'header',
      { class: 'sheet__header' },
      titleElement,
      dismissible ? h('button', { class: 'icon-button', type: 'button', 'aria-label': 'Close', onClick: () => close() }, icon('close')) : null
    ),
    body
  );

  let result;
  let resolveClosed;
  const closed = new Promise((resolve) => {
    resolveClosed = resolve;
  });

  function close(value) {
    result = value;
    if (dialog.open) dialog.close();
  }

  dialog.addEventListener('cancel', (event) => {
    if (!dismissible) event.preventDefault();
  });
  dialog.addEventListener('click', (event) => {
    if (dismissible && event.target === dialog) close();
  });
  dialog.addEventListener('close', () => {
    dialog.remove();
    openSheets -= 1;
    if (openSheets <= 0) document.documentElement.classList.remove('is-locked');
    if (returnFocus && returnFocus.isConnected && typeof returnFocus.focus === 'function') returnFocus.focus();
    resolveClosed(result);
  });

  document.body.append(dialog);
  openSheets += 1;
  document.documentElement.classList.add('is-locked');
  dialog.showModal();

  return {
    element: dialog,
    body,
    close,
    closed,
    setTitle: (text) => {
      titleElement.textContent = text;
    },
    setContent: (node) => {
      body.replaceChildren(node);
      body.scrollTop = 0;
    },
  };
}

/**
 * confirmAction({ title, message, confirmLabel, cancelLabel, tone: 'default' | 'danger',
 *                 reason: { label, help, required, defaultValue }, details, run })
 * `run(reasonText)` is awaited when the user confirms; if it throws, the error is shown inside the
 * dialog (in plain language) and the dialog stays open. Resolves true after success, false if cancelled.
 */
export function confirmAction({ title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', tone = 'default', reason, details, run }) {
  return new Promise((resolve) => {
    const errorBox = h('p', { class: 'form-error', role: 'alert', hidden: true });
    const reasonId = uid('reason');
    const reasonHelpId = uid('reason-help');
    const reasonError = h('p', { class: 'field__error', hidden: true, role: 'alert' });
    const textarea = reason
      ? h('textarea', { class: 'input', id: reasonId, rows: 3, 'aria-describedby': reasonHelpId, value: reason.defaultValue ?? '' })
      : null;

    const confirmButton = h('button', { class: `button ${tone === 'danger' ? 'button--danger' : 'button--primary'}`, type: 'submit' }, confirmLabel);
    const cancelButton = h('button', { class: 'button button--quiet', type: 'button', onClick: () => sheet.close(false) }, cancelLabel);

    const form = h(
      'form',
      {
        class: 'confirm',
        novalidate: true,
        onSubmit: async (event) => {
          event.preventDefault();
          errorBox.hidden = true;
          const text = textarea ? textarea.value.trim() : undefined;
          if (reason?.required && !text) {
            reasonError.textContent = 'Please write a short reason. It is kept in the history.';
            reasonError.hidden = false;
            textarea.setAttribute('aria-invalid', 'true');
            textarea.focus();
            return;
          }
          reasonError.hidden = true;
          confirmButton.disabled = true;
          cancelButton.disabled = true;
          confirmButton.textContent = 'Working\u2026';
          try {
            if (run) await run(text);
            sheet.close(true);
          } catch (error) {
            errorBox.textContent = friendlyError(error).message;
            errorBox.hidden = false;
            confirmButton.disabled = false;
            cancelButton.disabled = false;
            confirmButton.textContent = confirmLabel;
          }
        },
      },
      h('p', { class: 'confirm__message' }, message),
      details ?? null,
      reason
        ? h(
            'div',
            { class: 'field' },
            h('label', { class: 'field__label', for: reasonId }, reason.label ?? 'Reason'),
            textarea,
            reason.help ? h('p', { class: 'field__help', id: reasonHelpId }, reason.help) : h('span', { id: reasonHelpId }),
            reasonError
          )
        : null,
      errorBox,
      h('div', { class: 'form__actions' }, cancelButton, confirmButton)
    );

    const sheet = openSheet({ title, content: form, size: 'sm' });
    sheet.closed.then((result) => resolve(result === true));
    (textarea ?? confirmButton).focus();
  });
}

/** A short message sheet with a single button. */
export function showNotice({ title, message, buttonLabel = 'OK' }) {
  const sheet = openSheet({
    title,
    size: 'sm',
    content: h('div', { class: 'confirm' }, h('p', { class: 'confirm__message' }, message), h('div', { class: 'form__actions' }, h('button', { class: 'button button--primary', type: 'button', onClick: () => sheet.close() }, buttonLabel))),
  });
  return sheet.closed;
}
