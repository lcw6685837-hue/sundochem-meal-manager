// 👇 캡틴의 고유 구글 Apps Script 웹 앱 URL
const WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbzaGhrbsTtD5eWlchjFteHWkSxN3Tx0HILuWAoT108RWivqLncW0p7tG64Fw4v6AY3j/exec";

let employeeDB = {};
const todayMealRecords = {};
let currentInputNumber = "";
let selectedMeal = null;

let selectedVisitor = null;
let visitorCount = 0;
let tempVisitorType = "";
let tempVisitorCountStr = "1";

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
      showToast("🚨 직원 명부를 불러오는데 실패했습니다.", true);
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
  memoText.style.animation =
    "scroll-right 15s linear infinite, rainbow-text 6s linear infinite";
});

const numberDisplay = document.getElementById("empNumberDisplay");
const nameDisplay = document.getElementById("empNameDisplay");

function inputNumber(num) {
  if (currentInputNumber.length < 4) {
    currentInputNumber += num;
    updateNumberDisplay();
  }
}

function clearNumber() {
  currentInputNumber = "";
  updateNumberDisplay();
  document
    .querySelectorAll(".meal-btn")
    .forEach((btn) => btn.classList.remove("active"));
  selectedMeal = null;
}

function deleteNumber() {
  currentInputNumber = currentInputNumber.slice(0, -1);
  updateNumberDisplay();
}

function updateNumberDisplay() {
  numberDisplay.textContent =
    currentInputNumber === "" ? "-" : currentInputNumber;
  if (currentInputNumber === "") {
    nameDisplay.textContent = "";
  } else if (employeeDB[currentInputNumber]) {
    nameDisplay.textContent = employeeDB[currentInputNumber];
    nameDisplay.style.color = "#ffffff";
    selectedVisitor = null;
    visitorCount = 0;
    document
      .querySelectorAll(".visitor-btn")
      .forEach((btn) => btn.classList.remove("active"));
  } else {
    nameDisplay.textContent = "";
  }
}

function selectMeal(mealType) {
  if (
    currentInputNumber !== "" &&
    todayMealRecords[currentInputNumber] &&
    todayMealRecords[currentInputNumber].includes(mealType)
  ) {
    showToast(`🚨 이미 '${mealType}' 식사가 완료된 사원입니다.`, true);
    return;
  }
  document
    .querySelectorAll(".meal-btn")
    .forEach((btn) => btn.classList.remove("active"));
  selectedMeal = mealType;
  document.getElementById(`meal-${mealType}`).classList.add("active");
}

const visitorModal = document.getElementById("visitorModal");
const modalTitle = document.getElementById("modalTitle");
const visitorCountDisplay = document.getElementById("visitorCountDisplay");

function selectVisitor(visitorType) {
  tempVisitorType = visitorType;
  tempVisitorCountStr = "1";
  modalTitle.innerText = `[${visitorType}] 식사 인원이 몇 명입니까?`;
  visitorCountDisplay.innerText = tempVisitorCountStr;
  visitorModal.style.display = "flex";
}

function closeVisitorModal() {
  visitorModal.style.display = "none";
  tempVisitorType = "";
}

function inputVisitorCount(num) {
  if (tempVisitorCountStr === "1" && tempVisitorCountStr.length === 1) {
    tempVisitorCountStr = num.toString();
  } else {
    if (tempVisitorCountStr.length < 3) tempVisitorCountStr += num;
  }
  visitorCountDisplay.innerText = tempVisitorCountStr;
}

function deleteVisitorCount() {
  tempVisitorCountStr = tempVisitorCountStr.slice(0, -1);
  if (tempVisitorCountStr === "") tempVisitorCountStr = "0";
  visitorCountDisplay.innerText = tempVisitorCountStr;
}

function clearVisitorCount() {
  tempVisitorCountStr = "0";
  visitorCountDisplay.innerText = tempVisitorCountStr;
}

function confirmVisitorCount() {
  let count = parseInt(tempVisitorCountStr);
  if (isNaN(count) || count <= 0) {
    showToast("🚨 인원수를 정확히 입력해 주세요.", true);
    return;
  }

  visitorCount = count;
  selectedVisitor = tempVisitorType;

  document
    .querySelectorAll(".visitor-btn")
    .forEach((btn) => btn.classList.remove("active"));
  let prefix = tempVisitorType.substring(0, 2);
  if (tempVisitorType === "IPA소속") prefix = "IP";
  document.getElementById(`vis-${prefix}`).classList.add("active");

  clearNumber();
  closeVisitorModal();
}

function submitData() {
  const empName = employeeDB[currentInputNumber];

  if (!empName && !selectedVisitor) {
    showToast("🚨 사원번호를 확인하거나 방문객을 선택해 주세요.", true);
    return;
  }
  if (!selectedMeal && !selectedVisitor) {
    showToast("🚨 식사 종류나 방문객 여부를 선택해 주세요.", true);
    return;
  }

  const confirmBtn = document.querySelector(".confirm-btn");
  confirmBtn.innerText = "저장 중...";
  confirmBtn.disabled = true;

  const payload = {
    date: new Date().toLocaleDateString(),
    time: new Date().toLocaleTimeString(),
    type: selectedVisitor ? "방문객" : "사내직원",
    group: selectedVisitor ? selectedVisitor : "선도화학",
    empNumber: currentInputNumber || "-",
    empName: empName || `방문객`,
    meal: selectedMeal || "선택안함",
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
        if (empName && selectedMeal) {
          if (!todayMealRecords[currentInputNumber])
            todayMealRecords[currentInputNumber] = [];
          todayMealRecords[currentInputNumber].push(selectedMeal);
        }
        showToast(
          `✅ [${payload.empName}]님, 식수(${payload.count}명)가 저장되었습니다!`,
        );
        clearNumber();
        selectedMeal = null;
        selectedVisitor = null;
        visitorCount = 0;
        document
          .querySelectorAll(".visitor-btn, .meal-btn")
          .forEach((btn) => btn.classList.remove("active"));
      } else {
        showToast("🚨 저장 실패! 관리자에게 문의하세요.", true);
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      showToast("🚨 통신 에러가 발생했습니다.", true);
    })
    .finally(() => {
      confirmBtn.innerText = "확 인";
      confirmBtn.disabled = false;
    });
}
