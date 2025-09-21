document.addEventListener('DOMContentLoaded', async () => {
  await loadAlarms();
});

document.getElementById('addAlarm').addEventListener('click', async () => {
  await addAlarmInput();
});

document.getElementById('clearAlarms').addEventListener('click', async () => {
  await clearAllAlarms();
});

async function loadAlarms() {
  let { alarmConfigs } = await chrome.storage.session.get('alarmConfigs');
  alarmConfigs = alarmConfigs ? alarmConfigs : {};

  let alarmsArray = document.getElementById('alarms-array');

  const alarmArrayChildren = Object.values(alarmConfigs)
    .filter(alarmConfig => alarmConfig.active)
    .map(alarmConfig => {
      return createAlarmElement(alarmConfig);
    });
  
  alarmsArray.replaceChildren(...alarmArrayChildren);
}

async function updateBadge() {
  let { alarmConfigs } = await chrome.storage.session.get('alarmConfigs')

  if (alarmConfigs) {
    const expiredCount = Object.values(alarmConfigs).filter(alarm => alarm.expired && alarm.active).length;
    await chrome.action.setBadgeText({ text: expiredCount > 0 ? String(expiredCount) : '' });
  }
}

async function addAlarmInput() {

  let { alarmConfigs } = await chrome.storage.session.get('alarmConfigs')

  alarmConfigs = alarmConfigs ? alarmConfigs : {};

  const tab = await chrome.tabs.query({ active: true, currentWindow: true })
  const tabGroup = tab[0].groupId > 0 ? await chrome.tabGroups.get(tab[0].groupId) : null

  const alarmId = Object.keys(alarmConfigs).length + 1;

  alarmConfigs = {
    ...alarmConfigs,
    [`${alarmId}`]: {
      active: true,
      id: alarmId,
      tab: tab[0],
      tabGroup: tabGroup,
      alarmEnd: null,
      expired: false,
      running: false,
    }
  }

  await chrome.storage.session.set({ alarmConfigs }).then(loadAlarms())
}

async function startAlarm(alarmId) {
  let { alarmConfigs } = await chrome.storage.session.get('alarmConfigs');
  const alarmConfig = alarmConfigs[alarmId];

  const alarmInput = document.getElementById(`alarm-${alarmId}-input`);
  const minutes = alarmInput ? parseInt(alarmInput.value, 10) : null;

  const alarmEnd = Date.now() + minutes * 60 * 1000

  alarmConfigs[alarmId].alarmEnd = alarmEnd;
  alarmConfigs[alarmId].running = true;

  await chrome.alarms.create(`tab-timer-${alarmId}`, { when: alarmEnd });
  await chrome.storage.session.set({ alarmConfigs }).then(loadAlarms())
}

async function switchToTab(tabId, tabURL) {

  const tabs = await chrome.tabs.query({ currentWindow: true })

  if (tabs.map(tab => tab.id).includes(tabId)) {
    // Go to original tab
    chrome.tabs.update(tabId, { active: true });
  } if (tabs.filter(tab => tab.url === tabURL)) {
    // Go to first tab with same URL if possible
    chrome.tabs.update((tabs.filter(tab => tab.url === tabURL))[0].id, { active: true });
  } else {
    // Open new tab with same URL
    chrome.tabs.create({ url: tabURL })
  }
}

async function deleteAlarm(alarmId) {

  chrome.alarms.clear(`tab-timer-${alarmId}`);

  let { alarmConfigs } = await chrome.storage.session.get('alarmConfigs');
  alarmConfigs[alarmId].active = false;

  await chrome.storage.session.set({ alarmConfigs }).then(loadAlarms())
  await updateBadge();
}

async function clearAllAlarms() {

  let { alarmConfigs } = await chrome.storage.session.get('alarmConfigs');

  Object.values(alarmConfigs).map(config => {
      chrome.alarms.clear(`tab-timer-${config.id}`);
  })

  await chrome.storage.session.clear().then(loadAlarms())
  await chrome.action.setBadgeText({ text: '' });
}