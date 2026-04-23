'use strict';

var DEFAULT_SETTINGS = {
  enabled: true,
  fontWeight: 600,
  darken: 0.2
};

var MESSAGES = {
  en: {
    title: 'Font Bolder',
    enabled: 'Enable bold and dark text',
    fontWeight: 'Boldness',
    darken: 'Darkness',
    hint: 'Settings are saved automatically and applied early on newly opened pages to reduce visual flicker.'
  },
  zh: {
    title: '字体加粗',
    enabled: '启用加粗加黑',
    fontWeight: '加粗比例',
    darken: '加黑比例',
    hint: '设置会自动保存，并尽早应用到新打开的网页，减少页面加载后的闪动。'
  }
};

var controls = {};

function getUiLanguage() {
  var language = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
  return language.indexOf('zh') === 0 ? 'zh' : 'en';
}

function localizePopup() {
  var messages = MESSAGES[getUiLanguage()];
  document.documentElement.lang = getUiLanguage();
  document.title = messages.title;

  var localizedNodes = document.querySelectorAll('[data-i18n]');
  for (var i = 0; i < localizedNodes.length; i++) {
    localizedNodes[i].textContent = messages[localizedNodes[i].getAttribute('data-i18n')];
  }
}

function normalizeSettings(settings) {
  settings = settings || {};
  var fontWeight = parseInt(settings.fontWeight, 10);
  var darken = parseFloat(settings.darken);

  return {
    enabled: settings.enabled !== false,
    fontWeight: isNaN(fontWeight) ? DEFAULT_SETTINGS.fontWeight : fontWeight,
    darken: isNaN(darken) ? DEFAULT_SETTINGS.darken : darken
  };
}

function readSettingsFromControls() {
  return {
    enabled: controls.enabled.checked,
    fontWeight: parseInt(controls.fontWeight.value, 10),
    darken: parseFloat(controls.darken.value)
  };
}

function updateLabels(settings) {
  controls.fontWeightValue.textContent = String(settings.fontWeight);
  controls.darkenValue.textContent = settings.darken.toFixed(2) + 'px';
}

function sendSettingsToActiveTab(settings) {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (!tabs || !tabs[0]) {
      return;
    }

    chrome.tabs.sendMessage(tabs[0].id, {
      type: 'FONT_BOLDER_APPLY',
      settings: settings
    }, function() {
      if (chrome.runtime.lastError) {
        chrome.scripting.executeScript({
          target: {
            tabId: tabs[0].id
          },
          files: ['src/content/content.js']
        });
      }
    });
  });
}

function saveAndApply() {
  var settings = readSettingsFromControls();
  updateLabels(settings);

  chrome.storage.sync.set(settings, function() {
    sendSettingsToActiveTab(settings);
  });
}

function hydrateControls(settings) {
  settings = normalizeSettings(settings);
  controls.enabled.checked = settings.enabled;
  controls.fontWeight.value = settings.fontWeight;
  controls.darken.value = settings.darken;
  updateLabels(settings);
}

document.addEventListener('DOMContentLoaded', function () {
  localizePopup();

  controls = {
    enabled: document.getElementById('enabled'),
    fontWeight: document.getElementById('fontWeight'),
    fontWeightValue: document.getElementById('fontWeightValue'),
    darken: document.getElementById('darken'),
    darkenValue: document.getElementById('darkenValue')
  };

  chrome.storage.sync.get(DEFAULT_SETTINGS, hydrateControls);

  controls.enabled.addEventListener('change', saveAndApply);
  controls.fontWeight.addEventListener('input', saveAndApply);
  controls.darken.addEventListener('input', saveAndApply);
});
