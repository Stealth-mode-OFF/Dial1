document.addEventListener('DOMContentLoaded', () => {
  const enabledToggle = document.getElementById('enabledToggle');
  const apiEndpointInput = document.getElementById('apiEndpoint');
  const authTokenInput = document.getElementById('authToken');
  const myNameInput = document.getElementById('myName');
  const saveBtn = document.getElementById('saveBtn');
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const infoBox = document.getElementById('infoBox');
  const errorBox = document.getElementById('errorBox');
  const advancedToggle = document.getElementById('advancedToggle');
  const advancedSection = document.getElementById('advancedSection');

  function showError(message) {
    errorBox.textContent = message;
    errorBox.classList.add('show');
  }

  function clearError() {
    errorBox.textContent = '';
    errorBox.classList.remove('show');
  }

  function updateStatus({ enabled, apiEndpoint }) {
    const ok = Boolean(enabled && apiEndpoint);
    if (ok) {
      statusDot.classList.add('active');
      statusText.textContent = 'Enabled';
      infoBox.classList.add('show');
      infoBox.textContent = 'Listening to Meet captions…';
    } else if (enabled && !apiEndpoint) {
      statusDot.classList.remove('active');
      statusText.textContent = 'Needs endpoint';
      infoBox.classList.remove('show');
    } else {
      statusDot.classList.remove('active');
      statusText.textContent = 'Disabled';
      infoBox.classList.remove('show');
    }
  }

  function load() {
    chrome.storage.local.get(['enabled', 'apiEndpoint', 'authToken', 'myName'], (result) => {
      const enabled = Boolean(result.enabled);
      const apiEndpoint = (result.apiEndpoint || '').toString().trim();
      const authToken = (result.authToken || '').toString().trim();
      const myName = (result.myName || '').toString().trim();

      enabledToggle.checked = enabled;
      apiEndpointInput.value = apiEndpoint;
      authTokenInput.value = authToken;
      myNameInput.value = myName;

      clearError();
      updateStatus({ enabled, apiEndpoint });
    });
  }

  function save() {
    const enabled = Boolean(enabledToggle.checked);
    const apiEndpoint = (apiEndpointInput.value || '').toString().trim();
    const authToken = (authTokenInput.value || '').toString().trim();
    const myName = (myNameInput.value || '').toString().trim();

    clearError();

    if (enabled && (!apiEndpoint || apiEndpoint.includes('<project>'))) {
      showError('Set a valid API Endpoint in Advanced Settings.');
      advancedSection.classList.add('show');
      updateStatus({ enabled, apiEndpoint: '' });
      return;
    }

    chrome.storage.local.set({ enabled, apiEndpoint, authToken, myName }, () => {
      updateStatus({ enabled, apiEndpoint });
    });
  }

  enabledToggle.addEventListener('change', save);
  saveBtn.addEventListener('click', save);

  advancedToggle.addEventListener('click', (e) => {
    e.preventDefault();
    advancedSection.classList.toggle('show');
  });

  // Live status updates when storage changes
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') return;
    const enabled = changes.enabled ? Boolean(changes.enabled.newValue) : enabledToggle.checked;
    const apiEndpoint = changes.apiEndpoint ? String(changes.apiEndpoint.newValue || '').trim() : apiEndpointInput.value.trim();
    updateStatus({ enabled, apiEndpoint });
  });

  load();
});
