// Chrome tab group color palette
const TAB_GROUP_COLORS = {
  grey:   '#9AA0A6',
  blue:   '#8AB4F8',
  red:    '#F28B82',
  yellow: '#FFF475',
  green:  '#81C995',
  pink:   '#FF8BCB',
  purple: '#D7AEFB',
  cyan:   '#78D9EC',
  orange: '#FCBC7E',
};

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

function createAlarmElement(alarmConfig) {

  const {
    id,
    tab,
    expired,
    running,
    alarmEnd,
    tabGroup
  } = alarmConfig

  console.log(tabGroup)

  let newElement = document.createElement('div');
  newElement.id = `alarm-${id}`;
  newElement.style.display = "flex";
  newElement.style.flexDirection = "row";
  newElement.style.alignItems = "center";
  newElement.style.gap = "12px";
  newElement.style.width = "100%";

  // Vertical color bar
  let colorBar = document.createElement('div');
  colorBar.style.width = "6px";
  colorBar.style.height = "40px";
  colorBar.style.borderRadius = "3px";
  colorBar.style.background = tabGroup ? TAB_GROUP_COLORS[tabGroup.color] : "transparent";
  colorBar.style.marginRight = "1px";

  let elementTxt = document.createElement('p');
  elementTxt.textContent = `${tab.title}`;
  // elementTxt.style.fontWeight = "bold";
  elementTxt.style.margin = "0";
  elementTxt.style.flex = 3;
  elementTxt.style.wordBreak = "break-all";

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
  elementStatusTxt.style.padding = "0px 0px";
  elementCountdown.style.textAlign = "center";

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

  newElement.appendChild(colorBar);
  newElement.appendChild(elementTxt);
  newElement.appendChild(elementInput);
  newElement.appendChild(expired ? elementStatusTxt : running ? elementCountdown : elementStartBtn);
  newElement.appendChild(elementBtn);
  newElement.appendChild(elementDelBtn);

  return newElement;
}