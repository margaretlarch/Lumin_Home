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
  const tz = localStorage.getItem('timezone') || 'America/Los_Angeles';
  let hour;
  try {
    hour = parseInt(new Date().toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: tz }));
  } catch (e) {
    hour = new Date().getHours();
  }

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
        <div>
          <div class="stat-num">--</div>
          <div class="stat-label">days</div>
        </div>
        <div>
          <div class="stat-num">--</div>
          <div class="stat-label">memories</div>
        </div>
        <div>
          <div class="stat-num">--</div>
          <div class="stat-label">songs</div>
        </div>
      </div>

      <div class="card" style="position:relative; padding-left:20px;">
        <div style="position:absolute; left:10px; top:14px; width:3px; height:calc(100% - 28px); background:rgba(245,215,161,0.3); border-radius:2px;"></div>
        <div class="card-label">TODAY'S WHISPER</div>
        <div class="card-body" style="font-style:italic;">待接入数据</div>
        <div class="card-sub">--</div>
      </div>

      <div class="card-grid">
        <div class="card">
          <div class="card-label">WEATHER</div>
          <div class="card-body" style="font-family:'VT323',monospace; font-size:22px; color:rgba(245,215,161,0.8);">--</div>
          <div class="card-sub" style="text-align:left;">待接入</div>
        </div>
        <div class="card">
          <div class="card-label">TOGETHER</div>
          <div class="card-body" style="font-family:'VT323',monospace; font-size:22px; color:rgba(245,215,161,0.8);">--</div>
          <div class="card-sub" style="text-align:left;">days</div>
        </div>
      </div>

      <div class="card">
        <div class="card-label">LAST SONG</div>
        <div class="card-body">待接入数据</div>
      </div>
    `;
  }

  if (currentTab === 'play') {
    el.innerHTML = `
      <div class="play-grid">
        <div class="play-card locked">
          <div class="play-card-icon">&#9835;</div>
          <div class="play-card-name">点歌</div>
          <div class="play-card-desc">即将上线</div>
        </div>
        <div class="play-card locked">
          <div class="play-card-icon">&#9878;</div>
          <div class="play-card-name">Tally</div>
          <div class="play-card-desc">记账 · 扭蛋</div>
        </div>
        <div class="play-card locked">
          <div class="play-card-icon">&#9776;</div>
          <div class="play-card-name">共读</div>
          <div class="play-card-desc">Catchword</div>
        </div>
        <div class="play-card locked">
          <div class="play-card-icon">&#9836;</div>
          <div class="play-card-name">弹琴</div>
          <div class="play-card-desc">Overtone</div>
        </div>
        <div class="play-card locked">
          <div class="play-card-icon">&#9113;</div>
          <div class="play-card-name">咕咕机</div>
          <div class="play-card-desc">打印小纸条</div>
        </div>
        <div class="play-card locked">
          <div class="play-card-icon">+</div>
          <div class="play-card-name">更多</div>
          <div class="play-card-desc">即将到来</div>
        </div>
      </div>
    `;
  }

  if (currentTab === 'memory') {
    el.innerHTML = `
      <div class="filter-bar">
        <button class="filter-btn active">all</button>
        <button class="filter-btn">daily</button>
        <button class="filter-btn">deeptalk</button>
        <button class="filter-btn">feel</button>
        <button class="filter-btn">mood</button>
        <button class="filter-btn">milestone</button>
      </div>
      <div class="card">
        <div class="card-label">MEMORY</div>
        <div class="card-body">记忆库数据将在连接 Supabase 后显示</div>
      </div>
    `;
  }

  if (currentTab === 'footprint') {
    el.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">~</div>
        <div class="empty-title">足迹功能即将上线</div>
        <div class="empty-desc">这里会记录陆洄在各处留下的痕迹</div>
      </div>
    `;
  }

  if (currentTab === 'settings') {
    const savedUrl = localStorage.getItem('supabase_url') || '';
    const savedKey = localStorage.getItem('supabase_key') || '';
    const savedTz = localStorage.getItem('timezone') || 'America/Los_Angeles';
    const savedAnniv = localStorage.getItem('anniversary') || '';

    el.innerHTML = `
      <div class="card">
        <div class="card-label">SUPABASE</div>
        <div class="setting-label">URL</div>
        <input class="setting-input" id="cfg-url" value="${savedUrl}" placeholder="https://xxx.supabase.co" />
        <div class="setting-label" style="margin-top:10px;">Anon Key</div>
        <input class="setting-input" id="cfg-key" value="${savedKey}" placeholder="eyJ..." />
      </div>

      <div class="card">
        <div class="card-label">TIME & LOCATION</div>
        <div class="setting-label">时区</div>
        <input class="setting-input" id="cfg-tz" value="${savedTz}" placeholder="America/Los_Angeles" />
        <div class="setting-label" style="margin-top:10px;">纪念日</div>
        <input class="setting-input" id="cfg-anniversary" type="date" value="${savedAnniv}" />
      </div>

      <button class="save-btn" onclick="saveSettings()">SAVE</button>
    `;
  }
}

/* ===== 保存设置 ===== */
function saveSettings() {
  const url = document.getElementById('cfg-url').value;
  const key = document.getElementById('cfg-key').value;
  const tz = document.getElementById('cfg-tz').value;
  const anniv = document.getElementById('cfg-anniversary').value;

  localStorage.setItem('supabase_url', url);
  localStorage.setItem('supabase_key', key);
  localStorage.setItem('timezone', tz);
  localStorage.setItem('anniversary', anniv);

  updateBackground();
  alert('已保存');
}

/* ===== 初始化 ===== */
window.onload = () => {
  updateBackground();
  setInterval(updateBackground, 10 * 60 * 1000);
  render();
};
