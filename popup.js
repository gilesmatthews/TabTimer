document.addEventListener('DOMContentLoaded', async () => {
  await loadAlarms();
});

document.getElementById('addAlarm').addEventListener('click', async () => {
  await addAlarmInput();
});

async function loadAlarms() {
  let { alarmConfigs } = await chrome.storage.session.get('alarmConfigs');
  alarmConfigs = alarmConfigs ? alarmConfigs : {};

  let alarmsArray = document.getElementById('alarms-array');

  const alarmArrayChildren = Object.values(alarmConfigs)
    .filter(alarm => alarm.active)
    .map(alarm => {
      return createAlarmElement(alarm.id, alarm.tab, alarm.expired, alarm.running, alarm.alarmEnd);
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
  const alarmId = Object.keys(alarmConfigs).length + 1;

  alarmConfigs = {
    ...alarmConfigs,
    [`${alarmId}`]: {
      active: true,
      id: alarmId,
      tab: tab[0],
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

function switchToTab(tabId) {
  chrome.tabs.update(tabId, { active: true });
}

async function deleteAlarm(alarmId) {

  chrome.alarms.clear(`tab-timer-${alarmId}`);

  let { alarmConfigs } = await chrome.storage.session.get('alarmConfigs');
  alarmConfigs[alarmId].active = false;

  await chrome.storage.session.set({ alarmConfigs }).then(loadAlarms())
  await updateBadge();
}
