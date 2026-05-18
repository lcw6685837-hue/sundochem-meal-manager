// 👇 캡틴의 고유 구글 Apps Script 웹 앱 URL
const WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbzaGhrbsTtD5eWlchjFteHWkSxN3Tx0HILuWAoT108RWivqLncW0p7tG64Fw4v6AY3j/exec";

let employeeDB = {};
const todayMealRecords = {};
let currentInputNumber = "";
let currentEmpName = "";
let selectedMeal = null;

let selectedVisitor = null;
let visitorCount = 0;
let tempVisitorType = "";
let tempVisitorCountStr = "1";

const introScreen = document.getElementById("introScreen");
let idleTimer = null;
const IDLE_TIMEOUT = 60000; // 60초 무입력 시 자동 복귀

// -----------------------------------------------------------------
// 🍒 화면 전환 로직 제어 (Intro -> Selection -> Dashboard)
// -----------------------------------------------------------------
function enterKiosk() {
  introScreen.classList.add("hidden");
  document.getElementById("selectionScreen").classList.remove("d-none");
  document.getElementById("dashboardScreen").classList.add("d-none");
  resetIdleTimer(); 
}

// 완전히 처음(입장하기)으로 돌아가는 함수 (60초 무입력 시 작동)
function returnToKioskIntro() {
  introScreen.classList.remove("hidden"); 
  document.getElementById("selectionScreen").classList.add("d-none");
  document.getElementById("dashboardScreen").classList.add("d-none");
  clearSelection(); 
  closeVisitorModal(); 
}

// 🍒 신규: 식사 저장 완료 후 다음 사람을 위해 '선택 화면'으로 돌아가는 함수
function returnToSelectionScreen() {
  document.getElementById("dashboardScreen").classList.add("d-none");
  document.getElementById("selectionScreen").classList.remove("d-none");
  clearSelection(); 
  resetIdleTimer(); 
}

function resetIdleTimer() {
  if (introScreen.classList.contains("hidden")) {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(returnToKioskIntro, IDLE_TIMEOUT);
  }
}

document.addEventListener("click", resetIdleTimer);
document.addEventListener("touchstart", resetIdleTimer);

// 선택 데이터 초기화 함수
function clearSelection() {
  currentInputNumber = "";
  currentEmpName = "";
  selectedVisitor = null;
  visitorCount = 0;
  selectedMeal = null;
  document.querySelectorAll(".meal-btn").forEach((btn) => btn.classList.remove("active"));
}

// -----------------------------------------------------------------
// 🍒 사원/방문객 선택 연결 브릿지 (모달 및 화면 전환 연동)
// -----------------------------------------------------------------
function selectEmployeeFromList(empNum, empName) {
  clearSelection(); // 기존 데이터 초기화
  currentInputNumber = empNum;
  currentEmpName = empName;
  
  // 대시보드 화면에 이름 세팅
  document.getElementById("empNameDisplay").innerText = currentEmpName;
  
  // 화면 전환
  document.getElementById("selectionScreen").classList.add("d-none");
  document.getElementById("dashboardScreen").classList.remove("d-none");
  resetIdleTimer();
}

function selectVisitorFromList(visitorType) {
  clearSelection();
  tempVisitorType = visitorType;
  tempVisitorCountStr = "1";
  document.getElementById("modalTitle").innerText = `[${visitorType}] 식사 인원이 몇 명입니까?`;
  document.getElementById("visitorCountDisplay").innerText = tempVisitorCountStr;
  document.getElementById("visitorModal").style.display = "flex"; // 모달 띄우기
  resetIdleTimer();
}
// -----------------------------------------------------------------

function toggleFullScreen() {
  if (!document.fullscreenElement) {
    document.documentElement
      .requestFullscreen()
      .catch((err) => console.error(`전체화면 전환 에러: ${err.message}`));
  } else {
    if (document.exitFullscreen) document.exitFullscreen();
  }
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

function loadEmployeeData() {
  fetch(WEB_APP_URL, { redirect: "follow" })
    .then((response) => response.json())
    .then((data) => {
      employeeDB = data;
    })
    .catch((error) => {
      console.error("명단 로드 실패:", error);
      showToast("🚨 서버와 통신 중 에러가 발생했습니다.", true);
    });
}
loadEmployeeData();

function updateClock() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const date = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  document.getElementById("clockDisplay").innerHTML = `
    <span>${year}</span> <span>${month}</span> <span>${date}</span> : 
    <span>${hours}</span> <span>${minutes}</span> <span>${seconds}</span>
  `;
}
setInterval(updateClock, 1000);
updateClock();

// --- 메모 패널 로직 ---
const memoContainer = document.getElementById("memoContainer");
const memoDisplay = document.getElementById("memoDisplay");
const memoText = document.getElementById("memoText");
const messageInput = document.getElementById("messageInput");
const defaultMessage = "[알림] 이곳을 터치하여 식당 전달사항을 입력하세요.";

function loadMemo() {
  const savedMemo = localStorage.getItem("sundochem_memo");
  if (savedMemo && savedMemo.trim() !== "") {
    memoText.textContent = savedMemo;
    messageInput.value = savedMemo;
  } else {
    memoText.textContent = defaultMessage;
    messageInput.value = "";
  }
}
loadMemo();

memoContainer.addEventListener("click", () => {
  memoDisplay.style.display = "none";
  messageInput.style.display = "block";
  messageInput.focus();
});

messageInput.addEventListener("blur", () => {
  const newMemo = messageInput.value.trim();
  if (newMemo) {
    localStorage.setItem("sundochem_memo", newMemo);
    memoText.textContent = newMemo;
  } else {
    localStorage.removeItem("sundochem_memo");
    memoText.textContent = defaultMessage;
  }
  messageInput.style.display = "none";
  memoDisplay.style.display = "flex";
  memoText.style.animation = "none";
  void memoText.offsetWidth;
  memoText.style.animation = "scroll-right 15s linear infinite, rainbow-text 6s linear infinite";
});

// --- 식사 종류 선택 로직 ---
function selectMeal(mealType) {
  if (
    currentInputNumber !== "" &&
    todayMealRecords[currentInputNumber] &&
    todayMealRecords[currentInputNumber].includes(mealType)
  ) {
    showToast(`🚨 이미 '${mealType}' 식사가 완료된 사원입니다.`, true);
    return;
  }
  document.querySelectorAll(".meal-btn").forEach((btn) => btn.classList.remove("active"));
  selectedMeal = mealType;
  document.getElementById(`meal-${mealType}`).classList.add("active");
}

// --- 방문객 모달 키패드 로직 ---
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

  visitorCount = count;
  selectedVisitor = tempVisitorType;
  
  // 방문객 정보를 대시보드 화면에 세팅
  document.getElementById("empNameDisplay").innerText = `${selectedVisitor} (${visitorCount}명)`;

  closeVisitorModal();

  // 화면 전환
  document.getElementById("selectionScreen").classList.add("d-none");
  document.getElementById("dashboardScreen").classList.remove("d-none");
  resetIdleTimer();
}

// --- 최종 데이터 서버 전송 로직 ---
function submitData() {
  if (!currentEmpName && !selectedVisitor) {
    showToast("🚨 본인 확인 또는 방문객 선택이 누락되었습니다.", true);
    return;
  }
  if (!selectedMeal) {
    showToast("🚨 식사(아침/점심/저녁)를 선택해 주세요.", true);
    return;
  }

  const confirmBtn = document.querySelector(".confirm-btn-large");
  confirmBtn.innerText = "저장 중...";
  confirmBtn.disabled = true;

  const payload = {
    date: new Date().toLocaleDateString(),
    time: new Date().toLocaleTimeString(),
    type: selectedVisitor ? "방문객" : "사내직원",
    group: selectedVisitor ? selectedVisitor : "선도화학",
    empNumber: currentInputNumber || "-",
    empName: currentEmpName || selectedVisitor,
    meal: selectedMeal,
    count: selectedVisitor ? visitorCount : 1,
  };

  fetch(WEB_APP_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.result === "success") {
        if (currentInputNumber && selectedMeal) {
          if (!todayMealRecords[currentInputNumber]) todayMealRecords[currentInputNumber] = [];
          todayMealRecords[currentInputNumber].push(selectedMeal);
        }
        showToast(`✅ [${payload.empName}]님, 식수(${payload.count}명)가 저장되었습니다!`);
        
        // 🍒 캡틴 지시 완수: 식사 저장 완료 시, 2초 후 '본인확인 선택 화면'으로 복귀!
        setTimeout(returnToSelectionScreen, 2000);
      } else {
        showToast("🚨 저장 실패! 관리자에게 문의하세요.", true);
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      showToast("🚨 서버 통신 에러가 발생했습니다.", true);
    })
    .finally(() => {
      confirmBtn.innerText = "확 인";
      confirmBtn.disabled = false;
    });
}