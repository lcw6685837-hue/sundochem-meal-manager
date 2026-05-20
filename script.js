// 👇 캡틴의 고유 구글 Apps Script 웹 앱 URL
const WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbzaGhrbsTtD5eWlchjFteHWkSxN3Tx0HILuWAoT108RWivqLncW0p7tG64Fw4v6AY3j/exec";

const todayMealRecords = {};
const introScreen = document.getElementById("introScreen");
const selectionScreen = document.getElementById("selectionScreen");
let idleTimer = null;
const IDLE_TIMEOUT = 30000;

let globalSelectedMeal = null;
let tempVisitorType = "";
let tempVisitorCountStr = "1";

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
  globalSelectedMeal = null;
  document
    .querySelectorAll(".g-meal-btn")
    .forEach((btn) => btn.classList.remove("active"));
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
  document
    .querySelectorAll(".g-meal-btn")
    .forEach((btn) => btn.classList.remove("active"));
  document.getElementById(`g-meal-${meal}`).classList.add("active");
  resetIdleTimer();
}

// -----------------------------------------------------------------
// 🍒 캡틴 지시 완수: '종료' 시 화면 100% 초기화 함수 (태블릿 웹뷰 호환성 극대화)
// -----------------------------------------------------------------
function resetMealUI() {
  // 1. 모든 직원의 식사 완료 색상을 하나씩 안전하게 삭제 (태블릿 에러 방지)
  document.querySelectorAll(".name-btn").forEach((btn) => {
    btn.classList.remove("done-아침");
    btn.classList.remove("done-점심");
    btn.classList.remove("done-저녁");
  });

  // 2. 선택된 식사(아침/점심/저녁) 활성화 상태 해제
  globalSelectedMeal = null;
  document
    .querySelectorAll(".g-meal-btn")
    .forEach((btn) => btn.classList.remove("active"));

  // 3. 알림 메시지 띄우기
  showToast("🔄 모든 식사 활성화 상태가 초기화되었습니다.");
  resetIdleTimer();
}
// -----------------------------------------------------------------

function handleEmployeeClick(empNum, empName) {
  if (!globalSelectedMeal) {
    showToast("🚨 우측 상단의 식사(아침/점심/저녁)를 먼저 선택하세요!", true);
    return;
  }
  if (
    todayMealRecords[empNum] &&
    todayMealRecords[empNum].includes(globalSelectedMeal)
  ) {
    showToast(
      `🚨 [${empName}]님은 이미 '${globalSelectedMeal}' 식사가 완료되었습니다.`,
      true,
    );
    return;
  }
  showToast(`⏳ [${empName}]님 저장 중...`);
  submitDataDirect(
    empNum,
    empName,
    globalSelectedMeal,
    "사내직원",
    "선도화학",
    1,
    `emp-btn-${empNum}`,
  );
}

function handleVisitorClick(visitorType) {
  if (!globalSelectedMeal) {
    showToast("🚨 우측 상단의 식사(아침/점심/저녁)를 먼저 선택하세요!", true);
    return;
  }
  tempVisitorType = visitorType;
  tempVisitorCountStr = "1";
  document.getElementById("modalTitle").innerText =
    `[${visitorType}] 식사 인원이 몇 명입니까?`;
  document.getElementById("visitorCountDisplay").innerText =
    tempVisitorCountStr;
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
  document.getElementById("visitorCountDisplay").innerText =
    tempVisitorCountStr;
}

function deleteVisitorCount() {
  tempVisitorCountStr = tempVisitorCountStr.slice(0, -1);
  if (tempVisitorCountStr === "") tempVisitorCountStr = "0";
  document.getElementById("visitorCountDisplay").innerText =
    tempVisitorCountStr;
}

function clearVisitorCount() {
  tempVisitorCountStr = "0";
  document.getElementById("visitorCountDisplay").innerText =
    tempVisitorCountStr;
}

function confirmVisitorCount() {
  let count = parseInt(tempVisitorCountStr);
  if (isNaN(count) || count <= 0) {
    showToast("🚨 인원수를 정확히 입력해 주세요.", true);
    return;
  }
  closeVisitorModal();
  showToast(`⏳ [${tempVisitorType}] 저장 중...`);
  submitDataDirect(
    "-",
    tempVisitorType,
    globalSelectedMeal,
    "방문객",
    tempVisitorType,
    count,
    null,
  );
}

function submitDataDirect(empNum, empName, meal, type, group, count, btnId) {
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
    redirect: "follow",
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.result === "success") {
        if (empNum !== "-") {
          if (!todayMealRecords[empNum]) todayMealRecords[empNum] = [];
          todayMealRecords[empNum].push(meal);
          const targetBtn = document.getElementById(btnId);
          if (targetBtn) targetBtn.classList.add(`done-${meal}`);
        }
        showToast(`✅ [${empName}] 식수(${count}명)가 완료되었습니다!`);
        resetIdleTimer();
      } else {
        showToast("🚨 저장 실패! 관리자에게 문의하세요.", true);
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      showToast("🚨 서버 통신 에러가 발생했습니다.", true);
    });
}

function showToast(message, isError = false) {
  const toast = document.getElementById("toast");
  toast.innerText = message;
  isError ? toast.classList.add("error") : toast.classList.remove("error");
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, 1500);
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
          memoText.style.animation =
            "scroll-right 30s linear infinite, zigzag 2.5s ease-in-out infinite";
        } else if (savedMemo === "" && currentDisplayMemo !== defaultMessage) {
          memoText.textContent = defaultMessage;
          messageInput.value = "";
          memoText.style.animation = "none";
          void memoText.offsetWidth;
          memoText.style.animation =
            "scroll-right 30s linear infinite, zigzag 2.5s ease-in-out infinite";
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

  const daysData = [
    { text: "월", index: 1 },
    { text: "화", index: 2 },
    { text: "수", index: 3 },
    { text: "목", index: 4 },
    { text: "금", index: 5 },
    { text: "토", index: 6 },
    { text: "일", index: 0 },
  ];

  let dayHtml = "";
  daysData.forEach((d) => {
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
  memoText.style.animation =
    "scroll-right 30s linear infinite, zigzag 2.5s ease-in-out infinite";

  const memoPayload = { action: "saveMemo", memo: newMemo };
  fetch(WEB_APP_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(memoPayload),
    redirect: "follow",
  }).catch((err) => console.error("메모 클라우드 전송 실패:", err));
});
