chrome.runtime.onInstalled.addListener(() => {
  console.log('SmartLocator AI installed');
});

// Prevent the service worker from being killed mid-session.
chrome.alarms.create('keepAlive', { periodInMinutes: 0.4 });
chrome.alarms.onAlarm.addListener((_alarm) => { /* no-op */ });
