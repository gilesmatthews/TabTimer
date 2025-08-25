document.addEventListener('DOMContentLoaded', async () => {
  await loadAlarms();
});

document.getElementById('addAlarm').addEventListener('click', async () => {
  await addAlarmInput();
});

chrome.alarms.onAlarm.addListener(async (alarm) => {

  console.log('Alarm triggered:', alarm);

  const alarmId = alarm.name.split('-')[2];

  let { alarmConfigs } = await chrome.storage.session.get('alarmConfigs')
  alarmConfigs[alarmId].expired = true;
  alarmConfigs[alarmId].running = false;

  const expiredCount = Object.values(alarmConfigs).filter(alarm => alarm.expired && alarm.active).length;
  chrome.action.setBadgeText({ text: expiredCount > 0 ? String(expiredCount) : '' });

  await chrome.storage.session.set({ alarmConfigs }).then(loadAlarms());
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
}

function createAlarmElement(id, tab, expired, running, alarmEnd) {
  let newElement = document.createElement('div');
  newElement.id = `alarm-${id}`;
  newElement.style.display = "flex";
  newElement.style.flexDirection = "row";
  newElement.style.alignItems = "center";
  newElement.style.gap = "12px";
  newElement.style.width = "100%";

  let elementTxt = document.createElement('p');
  elementTxt.textContent = `${tab.title}`;
  elementTxt.style.fontWeight = "bold";
  elementTxt.style.margin = "0";
  elementTxt.style.flex = 3;

  let elementInput = document.createElement('input');
  elementInput.id = `alarm-${id}-input`;
  elementInput.type = "number";
  elementInput.placeholder = "Mins";
  elementInput.style.flex = 1;
  elementInput.style.visibility = running || expired ? "hidden" : "visible";

  let elementCountdown = document.createElement('span');
  elementCountdown.id = `alarm-${id}-countdown`;
  elementCountdown.style.flex = 1;
  elementCountdown.style.fontWeight = "bold";
  elementCountdown.style.textAlign = "center";

  let countdownInterval = null;
  if (running && alarmEnd) {
    function updateCountdown() {
      const now = Date.now();
      let diff = Math.max(0, Math.floor((alarmEnd - now) / 1000));
      const mins = Math.floor(diff / 60);
      const secs = diff % 60;
      elementCountdown.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
      if (diff <= 0 && countdownInterval) {
        clearInterval(countdownInterval);
        elementCountdown.textContent = "0:00";
      }
    }
    updateCountdown();
    countdownInterval = setInterval(updateCountdown, 1000);
  } else {
    elementCountdown.textContent = "";
  }

  let elementStatusTxt = document.createElement('p');
  elementStatusTxt.textContent = expired ? "Finished" : "Error";
  elementStatusTxt.style.margin = "0";
  elementStatusTxt.style.flex = 1;

  let elementStartBtn = document.createElement('button');
  elementStartBtn.id = `alarm-${id}-start`;
  elementStartBtn.textContent = "Start";
  elementStartBtn.style.flex = 1;

  elementStartBtn.addEventListener('click', () => {
    startAlarm(id);
  });

  let elementBtn = document.createElement('button');
  elementBtn.id = `alarm-${id}-go`;
  elementBtn.textContent = "Go-to";
  elementBtn.style.flex = 1;

  elementBtn.addEventListener('click', () => {
    switchToTab(tab.id);
  });

  let elementDelBtn = document.createElement('button');
  elementDelBtn.id = `alarm-${id}-del`;
  elementDelBtn.textContent = "X";
  elementDelBtn.style.border = "2px solid #d32f2f";
  elementDelBtn.style.color = "#d32f2f";
  elementDelBtn.style.background = "#fff";

  elementDelBtn.addEventListener('click', () => {
    deleteAlarm(id);
  });

  newElement.appendChild(elementTxt);
  newElement.appendChild(elementInput);
  newElement.appendChild(expired ? elementStatusTxt : running ? elementCountdown : elementStartBtn);
  newElement.appendChild(elementBtn);
  newElement.appendChild(elementDelBtn);

  return newElement;
}