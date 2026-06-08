// 👇 캡틴의 고유 구글 Apps Script 웹 앱 URL
const WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbzaGhrbsTtD5eWlchjFteHWkSxN3Tx0HILuWAoT108RWivqLncW0p7tG64Fw4v6AY3j/exec";

let todayMealRecords = {};
const introScreen = document.getElementById("introScreen");
const selectionScreen = document.getElementById("selectionScreen");
let idleTimer = null;
const IDLE_TIMEOUT = 10800000; 

let globalSelectedMeal = null; 
let tempVisitorType = "";
let tempVisitorCountStr = "1";

let dailyCounts = { "아침": 0, "점심": 0, "저녁": 0, "date": new Date().toLocaleDateString() };

function loadLocalCounts() {
  const saved = localStorage.getItem('sundo_daily_counts');
  if (saved) {
    const parsed = JSON.parse(saved);
    if (parsed.date === new Date().toLocaleDateString()) {
      dailyCounts = parsed;
    } else {
      saveLocalCounts();
    }
  } else {
    saveLocalCounts();
  }
  updateCountUI();
}

function saveLocalCounts() {
  localStorage.setItem('sundo_daily_counts', JSON.stringify(dailyCounts));
}

function updateCountUI() {
  document.getElementById('count-아침').innerText = dailyCounts["아침"];
  document.getElementById('count-점심').innerText = dailyCounts["점심"];
  document.getElementById('count-저녁').innerText = dailyCounts["저녁"];
  document.getElementById('count-total').innerText = dailyCounts["아침"] + dailyCounts["점심"] + dailyCounts["저녁"];
}

function incrementCount(meal, count) {
  dailyCounts[meal] += count;
  saveLocalCounts();
  updateCountUI();
}

loadLocalCounts();

function enterKiosk() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch((err) => {
      console.log("전체화면 전환을 지원하지 않는 기기/브라우저입니다.");
    });
  }
  introScreen.classList.add("hidden");
  selectionScreen.classList.remove("d-none");
  resetIdleTimer(); 
}

function returnToKioskIntro() {
  introScreen.classList.remove("hidden"); 
  selectionScreen.classList.add("d-none");
  closeVisitorModal(); 
  clearTimeout(idleTimer); 
}

function resetIdleTimer() {
  if (introScreen.classList.contains("hidden")) {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(returnToKioskIntro, IDLE_TIMEOUT);
  }
}

document.addEventListener("click", resetIdleTimer);
document.addEventListener("touchstart", resetIdleTimer);

function setGlobalMeal(meal) {
  globalSelectedMeal = meal;
  document.querySelectorAll('.g-meal-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`g-meal-${meal}`).classList.add('active');
  resetIdleTimer();
}

function resetMealUI() {
  document.querySelectorAll('.name-btn').forEach(btn => {
    btn.classList.remove('done-아침');
    btn.classList.remove('done-점심');
    btn.classList.remove('done-저녁');
  });
  globalSelectedMeal = null;
  document.querySelectorAll('.g-meal-btn').forEach(btn => btn.classList.remove('active'));
  showToast("🔄 모든 식사 활성화 상태가 초기화되었습니다.");
  resetIdleTimer();
}

function handleEmployeeClick(empNum, empName) {
  if (!globalSelectedMeal) {
    showToast("🚨 우측 상단의 식사(아침/점심/저녁)를 먼저 선택하세요!", true);
    return;
  }
  if (todayMealRecords[empNum] && todayMealRecords[empNum].includes(globalSelectedMeal)) {
    showToast(`🚨 [${empName}]님은 이미 '${globalSelectedMeal}' 식사가 완료되었습니다.`, true);
    return;
  }

  if (!todayMealRecords[empNum]) todayMealRecords[empNum] = [];
  todayMealRecords[empNum].push(globalSelectedMeal);
  
  const targetBtn = document.getElementById(`emp-btn-${empNum}`);
  if(targetBtn) targetBtn.classList.add(`done-${globalSelectedMeal}`);
  
  incrementCount(globalSelectedMeal, 1);
  showToast(`✅ [${empName}] 접수 완료!`);
  resetIdleTimer();

  submitDataDirectBg(empNum, empName, globalSelectedMeal, "사내직원", "선도화학", 1);
}

function handleVisitorClick(visitorType) {
  if (!globalSelectedMeal) {
    showToast("🚨 우측 상단의 식사(아침/점심/저녁)를 먼저 선택하세요!", true);
    return;
  }
  tempVisitorType = visitorType;
  tempVisitorCountStr = "1";
  document.getElementById("modalTitle").innerText = `[${visitorType}] 식사 인원이 몇 명입니까?`;
  document.getElementById("visitorCountDisplay").innerText = tempVisitorCountStr;
  document.getElementById("visitorModal").style.display = "flex"; 
  resetIdleTimer();
}

function closeVisitorModal() {
  document.getElementById("visitorModal").style.display = "none";
  tempVisitorType = "";
}

function inputVisitorCount(num) {
  if (tempVisitorCountStr === "1" && tempVisitorCountStr.length === 1) {
    tempVisitorCountStr = num.toString();
  } else {
    if (tempVisitorCountStr.length < 3) tempVisitorCountStr += num;
  }
  document.getElementById("visitorCountDisplay").innerText = tempVisitorCountStr;
}

function deleteVisitorCount() {
  tempVisitorCountStr = tempVisitorCountStr.slice(0, -1);
  if (tempVisitorCountStr === "") tempVisitorCountStr = "0";
  document.getElementById("visitorCountDisplay").innerText = tempVisitorCountStr;
}

function clearVisitorCount() {
  tempVisitorCountStr = "0";
  document.getElementById("visitorCountDisplay").innerText = tempVisitorCountStr;
}

function confirmVisitorCount() {
  let count = parseInt(tempVisitorCountStr);
  if (isNaN(count) || count <= 0) {
    showToast("🚨 인원수를 정확히 입력해 주세요.", true);
    return;
  }
  closeVisitorModal();

  incrementCount(globalSelectedMeal, count);
  showToast(`✅ [${tempVisitorType}] ${count}명 접수 완료!`);
  resetIdleTimer();

  // 🍒 [캡틴의 요청사항 반영]
  // 기본적으로 선택한 방문객 타입을 소속(group)으로 사용하되,
  // 'IPA산업'을 눌렀을 때는 시트에 'IPA 소속'이라고 예쁘게 변환해서 저장합니다.
  let visitorGroup = tempVisitorType;
  if (visitorGroup === "IPA산업") {
    visitorGroup = "IPA 소속";
  }

  // C열(구분)은 "방문객", D열(소속)은 변환된 visitorGroup을 전송합니다.
  // 사번(empNum)과 이름(empName) 자리는 방문객이므로 깔끔하게 빈칸("")으로 비워둡니다.
  submitDataDirectBg("", "", globalSelectedMeal, "방문객", visitorGroup, count);
}

function submitDataDirectBg(empNum, empName, meal, type, group, count) {
  const payload = {
    date: new Date().toLocaleDateString(),
    time: new Date().toLocaleTimeString(),
    type: type,
    group: group,
    empNumber: empNum,
    empName: empName,
    meal: meal,
    count: count,
  };

  fetch(WEB_APP_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
    redirect: "follow"
  }).catch((error) => console.error("백그라운드 통신 에러:", error));
}

function showToast(message, isError = false) {
  const toast = document.getElementById("toast");
  toast.innerText = message;
  isError ? toast.classList.add("error") : toast.classList.remove("error");
  toast.classList.add("show");
  setTimeout(() => { toast.classList.remove("show"); }, 1500);
}

const memoContainer = document.getElementById("memoContainer");
const memoDisplay = document.getElementById("memoDisplay");
const memoText = document.getElementById("memoText");
const messageInput = document.getElementById("messageInput");
const defaultMessage = "[알림] 이곳을 터치하여 식당 전달사항을 입력하세요.";
let isMemoFocused = false; 

function loadEmployeeDataAndMemo() {
  const cacheBustUrl = `${WEB_APP_URL}?_=${new Date().getTime()}`;
  fetch(cacheBustUrl, { redirect: "follow" })
    .then((response) => response.json())
    .then((data) => {
      if (data.memo !== undefined && !isMemoFocused) {
          const savedMemo = data.memo ? data.memo.trim() : "";
          const currentDisplayMemo = memoText.textContent.trim();
          
          if (savedMemo !== "" && savedMemo !== currentDisplayMemo) {
            memoText.textContent = savedMemo;
            messageInput.value = savedMemo;
            memoText.style.animation = "none";
            void memoText.offsetWidth; 
            memoText.style.animation = "scroll-right 30s linear infinite, zigzag 2.5s ease-in-out infinite";
          } else if (savedMemo === "" && currentDisplayMemo !== defaultMessage) {
            memoText.textContent = defaultMessage;
            messageInput.value = "";
            memoText.style.animation = "none";
            void memoText.offsetWidth;
            memoText.style.animation = "scroll-right 30s linear infinite, zigzag 2.5s ease-in-out infinite";
          }
      }
    })
    .catch((error) => console.error("실시간 클라우드 에러:", error));
}
loadEmployeeDataAndMemo();
setInterval(loadEmployeeDataAndMemo, 30000); 

function updateClock() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const date = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  const dayOfWeek = now.getDay();
  const currentDateString = now.toLocaleDateString();

  if (dailyCounts.date !== currentDateString) {
      dailyCounts = { "아침": 0, "점심": 0, "저녁": 0, "date": currentDateString };
      saveLocalCounts();
      updateCountUI();
      for (let prop in todayMealRecords) { delete todayMealRecords[prop]; }
      document.querySelectorAll('.name-btn').forEach(btn => {
        btn.classList.remove('done-아침', 'done-점심', 'done-저녁');
      });
  }

  const daysData = [
    { text: "월", index: 1 }, { text: "화", index: 2 }, { text: "수", index: 3 },
    { text: "목", index: 4 }, { text: "금", index: 5 }, { text: "토", index: 6 }, { text: "일", index: 0 }
  ];

  let dayHtml = "";
  daysData.forEach(d => {
    const isActive = d.index === dayOfWeek ? "active" : "";
    let colorClass = "";
    if (d.text === "토") colorClass = "day-sat";
    if (d.text === "일") colorClass = "day-sun";
    
    dayHtml += `<div class="day-item ${isActive} ${colorClass}"><div class="dot"></div><span>${d.text}</span></div>`;
  });

  document.getElementById("clockDisplay").innerHTML = `
    <div class="led-clock-wrapper">
      <div class="led-left">
        <div class="led-date">${year}. ${month}. ${date}.</div>
        <div class="led-days">${dayHtml}</div>
      </div>
      <div class="led-time">${hours}:${minutes} <span class="sec">${seconds}</span></div>
    </div>
  `;
}
setInterval(updateClock, 1000);
updateClock();

memoContainer.addEventListener("click", () => {
  isMemoFocused = true; 
  memoDisplay.style.display = "none";
  messageInput.style.display = "block";
  messageInput.focus();
});

messageInput.addEventListener("blur", () => {
  isMemoFocused = false; 
  const newMemo = messageInput.value.trim();
  
  if (newMemo) memoText.textContent = newMemo;
  else memoText.textContent = defaultMessage;
  
  messageInput.style.display = "none";
  memoDisplay.style.display = "flex";
  memoText.style.animation = "none";
  void memoText.offsetWidth;
  memoText.style.animation = "scroll-right 30s linear infinite, zigzag 2.5s ease-in-out infinite"; 

  const memoPayload = { action: "saveMemo", memo: newMemo };
  fetch(WEB_APP_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(memoPayload),
    redirect: "follow" 
  }).catch(err => console.error("메모 클라우드 전송 실패:", err));
});