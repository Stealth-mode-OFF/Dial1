// Extension Popup Script - Handle user interactions
document.addEventListener('DOMContentLoaded', () => {
  const callIdInput = document.getElementById('callId');
  const apiEndpointInput = document.getElementById('apiEndpoint');
  const authTokenInput = document.getElementById('authToken');
  const myNameInput = document.getElementById('myName');
  const connectBtn = document.getElementById('connectBtn');
  const disconnectBtn = document.getElementById('disconnectBtn');
  const clearBtn = document.getElementById('clearBtn');
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const infoBox = document.getElementById('infoBox');
  const errorBox = document.getElementById('errorBox');
  const advancedToggle = document.getElementById('advancedToggle');
  const advancedSection = document.getElementById('advancedSection');

  // Load saved settings
  chrome.storage.local.get(['callId', 'sessionCode', 'apiEndpoint', 'authToken', 'myName'], (result) => {
    const savedCallId = result.callId || result.sessionCode;
    if (savedCallId) {
      callIdInput.value = savedCallId;
      updateStatus(true);
    }
    if (result.apiEndpoint) {
      apiEndpointInput.value = result.apiEndpoint;
    }
    if (result.authToken) {
      authTokenInput.value = result.authToken;
    }
    if (result.myName) {
      myNameInput.value = result.myName;
    }
  });

  // Connect button
  connectBtn.addEventListener('click', () => {
    const code = callIdInput.value.trim().toUpperCase();
    const endpoint = apiEndpointInput.value.trim();

    if (!code) {
      showError('Please enter a Call ID');
      return;
    }

    if (code.length < 8) {
      showError('Call ID must be at least 8 characters');
      return;
    }

    if (!endpoint || endpoint.includes('<project>')) {
      showError('Set a valid API Endpoint in Advanced Settings');
      advancedSection.classList.add('show');
      return;
    }

    // Save to extension storage
    chrome.storage.local.set({
      callId: code,
      sessionCode: code, // backward compatibility for older builds
      apiEndpoint: endpoint,
      authToken: authTokenInput.value.trim(),
      myName: myNameInput.value.trim(),
    });

    updateStatus(true);
    infoBox.style.display = 'block';
    errorBox.classList.remove('show');
  });

  // Disconnect button
  disconnectBtn.addEventListener('click', () => {
    chrome.storage.local.remove(['callId', 'sessionCode']);
    callIdInput.value = '';
    updateStatus(false);
    infoBox.style.display = 'none';
  });

  // Clear button
  clearBtn.addEventListener('click', () => {
    callIdInput.value = '';
    callIdInput.focus();
  });

  // Advanced toggle
  advancedToggle.addEventListener('click', (e) => {
    e.preventDefault();
    advancedSection.classList.toggle('show');
  });

  // Enter key on session code input
  callIdInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      connectBtn.click();
    }
  });

  // Help link
  document.getElementById('help').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({
      url: 'https://echopulse.cz/help/meet-coach',
    });
  });

  // Update UI based on connection status
  function updateStatus(connected) {
    if (connected) {
      statusDot.classList.add('active');
      statusText.textContent = 'Connected';
      connectBtn.style.display = 'none';
      disconnectBtn.style.display = 'flex';
    } else {
      statusDot.classList.remove('active');
      statusText.textContent = 'Disconnected';
      connectBtn.style.display = 'flex';
      disconnectBtn.style.display = 'none';
    }
  }

  // Show error message
  function showError(message) {
    errorBox.textContent = message;
    errorBox.classList.add('show');
  }
});
