importScripts('utils.js');

chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setBadgeBackgroundColor({ color: "#D93025" });
  if (chrome.action.setBadgeTextColor) {
    chrome.action.setBadgeTextColor({ color: "#FFFFFF" });
  }
});

chrome.alarms.onAlarm.addListener(async (alarm) => {

  const alarmId = alarm.name.split('-')[2];

  let { alarmConfigs } = await chrome.storage.session.get('alarmConfigs')
  alarmConfigs[alarmId].expired = true;
  alarmConfigs[alarmId].running = false;

  await chrome.storage.session.set({ alarmConfigs }).then(updateBadge());
});
