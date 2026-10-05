/**
 * Display formatting (money, dates). Presentation only: it never calculates a financial result.
 * Money text comes from the engine through the money service; here we only add digit grouping.
 * Layer: ui.
 */

import { moneyService } from '../services/moneyService.js';

let currency = 'ETB';

export const setCurrency = (label) => {
  currency = label || 'ETB';
};
export const getCurrency = () => currency;

export function groupDigits(decimalText) {
  const negative = decimalText.startsWith('-');
  const [whole, fraction] = decimalText.replace('-', '').split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${negative ? '\u2212' : ''}${grouped}.${fraction}`;
}

/** 194600 -> "1,946.00" */
export const formatMoney = (minor) => groupDigits(moneyService.toDecimalString(minor));

/** +5.00 / -5.00 for differences. */
export function formatSigned(minor) {
  if (minor === 0) return formatMoney(0);
  return `${minor > 0 ? '+' : ''}${formatMoney(minor)}`;
}

/** Amount with the currency label, e.g. "1,946.00 ETB". */
export const formatMoneyWithUnit = (minor) => `${formatMoney(minor)} ${currency}`;

const dayFormat = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
const dayYearFormat = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const timeFormat = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });

const pad = (value) => String(value).padStart(2, '0');

/** Local calendar day key "YYYY-MM-DD" of an ISO timestamp. */
export function dayKey(iso) {
  const date = new Date(iso);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export const todayInput = () => dayKey(new Date().toISOString());

export function formatDay(iso) {
  const key = dayKey(iso);
  const now = new Date();
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (key === todayInput()) return 'Today';
  if (key === dayKey(yesterday.toISOString())) return 'Yesterday';
  const date = new Date(iso);
  return date.getFullYear() === now.getFullYear() ? dayFormat.format(date) : dayYearFormat.format(date);
}

export const formatDate = (iso) => dayYearFormat.format(new Date(iso));
export const formatTime = (iso) => timeFormat.format(new Date(iso));
export const formatDateTime = (iso) => `${dayYearFormat.format(new Date(iso))}, ${timeFormat.format(new Date(iso))}`;

/** A <input type="date"> value (local day) -> ISO timestamp. Today keeps the current time; other days use noon. */
export function dateInputToIso(value) {
  if (value === todayInput()) return new Date().toISOString();
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0).toISOString();
}

export const isoToDateInput = (iso) => dayKey(iso);
