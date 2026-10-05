/**
 * Form builder. Field names equal the engine's field names, so engine validation errors land
 * on the right field. Client-side checks are only about FORMAT (required, readable amount);
 * every business rule is enforced by the engine and shown in plain language.
 * Layer: ui.
 */

import { h, uid } from '../dom.js';
import { friendlyError } from '../messages.js';
import { moneyService } from '../../services/moneyService.js';
import { getCurrency } from '../formatters.js';

const NONE = '__none__';
const NEW = '__new__';

/**
 * field: { name, label, type: 'text'|'textarea'|'amount'|'balance'|'date'|'select',
 *          required, placeholder, help, value, options: [{ value, label }], advanced,
 *          creatable: { label, create: async () => ({ value, label }) | null },
 *          showIf(values), dynamic(values) -> { help?, shortcut?: { label, amount } } }
 * `value: null` as an option value means "none" (decoded back to null).
 */
export function createForm({ fields, submitLabel = 'Save', pendingLabel = 'Saving\u2026', onSubmit, onCancel, cancelLabel = 'Cancel', intro, footer }) {
  const controls = new Map();
  const generalError = h('div', { class: 'form-error', role: 'alert', hidden: true });
  const listeners = [];
  const form = h('form', { class: 'form', novalidate: true });

  function buildControl(def) {
    const id = uid(`f-${def.name}`);
    const helpId = `${id}-help`;
    const errorId = `${id}-error`;
    const errorEl = h('p', { class: 'field__error', id: errorId, hidden: true });
    const helpEl = h('p', { class: 'field__help', id: helpId, hidden: !def.help }, def.help ?? '');
    const shortcutEl = h('button', { class: 'link-button', type: 'button', hidden: true });
    const describedBy = `${helpId} ${errorId}`;
    let input;
    let previous = '';

    if (def.type === 'textarea') {
      input = h('textarea', { class: 'input', id, name: def.name, rows: 3, placeholder: def.placeholder, value: def.value ?? '' });
    } else if (def.type === 'select') {
      input = h('select', { class: 'input input--select', id, name: def.name });
      const setOptions = (options, selected) => {
        input.replaceChildren(
          h('option', { value: '' }, def.placeholder ?? 'Choose\u2026'),
          ...options.map((option) => h('option', { value: option.value === null ? NONE : option.value }, option.label)),
          def.creatable ? h('option', { value: NEW }, def.creatable.label) : null
        );
        input.value = selected === null ? NONE : (selected ?? '');
        if (input.value !== (selected === null ? NONE : (selected ?? ''))) input.value = '';
      };
      def.options = def.options ?? [];
      setOptions(def.options, def.value);
      previous = input.value;
      input.addEventListener('change', async () => {
        if (input.value !== NEW) {
          previous = input.value;
          return;
        }
        input.value = previous;
        const created = await def.creatable.create();
        if (created) {
          def.options = [...def.options, created];
          setOptions(def.options, created.value);
          previous = input.value;
          notify();
        }
      });
      input.setOptions = (options, selected) => {
        def.options = options;
        setOptions(options, selected ?? null);
        previous = input.value;
      };
    } else if (def.type === 'date') {
      input = h('input', { class: 'input', id, name: def.name, type: 'date', value: def.value ?? '' });
    } else if (def.type === 'amount' || def.type === 'balance') {
      input = h('input', { class: 'input input--amount', id, name: def.name, type: 'text', inputmode: 'decimal', autocomplete: 'off', placeholder: def.placeholder ?? '0.00', value: def.value ?? '' });
    } else {
      input = h('input', { class: 'input', id, name: def.name, type: 'text', autocomplete: 'off', placeholder: def.placeholder, value: def.value ?? '' });
    }
    input.setAttribute('aria-describedby', describedBy);
    if (def.required) input.setAttribute('aria-required', 'true');

    const control = h(
      'div',
      input.tagName === 'INPUT' && (def.type === 'amount' || def.type === 'balance')
        ? { class: 'input-group' }
        : { class: 'input-wrap' },
      input,
      def.type === 'amount' || def.type === 'balance' ? h('span', { class: 'input-group__unit', 'aria-hidden': 'true' }, getCurrency()) : null
    );

    const wrapper = h(
      'div',
      { class: 'field', dataset: { field: def.name } },
      h(
        'div',
        { class: 'field__top' },
        h('label', { class: 'field__label', for: id }, def.label, def.required ? null : h('span', { class: 'field__optional' }, ' (optional)')),
        shortcutEl
      ),
      control,
      helpEl,
      errorEl
    );

    return { def, id, input, wrapper, errorEl, helpEl, shortcutEl };
  }

  const basic = [];
  const advanced = [];
  for (const def of fields) {
    const control = buildControl(def);
    controls.set(def.name, control);
    (def.advanced ? advanced : basic).push(control.wrapper);
    control.input.addEventListener('input', () => {
      clearError(def.name);
      notify();
    });
    control.input.addEventListener('change', () => notify());
  }

  form.append(
    ...(intro ? [intro] : []),
    generalError,
    ...basic,
    ...(advanced.length ? [h('details', { class: 'form__more' }, h('summary', {}, 'More options'), h('div', { class: 'form__more-body' }, advanced))] : [])
  );

  const submitButton = h('button', { class: 'button button--primary', type: 'submit' }, submitLabel);
  const cancelButton = onCancel ? h('button', { class: 'button button--quiet', type: 'button', onClick: onCancel }, cancelLabel) : null;
  form.append(...(footer ? [footer] : []), h('div', { class: 'form__actions' }, cancelButton, submitButton));

  function decode(control) {
    const { def, input } = control;
    const raw = input.value;
    if (def.type === 'select') {
      if (raw === NONE) return { value: null };
      if (raw === '' || raw === NEW) return { value: undefined, empty: true };
      return { value: raw };
    }
    const text = typeof raw === 'string' ? raw.trim() : raw;
    if (text === '') return { value: undefined, empty: true };
    if (def.type === 'amount') {
      const parsed = moneyService.parseAmount(text);
      return parsed === null ? { value: undefined, invalid: 'AMOUNT_INVALID' } : { value: parsed };
    }
    if (def.type === 'balance') {
      const parsed = moneyService.parseBalance(text);
      return parsed === null ? { value: undefined, invalid: 'ACTUAL_AMOUNT_INVALID' } : { value: parsed };
    }
    return { value: text };
  }

  function currentValues() {
    const values = {};
    for (const [name, control] of controls) {
      if (control.hidden) continue;
      const { value } = decode(control);
      if (value !== undefined) values[name] = value;
    }
    return values;
  }

  function notify() {
    const values = currentValues();
    for (const control of controls.values()) {
      const { def } = control;
      if (def.showIf) {
        const visible = Boolean(def.showIf(values));
        control.hidden = !visible;
        control.wrapper.hidden = !visible;
      }
      if (def.dynamic) {
        const info = def.dynamic(values) ?? {};
        if (info.help !== undefined) {
          control.helpEl.textContent = info.help;
          control.helpEl.hidden = !info.help;
        }
        if (info.shortcut) {
          control.shortcutEl.textContent = info.shortcut.label;
          control.shortcutEl.hidden = false;
          control.shortcutEl.onclick = () => {
            control.input.value = info.shortcut.text;
            clearError(def.name);
            notify();
            control.input.focus();
          };
        } else {
          control.shortcutEl.hidden = true;
        }
      }
    }
    for (const listener of listeners) listener(values);
  }

  function setError(name, message) {
    const control = controls.get(name);
    if (!control) return false;
    control.errorEl.textContent = message;
    control.errorEl.hidden = false;
    control.input.setAttribute('aria-invalid', 'true');
    return true;
  }

  function clearError(name) {
    const control = controls.get(name);
    if (!control) return;
    control.errorEl.hidden = true;
    control.input.removeAttribute('aria-invalid');
  }

  function showGeneral(message) {
    generalError.textContent = message;
    generalError.hidden = !message;
  }

  function clearErrors() {
    for (const name of controls.keys()) clearError(name);
    showGeneral('');
  }

  function focusFirstError() {
    const first = form.querySelector('[aria-invalid="true"]');
    if (first) {
      const details = first.closest('details');
      if (details) details.open = true;
      first.focus();
    } else if (!generalError.hidden) generalError.scrollIntoView({ block: 'nearest' });
  }

  function validateFormat() {
    let ok = true;
    for (const [name, control] of controls) {
      if (control.hidden) continue;
      const decoded = decode(control);
      if (decoded.invalid) {
        setError(name, friendlyError({ name: 'ValidationError', errors: [{ code: decoded.invalid, field: name }] }).fieldErrors[name]);
        ok = false;
      } else if (decoded.empty && control.def.required) {
        const text = control.def.type === 'select' ? `Choose ${control.def.label.toLowerCase().replace(/\?$/, '')}.` : control.def.type === 'amount' ? 'Enter an amount.' : `Enter ${control.def.label.toLowerCase().replace(/\?$/, '')}.`;
        setError(name, control.def.requiredMessage ?? text);
        ok = false;
      }
    }
    return ok;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearErrors();
    if (!validateFormat()) {
      focusFirstError();
      return;
    }
    submitButton.disabled = true;
    submitButton.textContent = pendingLabel;
    try {
      await onSubmit(currentValues());
    } catch (error) {
      const info = friendlyError(error);
      let placed = false;
      for (const [field, message] of Object.entries(info.fieldErrors)) placed = setError(field, message) || placed;
      const unplaced = Object.entries(info.fieldErrors).filter(([field]) => !controls.has(field)).map(([, message]) => message);
      const generalText = [...info.general, ...unplaced].filter(Boolean)[0];
      showGeneral(generalText ?? (placed ? '' : info.message));
      focusFirstError();
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = submitLabel;
    }
  });

  notify();

  return {
    element: form,
    values: currentValues,
    onChange: (listener) => listeners.push(listener),
    setOptions(name, options, selected) {
      controls.get(name)?.input.setOptions?.(options, selected);
      notify();
    },
    setValue(name, value) {
      const control = controls.get(name);
      if (!control) return;
      control.input.value = value === null ? NONE : (value ?? '');
      notify();
    },
    setError,
    focus(name) {
      controls.get(name)?.input.focus();
    },
  };
}
