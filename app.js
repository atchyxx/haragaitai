const STORAGE_KEY = "haragaitaiLogs";

const form = document.getElementById("log-form");
const tableBody = document.getElementById("log-table");
const analysisBox = document.getElementById("analysis");
const rowTemplate = document.getElementById("row-template");
const clearAllButton = document.getElementById("clearAll");
const painInput = document.getElementById("painLevel");
const stressInput = document.getElementById("stressLevel");
const painValue = document.getElementById("painValue");
const stressValue = document.getElementById("stressValue");

painInput.addEventListener("input", () => {
  painValue.textContent = painInput.value;
});

stressInput.addEventListener("input", () => {
  stressValue.textContent = stressInput.value;
});

function getLogs() {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

function saveLogs(logs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
}

function summarizeMeal(log) {
  const items = [
    `朝: ${log.breakfast || "-"}`,
    `昼: ${log.lunch || "-"}`,
    `間食: ${log.snack || "-"}`,
    `夕: ${log.dinner || "-"}`,
  ];
  return items.join(" / ");
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

function mealKeywordScore(logs) {
  const map = new Map();
  logs.forEach((log) => {
    const allMeals = `${log.breakfast} ${log.lunch} ${log.snack} ${log.dinner}`
      .replace(/[、,]/g, " ")
      .toLowerCase();
    const keywords = allMeals
      .split(/\s+/)
      .map((k) => k.trim())
      .filter((k) => k.length >= 2);

    const unique = new Set(keywords);
    unique.forEach((word) => {
      if (!map.has(word)) {
        map.set(word, { totalPain: 0, count: 0 });
      }
      const item = map.get(word);
      item.totalPain += Number(log.painLevel);
      item.count += 1;
    });
  });

  return [...map.entries()]
    .map(([word, data]) => ({
      word,
      painAvg: data.totalPain / data.count,
      count: data.count,
    }))
    .filter((x) => x.count >= 2)
    .sort((a, b) => b.painAvg - a.painAvg)
    .slice(0, 5);
}

function renderAnalysis(logs) {
  if (!logs.length) {
    analysisBox.innerHTML = "記録がまだありません。データを入力すると分析結果が表示されます。";
    return;
  }

  const painValues = logs.map((l) => Number(l.painLevel));
  const stressValues = logs.map((l) => Number(l.stressLevel));
  const highStressDays = logs.filter((l) => Number(l.stressLevel) >= 7);
  const lowStressDays = logs.filter((l) => Number(l.stressLevel) <= 3);

  const highStressPain = average(highStressDays.map((l) => Number(l.painLevel)));
  const lowStressPain = average(lowStressDays.map((l) => Number(l.painLevel)));

  const stoolPainGroups = {
    硬め: [],
    普通: [],
    やわらかめ: [],
    下痢気味: [],
  };

  logs.forEach((log) => {
    stoolPainGroups[log.stoolType]?.push(Number(log.painLevel));
  });

  const stoolSummary = Object.entries(stoolPainGroups)
    .filter(([, pains]) => pains.length > 0)
    .map(([stool, pains]) => `${stool}: ${average(pains).toFixed(1)}`)
    .join(" / ");

  const topMeals = mealKeywordScore(logs);
  const mealSummary = topMeals.length
    ? topMeals
        .map((m) => `${m.word}（腹痛平均${m.painAvg.toFixed(1)}・${m.count}日）`)
        .join("、")
    : "食事キーワード分析には、同じ食材名を2日以上記録してください。";

  analysisBox.innerHTML = `
    <p><strong>全体の腹痛平均:</strong> ${average(painValues).toFixed(1)} / 10</p>
    <p><strong>全体のストレス平均:</strong> ${average(stressValues).toFixed(1)} / 10</p>
    <p><strong>ストレス高（7以上）の日の腹痛平均:</strong> ${highStressPain.toFixed(1)} / 10</p>
    <p><strong>ストレス低（3以下）の日の腹痛平均:</strong> ${lowStressPain.toFixed(1)} / 10</p>
    <p><strong>便の具合ごとの腹痛平均:</strong> ${stoolSummary || "データ不足"}</p>
    <p><strong>腹痛が高くなりやすい食事キーワード（仮説）:</strong> ${mealSummary}</p>
    <p>※ 医療診断ではありません。強い症状が続く場合は医療機関に相談してください。</p>
  `;
}

function renderLogs() {
  const logs = getLogs().sort((a, b) => b.date.localeCompare(a.date));
  tableBody.innerHTML = "";

  logs.forEach((log) => {
    const row = rowTemplate.content.firstElementChild.cloneNode(true);
    row.querySelector(".date").textContent = log.date;
    row.querySelector(".meal").textContent = summarizeMeal(log);
    row.querySelector(".memo").textContent = log.conditionMemo || "-";
    row.querySelector(".counts").textContent = `便通${log.bowelCount} / 尿${log.urineCount}`;
    row.querySelector(".stool").textContent = log.stoolType;
    row.querySelector(".pain").textContent = log.painLevel;
    row.querySelector(".stress").textContent = log.stressLevel;

    row.querySelector(".delete").addEventListener("click", () => {
      const nextLogs = getLogs().filter((item) => item.id !== log.id);
      saveLogs(nextLogs);
      renderLogs();
    });

    tableBody.appendChild(row);
  });

  renderAnalysis(logs);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const log = {
    id: crypto.randomUUID(),
    date: document.getElementById("date").value,
    breakfast: document.getElementById("breakfast").value.trim(),
    lunch: document.getElementById("lunch").value.trim(),
    snack: document.getElementById("snack").value.trim(),
    dinner: document.getElementById("dinner").value.trim(),
    conditionMemo: document.getElementById("conditionMemo").value.trim(),
    bowelCount: Number(document.getElementById("bowelCount").value),
    urineCount: Number(document.getElementById("urineCount").value),
    stoolType: document.getElementById("stoolType").value,
    painLevel: Number(painInput.value),
    stressLevel: Number(stressInput.value),
  };

  const logs = getLogs();
  logs.push(log);
  saveLogs(logs);

  form.reset();
  document.getElementById("date").valueAsDate = new Date();
  painInput.value = "0";
  stressInput.value = "0";
  painValue.textContent = "0";
  stressValue.textContent = "0";
  renderLogs();
});

clearAllButton.addEventListener("click", () => {
  const ok = window.confirm("記録をすべて削除します。よろしいですか？");
  if (!ok) return;
  localStorage.removeItem(STORAGE_KEY);
  renderLogs();
});

document.getElementById("date").valueAsDate = new Date();
renderLogs();
