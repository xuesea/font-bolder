'use strict';

var FONT_BOLDER_DEFAULTS = {
  enabled: true,
  fontWeight: 600,
  darken: 0.2
};

var FONT_BOLDER_STYLE_ID = 'font-bolder-style';
var FONT_BOLDER_TARGETS = [
  'body',
  'body *:not(svg):not(svg *):not(img):not(video):not(canvas)'
].join(', ');

function normalizeSettings(settings) {
  settings = settings || {};

  var fontWeight = parseInt(settings.fontWeight, 10);
  if (isNaN(fontWeight)) {
    fontWeight = FONT_BOLDER_DEFAULTS.fontWeight;
  }
  fontWeight = Math.min(900, Math.max(400, fontWeight));

  var darken = parseFloat(settings.darken);
  if (isNaN(darken)) {
    darken = FONT_BOLDER_DEFAULTS.darken;
  }
  darken = Math.min(0.8, Math.max(0, darken));

  return {
    enabled: settings.enabled !== false,
    fontWeight: fontWeight,
    darken: darken
  };
}

function getStyleElement() {
  var style = document.getElementById(FONT_BOLDER_STYLE_ID);
  if (style) {
    return style;
  }

  style = document.createElement('style');
  style.id = FONT_BOLDER_STYLE_ID;
  style.type = 'text/css';

  var parent = document.head || document.documentElement;
  if (parent) {
    parent.appendChild(style);
  }

  return style;
}

function applyFontBolder(settings) {
  settings = normalizeSettings(settings);

  var style = getStyleElement();
  if (!style) {
    return;
  }

  if (!settings.enabled) {
    style.textContent = '';
    return;
  }

  style.textContent = [
    FONT_BOLDER_TARGETS + ' {',
    '  font-weight: ' + settings.fontWeight + ' !important;',
    '  text-shadow: 0 0 ' + settings.darken + 'px currentColor !important;',
    '  -webkit-font-smoothing: antialiased !important;',
    '  text-rendering: geometricPrecision !important;',
    '}'
  ].join('\n');
}

function loadSettings() {
  chrome.storage.sync.get(FONT_BOLDER_DEFAULTS, function(settings) {
    applyFontBolder(settings);
  });
}

applyFontBolder(FONT_BOLDER_DEFAULTS);
loadSettings();

chrome.storage.onChanged.addListener(function(changes, areaName) {
  if (areaName !== 'sync') {
    return;
  }

  if (changes.enabled || changes.fontWeight || changes.darken) {
    loadSettings();
  }
});

chrome.runtime.onMessage.addListener(function(message) {
  if (!message || message.type !== 'FONT_BOLDER_APPLY') {
    return;
  }

  applyFontBolder(message.settings);
});
