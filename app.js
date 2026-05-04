let currentTab = 'home';

/* ===== 昼夜时间映射 ===== */
function getTimePhase(hour) {
  if (hour >= 5 && hour < 8) return 'morning';
  if (hour >= 8 && hour < 16) return 'day';
  if (hour >= 16 && hour < 19) return 'sunset';
  if (hour >= 19 && hour < 23) return 'night';
  return 'late';
}

/* ===== 背景配置 ===== */
const BG_CONFIG = {
  morning: {
    img: 'assets/bg/morning.png',
    overlay: 'rgba(255,200,180,0.15)'
  },
  day: {
    img: 'assets/bg/day.png',
    overlay: 'rgba(255,255,255,0.05)'
  },
  sunset: {
    img: 'assets/bg/sunset.png',
    overlay: 'rgba(255,140,80,0.2)'
  },
  night: {
    img: 'assets/bg/night.png',
    overlay: 'rgba(0,0,50,0.35)'
  },
  late: {
    img: 'assets/bg/late.png',
    overlay: 'rgba(0,0,0,0.55)'
  }
};

/* ===== 更新背景 ===== */
function updateBackground() {
  const hour = new Date().getHours();
  const phase = getTimePhase(hour);

  const bg = document.getElementById('background');
  const overlay = document.getElementById('bg-overlay');

  const config = BG_CONFIG[phase];

  bg.style.backgroundImage = `url(${config.img})`;
  overlay.style.background = config.overlay;
}

/* ===== Tab 切换 ===== */
function switchTab(tab) {
  currentTab = tab;

  document.querySelectorAll('.tabbar button').forEach(btn => {
    btn.classList.remove('active');
  });

  document.getElementById(`tab-${tab}`).classList.add('active');

  render();
}

/* ===== 渲染 ===== */
function render() {
  const el = document.getElementById('content');

  if (currentTab === 'home') {
    el.innerHTML = `
      <div class="stats">
        <div class="stat">000 DAYS</div>
        <div class="stat">000 MEM</div>
        <div class="stat">000 SONG</div>
      </div>

      <div class="card">🌙 Today's Whisper（待接数据）</div>
      <div class="card">☁️ 天气（待接 API）</div>
      <div class="card">📅 纪念日（待计算）</div>
    `;
  }

  if (currentTab === 'play') {
    el.innerHTML = `<div class="card">🔒 功能即将上线</div>`;
  }

  if (currentTab === 'memory') {
    el.innerHTML = `<div class="card">📚 记忆库（下一步接 Supabase）</div>`;
  }

  if (currentTab === 'footprint') {
    el.innerHTML = `<div class="card">🪶 足迹功能即将上线</div>`;
  }

  if (currentTab === 'settings') {
    el.innerHTML = `
      <div class="card">
        <div>Supabase URL</div>
        <input id="url" style="width:100%" />

        <div>Anon Key</div>
        <input id="key" style="width:100%" />

        <button onclick="saveSettings()">保存</button>
      </div>
    `;
  }
}

/* ===== 保存设置 ===== */
function saveSettings() {
  const url = document.getElementById('url').value;
  const key = document.getElementById('key').value;

  localStorage.setItem('supabase_url', url);
  localStorage.setItem('supabase_key', key);

  alert('已保存');
}

/* ===== 初始化 ===== */
window.onload = () => {
  updateBackground();

  // 每10分钟检查一次时间（实现平滑切换）
  setInterval(updateBackground, 10 * 60 * 1000);

  render();
};
