'use strict';

var DEFAULT_SETTINGS = {
  enabled: true,
  fontWeight: 600,
  darken: 0.2,
  preset: 'custom',
  targetingMode: 'all'
};

var PRESET_ORDER = ['comfort', 'contrast', 'heavy'];
var PRESETS = {
  comfort: {
    enabled: true,
    fontWeight: 600,
    darken: 0.15,
    preset: 'comfort',
    targetingMode: 'all'
  },
  contrast: {
    enabled: true,
    fontWeight: 700,
    darken: 0.35,
    preset: 'contrast',
    targetingMode: 'all'
  },
  heavy: {
    enabled: true,
    fontWeight: 800,
    darken: 0.45,
    preset: 'heavy',
    targetingMode: 'all'
  }
};

function normalizeTargetingMode(mode) {
  return ['body', 'bodyHeadings', 'all'].indexOf(mode) === -1 ? DEFAULT_SETTINGS.targetingMode : mode;
}

function normalizeSettings(settings) {
  settings = settings || {};
  var fontWeight = parseInt(settings.fontWeight, 10);
  var darken = parseFloat(settings.darken);

  if (isNaN(fontWeight)) {
    fontWeight = DEFAULT_SETTINGS.fontWeight;
  }
  if (isNaN(darken)) {
    darken = DEFAULT_SETTINGS.darken;
  }

  return {
    enabled: settings.enabled !== false,
    fontWeight: Math.min(900, Math.max(400, fontWeight)),
    darken: Math.min(0.8, Math.max(0, darken)),
    preset: typeof settings.preset === 'string' ? settings.preset : DEFAULT_SETTINGS.preset,
    targetingMode: normalizeTargetingMode(settings.targetingMode)
  };
}

function normalizeStorageSettings(settings) {
  settings = settings || {};

  if (!settings.global) {
    return {
      global: normalizeSettings(settings),
      sites: {},
      disabledDomains: []
    };
  }

  var sites = {};
  Object.keys(settings.sites || {}).forEach(function(hostname) {
    sites[hostname] = normalizeSettings(settings.sites[hostname]);
  });

  return {
    global: normalizeSettings(settings.global),
    sites: sites,
    disabledDomains: Array.isArray(settings.disabledDomains) ? settings.disabledDomains : []
  };
}

function sendSettingsToTab(tabId, storageSettings) {
  chrome.tabs.sendMessage(tabId, {
    type: 'FONT_BOLDER_APPLY',
    settings: storageSettings
  }, function() {
    if (chrome.runtime.lastError) {
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['src/content/content.js']
      }, function() {
        chrome.tabs.sendMessage(tabId, {
          type: 'FONT_BOLDER_APPLY',
          settings: storageSettings
        });
      });
    }
  });
}

function withActiveTab(callback) {
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    if (tabs && tabs[0] && tabs[0].id) {
      callback(tabs[0]);
    }
  });
}

function updateGlobalSettings(updater, tabId) {
  chrome.storage.sync.get(null, function(settings) {
    var storageSettings = normalizeStorageSettings(settings);
    storageSettings.global = normalizeSettings(updater(storageSettings.global));

    chrome.storage.sync.set(storageSettings, function() {
      if (tabId) {
        sendSettingsToTab(tabId, storageSettings);
      }
    });
  });
}

chrome.commands.onCommand.addListener(function(command) {
  withActiveTab(function(tab) {
    if (command === 'toggle-extension') {
      updateGlobalSettings(function(globalSettings) {
        return Object.assign({}, globalSettings, { enabled: !globalSettings.enabled });
      }, tab.id);
      return;
    }

    if (command === 'cycle-preset') {
      updateGlobalSettings(function(globalSettings) {
        var currentIndex = PRESET_ORDER.indexOf(globalSettings.preset);
        var nextPreset = PRESET_ORDER[(currentIndex + 1) % PRESET_ORDER.length];
        return Object.assign({}, PRESETS[nextPreset], {
          targetingMode: globalSettings.targetingMode
        });
      }, tab.id);
    }
  });
});
