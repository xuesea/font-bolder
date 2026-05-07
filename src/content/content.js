'use strict';

var FONT_BOLDER_DEFAULTS = {
  enabled: true,
  fontWeight: 600,
  darken: 0.2,
  preset: 'custom',
  targetingMode: 'all'
};

var FONT_BOLDER_PRESETS = {
  comfort: { enabled: true, fontWeight: 600, darken: 0.15, preset: 'comfort', targetingMode: 'all' },
  contrast: { enabled: true, fontWeight: 700, darken: 0.35, preset: 'contrast', targetingMode: 'all' },
  heavy: { enabled: true, fontWeight: 800, darken: 0.45, preset: 'heavy', targetingMode: 'all' }
};

var FONT_BOLDER_STYLE_ID = 'font-bolder-style';
var FONT_BOLDER_TARGETING_MODES = ['body', 'bodyHeadings', 'all'];
var FONT_BOLDER_EXCLUDED_SELECTOR = [
  'svg', 'svg *', 'img', 'picture', 'video', 'canvas', 'iframe',
  'code', 'pre', 'kbd', 'samp',
  'button', 'input', 'textarea', 'select', 'option',
  'nav', 'nav *', 'menu', 'menu *',
  '[role="button"]', '[role="img"]', '[role="navigation"]',
  '[class*="icon" i]', '[class*="material-symbol" i]', '[class*="material-icon" i]',
  '[class*="fa-" i]', '[class^="fa" i]', '[class*="glyph" i]',
  '.MathJax', '.MathJax *', 'math', 'math *', '.katex', '.katex *'
].join(', ');
var FONT_BOLDER_TARGET_SELECTORS = {
  body: ['main p', 'article p', 'section p', 'p', 'li', 'dd', 'dt', 'blockquote', 'figcaption', '[role="main"] p'],
  bodyHeadings: ['main p', 'article p', 'section p', 'p', 'li', 'dd', 'dt', 'blockquote', 'figcaption', '[role="main"] p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
  all: ['body', 'body *']
};

var temporarySettings = null;
var lastResolvedSettings = null;
var styleObserver = null;
var observedStyleParent = null;
var isMovingStyle = false;

function getHostname() {
  try { return window.location.hostname || ''; } catch (error) { return ''; }
}

function normalizeSiteKey(hostname) {
  return String(hostname || '').replace(/^www\./i, '').toLowerCase();
}

function normalizeTargetingMode(mode) {
  return FONT_BOLDER_TARGETING_MODES.indexOf(mode) === -1 ? FONT_BOLDER_DEFAULTS.targetingMode : mode;
}

function normalizeSettings(settings) {
  settings = settings || {};
  var fontWeight = parseInt(settings.fontWeight, 10);
  if (isNaN(fontWeight)) fontWeight = FONT_BOLDER_DEFAULTS.fontWeight;
  fontWeight = Math.min(900, Math.max(400, fontWeight));

  var darken = parseFloat(settings.darken);
  if (isNaN(darken)) darken = FONT_BOLDER_DEFAULTS.darken;
  darken = Math.min(0.8, Math.max(0, darken));

  return {
    enabled: settings.enabled !== false,
    fontWeight: fontWeight,
    darken: darken,
    preset: typeof settings.preset === 'string' ? settings.preset : FONT_BOLDER_DEFAULTS.preset,
    targetingMode: normalizeTargetingMode(settings.targetingMode)
  };
}

function isV2Settings(settings) {
  return !!(settings && typeof settings === 'object' && settings.global);
}

function normalizeStorageSettings(settings) {
  settings = settings || {};
  if (!isV2Settings(settings)) {
    return { global: normalizeSettings(settings), sites: {}, disabledDomains: [] };
  }

  var normalizedSites = {};
  Object.keys(settings.sites || {}).forEach(function(hostname) {
    var siteKey = normalizeSiteKey(hostname);
    if (siteKey) normalizedSites[siteKey] = normalizeSettings(settings.sites[hostname]);
  });

  return {
    global: normalizeSettings(settings.global),
    sites: normalizedSites,
    disabledDomains: Array.isArray(settings.disabledDomains) ? settings.disabledDomains.map(normalizeSiteKey).filter(Boolean) : []
  };
}

function isDomainDisabled(hostname, disabledDomains) {
  var siteKey = normalizeSiteKey(hostname);
  return disabledDomains.some(function(domain) {
    return siteKey === domain || siteKey.endsWith('.' + domain);
  });
}

function resolveSettings(storageSettings) {
  var normalized = normalizeStorageSettings(storageSettings);
  var siteKey = normalizeSiteKey(getHostname());
  var resolved = normalized.global;

  if (siteKey && normalized.sites[siteKey]) resolved = normalized.sites[siteKey];
  if (isDomainDisabled(siteKey, normalized.disabledDomains)) resolved = Object.assign({}, resolved, { enabled: false });
  if (temporarySettings) resolved = Object.assign({}, resolved, temporarySettings);

  return normalizeSettings(resolved);
}

function getStyleParent() { return document.head || document.documentElement; }

function keepStyleLast() {
  var style = document.getElementById(FONT_BOLDER_STYLE_ID);
  var parent = getStyleParent();
  if (!style || !parent || style.parentNode === parent && parent.lastElementChild === style) return;
  isMovingStyle = true;
  parent.appendChild(style);
  isMovingStyle = false;
}

function observeStyleParent() {
  var parent = getStyleParent();
  if (!parent) return;
  if (styleObserver && observedStyleParent === parent) return;
  if (styleObserver) styleObserver.disconnect();
  observedStyleParent = parent;
  styleObserver = new MutationObserver(function() {
    if (!isMovingStyle) keepStyleLast();
  });
  styleObserver.observe(parent, { childList: true });
}

function getStyleElement() {
  var style = document.getElementById(FONT_BOLDER_STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = FONT_BOLDER_STYLE_ID;
    style.type = 'text/css';
  }
  keepStyleLast();
  if (!style.parentNode) {
    var parent = getStyleParent();
    if (parent) parent.appendChild(style);
  }
  observeStyleParent();
  keepStyleLast();
  return style;
}

function selectorWithExclusions(selector) {
  return selector + ':not(' + FONT_BOLDER_EXCLUDED_SELECTOR + ')';
}

function buildTargetSelector(targetingMode) {
  var selectors = FONT_BOLDER_TARGET_SELECTORS[normalizeTargetingMode(targetingMode)] || FONT_BOLDER_TARGET_SELECTORS.all;
  return selectors.map(selectorWithExclusions).join(',\n');
}

function applyResolvedSettings(settings) {
  settings = normalizeSettings(settings);
  lastResolvedSettings = settings;
  var style = getStyleElement();
  if (!style) return;
  if (!settings.enabled) {
    style.textContent = '';
    return;
  }

  style.textContent = [
    buildTargetSelector(settings.targetingMode) + ' {',
    '  font-weight: ' + settings.fontWeight + ' !important;',
    '  text-shadow: 0 0 ' + settings.darken + 'px currentColor !important;',
    '  -webkit-font-smoothing: antialiased !important;',
    '  text-rendering: geometricPrecision !important;',
    '}'
  ].join('\n');
}

function applyFontBolder(storageSettings) { applyResolvedSettings(resolveSettings(storageSettings)); }

function loadSettings() {
  chrome.storage.sync.get(null, function(settings) { applyFontBolder(settings); });
}

applyResolvedSettings(FONT_BOLDER_DEFAULTS);
loadSettings();

document.addEventListener('DOMContentLoaded', function() { keepStyleLast(); loadSettings(); });
window.addEventListener('load', function() { keepStyleLast(); loadSettings(); });

chrome.storage.onChanged.addListener(function(changes, areaName) {
  if (areaName !== 'sync') return;
  if (changes.global || changes.sites || changes.disabledDomains || changes.enabled || changes.fontWeight || changes.darken || changes.preset || changes.targetingMode) loadSettings();
});

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (!message || !message.type) return;

  if (message.type === 'FONT_BOLDER_APPLY') {
    if (message.temporary) {
      temporarySettings = normalizeSettings(message.settings);
      applyResolvedSettings(temporarySettings);
    } else {
      temporarySettings = null;
      applyFontBolder(message.settings);
    }
    if (sendResponse) sendResponse({ ok: true, settings: lastResolvedSettings });
    return true;
  }

  if (message.type === 'FONT_BOLDER_BOOST') {
    temporarySettings = normalizeSettings(FONT_BOLDER_PRESETS.heavy);
    applyResolvedSettings(temporarySettings);
    if (sendResponse) sendResponse({ ok: true, settings: lastResolvedSettings });
    return true;
  }

  if (message.type === 'FONT_BOLDER_CLEAR_TEMPORARY') {
    temporarySettings = null;
    loadSettings();
    if (sendResponse) sendResponse({ ok: true });
    return true;
  }
});
