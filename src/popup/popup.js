'use strict';

var DEFAULT_SETTINGS = { enabled: true, fontWeight: 600, darken: 0.2, preset: 'custom', targetingMode: 'all' };
var TARGETING_MODES = ['body', 'bodyHeadings', 'all'];
var PRESETS = {
  comfort: { enabled: true, fontWeight: 600, darken: 0.15, preset: 'comfort', targetingMode: 'all' },
  contrast: { enabled: true, fontWeight: 700, darken: 0.35, preset: 'contrast', targetingMode: 'all' },
  heavy: { enabled: true, fontWeight: 800, darken: 0.45, preset: 'heavy', targetingMode: 'all' }
};

var MESSAGES = {
  en: {
    title: 'Font Bolder', enabled: 'Enable bold and dark text', fontWeight: 'Boldness', darken: 'Darkness', presets: 'Presets',
    presetComfort: 'Comfort', presetContrast: 'Contrast', presetHeavy: 'Heavy', targetingMode: 'Apply to', targetBody: 'Body text only', targetBodyHeadings: 'Body + headings', targetAll: 'All text',
    targetingHint: 'Code, forms, navigation, math, icons, and media are skipped automatically.', globalScope: 'Global', siteScope: 'This site', boost: 'Temporary boost', clearBoost: 'Reset tab boost', resetSite: 'Use global',
    disableSite: 'Disable on this site', enableSite: 'Enable on this site', disabledSiteHint: 'Font Bolder is disabled on {host}.',
    hint: 'Settings are saved automatically and applied early on newly opened pages to reduce visual flicker.', editingGlobal: 'Editing global settings.', editingSite: 'Editing settings for {host}.', unsupportedSite: 'This page does not support per-site settings.',
    custom: 'Custom', comfort: 'Comfort', contrast: 'Contrast', heavy: 'Heavy'
  },
  zh: {
    title: '字体加粗', enabled: '启用加粗加黑', fontWeight: '加粗比例', darken: '加黑比例', presets: '快捷预设',
    presetComfort: '舒适', presetContrast: '高对比', presetHeavy: '重加粗', targetingMode: '作用范围', targetBody: '仅正文', targetBodyHeadings: '正文 + 标题', targetAll: '全部文字',
    targetingHint: '会自动跳过代码、表单、导航、公式、图标和媒体元素。', globalScope: '全局', siteScope: '当前网站', boost: '临时加粗本页', clearBoost: '恢复原设置', resetSite: '使用全局',
    disableSite: '在本站停用', enableSite: '在本站启用', disabledSiteHint: 'Font Bolder 已在 {host} 停用。',
    hint: '设置会自动保存，并尽早应用到新打开的网页，减少页面加载后的闪动。', editingGlobal: '正在编辑全局设置。', editingSite: '正在编辑 {host} 的单独设置。', unsupportedSite: '当前页面不支持按网站保存设置。',
    custom: '自定义', comfort: '舒适', contrast: '高对比', heavy: '重加粗'
  }
};

var controls = {};
var currentScope = 'global';
var currentHostname = '';
var currentStorageSettings = null;
var activeTabId = null;

function getUiLanguage() {
  var language = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
  return language.indexOf('zh') === 0 ? 'zh' : 'en';
}
function getMessages() { return MESSAGES[getUiLanguage()]; }
function localizePopup() {
  var messages = getMessages();
  document.documentElement.lang = getUiLanguage();
  document.title = messages.title;
  var localizedNodes = document.querySelectorAll('[data-i18n]');
  for (var i = 0; i < localizedNodes.length; i++) localizedNodes[i].textContent = messages[localizedNodes[i].getAttribute('data-i18n')];
}
function normalizeSiteKey(hostname) { return String(hostname || '').replace(/^www\./i, '').toLowerCase(); }
function normalizeTargetingMode(mode) { return TARGETING_MODES.indexOf(mode) === -1 ? DEFAULT_SETTINGS.targetingMode : mode; }
function normalizeSettings(settings) {
  settings = settings || {};
  var fontWeight = parseInt(settings.fontWeight, 10);
  var darken = parseFloat(settings.darken);
  if (isNaN(fontWeight)) fontWeight = DEFAULT_SETTINGS.fontWeight;
  if (isNaN(darken)) darken = DEFAULT_SETTINGS.darken;
  return {
    enabled: settings.enabled !== false,
    fontWeight: Math.min(900, Math.max(400, fontWeight)),
    darken: Math.min(0.8, Math.max(0, darken)),
    preset: typeof settings.preset === 'string' ? settings.preset : DEFAULT_SETTINGS.preset,
    targetingMode: normalizeTargetingMode(settings.targetingMode)
  };
}
function isV2Settings(settings) { return !!(settings && typeof settings === 'object' && settings.global); }
function normalizeStorageSettings(settings) {
  settings = settings || {};
  if (!isV2Settings(settings)) return { global: normalizeSettings(settings), sites: {}, disabledDomains: [] };
  var sites = {};
  Object.keys(settings.sites || {}).forEach(function(hostname) {
    var siteKey = normalizeSiteKey(hostname);
    if (siteKey) sites[siteKey] = normalizeSettings(settings.sites[hostname]);
  });
  return {
    global: normalizeSettings(settings.global),
    sites: sites,
    disabledDomains: Array.isArray(settings.disabledDomains) ? settings.disabledDomains.map(normalizeSiteKey).filter(Boolean) : []
  };
}
function isDomainDisabled(hostname, disabledDomains) {
  var siteKey = normalizeSiteKey(hostname);
  return disabledDomains.some(function(domain) { return siteKey === domain || siteKey.endsWith('.' + domain); });
}
function getSettingsForScope() {
  var settings = normalizeStorageSettings(currentStorageSettings);
  var siteKey = normalizeSiteKey(currentHostname);
  if (currentScope === 'site' && siteKey && settings.sites[siteKey]) return settings.sites[siteKey];
  return settings.global;
}
function readSettingsFromControls() {
  return { enabled: controls.enabled.checked, fontWeight: parseInt(controls.fontWeight.value, 10), darken: parseFloat(controls.darken.value), preset: controls.presetValue.dataset.preset || 'custom', targetingMode: controls.targetingMode.value };
}
function presetLabel(preset) { var messages = getMessages(); return messages[preset] || messages.custom; }
function updateLabels(settings) {
  settings = normalizeSettings(settings);
  controls.fontWeightValue.textContent = String(settings.fontWeight);
  controls.darkenValue.textContent = settings.darken.toFixed(2) + 'px';
  controls.presetValue.textContent = presetLabel(settings.preset);
  controls.presetValue.dataset.preset = settings.preset;
  var presetButtons = document.querySelectorAll('.preset-button');
  for (var i = 0; i < presetButtons.length; i++) presetButtons[i].classList.toggle('active', presetButtons[i].dataset.preset === settings.preset);
  updatePreview(settings);
}
function updatePreview(settings) {
  settings = normalizeSettings(settings);
  controls.preview.style.fontWeight = String(settings.fontWeight);
  controls.preview.style.textShadow = '0 0 ' + settings.darken + 'px currentColor';
}
function updateExceptionUi() {
  var messages = getMessages();
  var storageSettings = normalizeStorageSettings(currentStorageSettings);
  var disabled = currentHostname && isDomainDisabled(currentHostname, storageSettings.disabledDomains);
  controls.toggleSiteDisabled.hidden = !currentHostname;
  controls.toggleSiteDisabled.textContent = disabled ? messages.enableSite : messages.disableSite;
  controls.toggleSiteDisabled.classList.toggle('active-danger', !!disabled);
  controls.exceptionHint.hidden = !disabled;
  controls.exceptionHint.textContent = disabled ? messages.disabledSiteHint.replace('{host}', currentHostname) : '';
}
function updateScopeUi() {
  var messages = getMessages();
  controls.globalScope.classList.toggle('active', currentScope === 'global');
  controls.siteScope.classList.toggle('active', currentScope === 'site');
  controls.siteScope.disabled = !currentHostname;
  controls.resetSite.hidden = currentScope !== 'site' || !currentHostname;
  if (currentScope === 'site' && currentHostname) controls.scopeHint.textContent = messages.editingSite.replace('{host}', currentHostname);
  else if (currentScope === 'site') controls.scopeHint.textContent = messages.unsupportedSite;
  else controls.scopeHint.textContent = messages.editingGlobal;
  updateExceptionUi();
}
function sendMessageToActiveTab(message, callback) {
  if (!activeTabId) { if (callback) callback(); return; }
  chrome.tabs.sendMessage(activeTabId, message, function(response) {
    if (chrome.runtime.lastError) {
      chrome.scripting.executeScript({ target: { tabId: activeTabId }, files: ['src/content/content.js'] }, function() {
        chrome.tabs.sendMessage(activeTabId, message, callback || function() {});
      });
      return;
    }
    if (callback) callback(response);
  });
}
function saveStorageSettings(storageSettings, applySettings) {
  currentStorageSettings = normalizeStorageSettings(storageSettings);
  chrome.storage.sync.set(currentStorageSettings, function() {
    sendMessageToActiveTab({ type: 'FONT_BOLDER_APPLY', settings: currentStorageSettings });
    updateExceptionUi();
    if (applySettings) hydrateControls(applySettings);
  });
}
function saveAndApply() {
  var scopedSettings = readSettingsFromControls();
  var storageSettings = normalizeStorageSettings(currentStorageSettings);
  var siteKey = normalizeSiteKey(currentHostname);
  if (currentScope === 'site' && siteKey) storageSettings.sites[siteKey] = scopedSettings;
  else storageSettings.global = scopedSettings;
  updateLabels(scopedSettings);
  saveStorageSettings(storageSettings);
}
function hydrateControls(settings) {
  settings = normalizeSettings(settings);
  controls.enabled.checked = settings.enabled;
  controls.fontWeight.value = settings.fontWeight;
  controls.darken.value = settings.darken;
  controls.targetingMode.value = settings.targetingMode;
  controls.presetValue.dataset.preset = settings.preset;
  updateLabels(settings);
  updateScopeUi();
}
function switchScope(scope) { if (scope === 'site' && !currentHostname) return; currentScope = scope; hydrateControls(getSettingsForScope()); }
function applyPreset(presetName) {
  if (!PRESETS[presetName]) return;
  var presetSettings = Object.assign({}, PRESETS[presetName], { targetingMode: controls.targetingMode.value });
  hydrateControls(presetSettings);
  saveAndApply();
}
function markCustomAndSave() { controls.presetValue.dataset.preset = 'custom'; saveAndApply(); }
function resetSiteSettings() {
  var siteKey = normalizeSiteKey(currentHostname);
  if (!siteKey) return;
  var storageSettings = normalizeStorageSettings(currentStorageSettings);
  delete storageSettings.sites[siteKey];
  currentScope = 'global';
  saveStorageSettings(storageSettings, storageSettings.global);
}
function toggleCurrentSiteDisabled() {
  var siteKey = normalizeSiteKey(currentHostname);
  if (!siteKey) return;
  var storageSettings = normalizeStorageSettings(currentStorageSettings);
  var disabled = isDomainDisabled(siteKey, storageSettings.disabledDomains);
  if (disabled) storageSettings.disabledDomains = storageSettings.disabledDomains.filter(function(domain) { return domain !== siteKey; });
  else storageSettings.disabledDomains.push(siteKey);
  saveStorageSettings(storageSettings);
}
function boostCurrentTab() { sendMessageToActiveTab({ type: 'FONT_BOLDER_BOOST' }); }
function clearBoost() { sendMessageToActiveTab({ type: 'FONT_BOLDER_CLEAR_TEMPORARY' }); }
function loadActiveTab(callback) {
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    var tab = tabs && tabs[0];
    activeTabId = tab && tab.id;
    try { currentHostname = tab && tab.url ? normalizeSiteKey(new URL(tab.url).hostname) : ''; } catch (error) { currentHostname = ''; }
    callback();
  });
}
function loadStorageSettings(callback) {
  chrome.storage.sync.get(null, function(settings) {
    currentStorageSettings = normalizeStorageSettings(settings);
    if (!isV2Settings(settings)) chrome.storage.sync.set(currentStorageSettings);
    callback();
  });
}

document.addEventListener('DOMContentLoaded', function () {
  localizePopup();
  controls = {
    enabled: document.getElementById('enabled'), fontWeight: document.getElementById('fontWeight'), fontWeightValue: document.getElementById('fontWeightValue'), darken: document.getElementById('darken'), darkenValue: document.getElementById('darkenValue'),
    targetingMode: document.getElementById('targetingMode'), presetValue: document.getElementById('presetValue'), preview: document.getElementById('preview'), globalScope: document.getElementById('globalScope'), siteScope: document.getElementById('siteScope'),
    scopeHint: document.getElementById('scopeHint'), boost: document.getElementById('boost'), clearBoost: document.getElementById('clearBoost'), resetSite: document.getElementById('resetSite'), toggleSiteDisabled: document.getElementById('toggleSiteDisabled'), exceptionHint: document.getElementById('exceptionHint')
  };
  loadActiveTab(function() { loadStorageSettings(function() { hydrateControls(getSettingsForScope()); }); });
  controls.globalScope.addEventListener('click', function() { switchScope('global'); });
  controls.siteScope.addEventListener('click', function() { switchScope('site'); });
  controls.enabled.addEventListener('change', saveAndApply);
  controls.fontWeight.addEventListener('input', markCustomAndSave);
  controls.darken.addEventListener('input', markCustomAndSave);
  controls.targetingMode.addEventListener('change', saveAndApply);
  controls.boost.addEventListener('click', boostCurrentTab);
  controls.clearBoost.addEventListener('click', clearBoost);
  controls.resetSite.addEventListener('click', resetSiteSettings);
  controls.toggleSiteDisabled.addEventListener('click', toggleCurrentSiteDisabled);
  var presetButtons = document.querySelectorAll('.preset-button');
  for (var i = 0; i < presetButtons.length; i++) presetButtons[i].addEventListener('click', function(event) { applyPreset(event.currentTarget.dataset.preset); });
});
