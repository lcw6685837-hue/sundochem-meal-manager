// 👇 캡틴의 고유 구글 Apps Script 웹 앱 URL 장착!
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwnWWXhVquH_QvEYC4Qu6FwogrwK-EfbNMtG_6S3_PpbVYms6Z3j7Ib8jGfejsL6XD6/exec";

// 화면 진입 시 현재 달 자동 세팅

// 화면 진입 시 현재 달 자동 세팅
window.onload = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  document.getElementById('monthPicker').value = `${year}-${month}`;
  fetchAndAnalyzeData(); 
};

function fetchAndAnalyzeData() {
  const selectedMonth = document.getElementById('monthPicker').value; 
  if (!selectedMonth) return alert("분석할 연/월을 선택해주세요!");

  const btn = document.querySelector('.btn-refresh');
  btn.innerText = "데이터 불러오는 중...";
  btn.disabled = true;

  fetch(`${WEB_APP_URL}?action=getRecords`, { redirect: "follow" })
    .then(response => response.json())
    .then(data => {
      analyzeData(data, selectedMonth);
    })
    .catch(error => {
      console.error("통계 로드 실패:", error);
      alert("데이터를 불러오지 못했습니다.");
    })
    .finally(() => {
      btn.innerText = "데이터 분석";
      btn.disabled = false;
    });
}

function analyzeData(allRecords, targetMonth) {
  const targetYear = targetMonth.split('-')[0];
  const targetMonthNum = parseInt(targetMonth.split('-')[1], 10);

  const monthlyData = allRecords.filter(record => {
    const recordDate = new Date(record.date);
    return recordDate.getFullYear() == targetYear && (recordDate.getMonth() + 1) == targetMonthNum;
  });

  let total = 0, employeeTotal = 0, visitorTotal = 0;
  let mealCounts = { '아침': 0, '점심': 0, '저녁': 0 };
  let visitorGroups = {};

  monthlyData.forEach(row => {
    const count = parseInt(row.count) || 0;
    total += count;

    if (row.type === "사내직원") {
      employeeTotal += count;
    } else {
      visitorTotal += count;
      visitorGroups[row.group] = (visitorGroups[row.group] || 0) + count;
    }

    if (mealCounts[row.meal] !== undefined) {
      mealCounts[row.meal] += count;
    }
  });

  document.getElementById('totalMeals').innerHTML = `${total} <span class="unit">명</span>`;
  document.getElementById('empMeals').innerHTML = `${employeeTotal} <span class="unit">명</span>`;
  document.getElementById('visitorMeals').innerHTML = `${visitorTotal} <span class="unit">명</span>`;

  const maxMeal = Math.max(mealCounts['아침'], mealCounts['점심'], mealCounts['저녁'], 1); 
  
  document.getElementById('valBreakfast').innerText = mealCounts['아침'];
  document.getElementById('barBreakfast').style.width = `${(mealCounts['아침'] / maxMeal) * 100}%`;
  
  document.getElementById('valLunch').innerText = mealCounts['점심'];
  document.getElementById('barLunch').style.width = `${(mealCounts['점심'] / maxMeal) * 100}%`;
  
  document.getElementById('valDinner').innerText = mealCounts['저녁'];
  document.getElementById('barDinner').style.width = `${(mealCounts['저녁'] / maxMeal) * 100}%`;

  const groupListUl = document.getElementById('visitorGroupList');
  groupListUl.innerHTML = ""; 
  
  for (const [groupName, count] of Object.entries(visitorGroups)) {
    const li = document.createElement('li');
    li.innerHTML = `<span>${groupName}</span> <strong>${count} 명</strong>`;
    groupListUl.appendChild(li);
  }
}