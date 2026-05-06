/* ================================================================
   Lumin Home — app.js
   Phase 1 数据层：Supabase 连接 + Home 数据绑定 + Memory 完整功能
   ================================================================ */

let currentTab = 'home';
let sb = null;

/* ===== Supabase 初始化 ===== */

function initSupabase() {
  const url = localStorage.getItem('supabase_url');
  const key = localStorage.getItem('supabase_key');
  if (!url || !key) return false;
  try {
    sb = window.supabase.createClient(url, key);
    return true;
  } catch (e) {
    console.error('Supabase init error:', e);
    sb = null;
    return false;
  }
}

/* ===== 时间工具 ===== */

function getTimezone() {
  return localStorage.getItem('timezone') || 'America/Los_Angeles';
}

function getNow() {
  try {
    const s = new Date().toLocaleString('en-US', { timeZone: getTimezone() });
    return new Date(s);
  } catch (e) {
    return new Date();
  }
}

function getTimePhase(hour) {
  if (hour >= 5 && hour < 8) return 'morning';
  if (hour >= 8 && hour < 16) return 'day';
  if (hour >= 16 && hour < 19) return 'sunset';
  if (hour >= 19 && hour < 23) return 'night';
  return 'late';
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return mm + '-' + dd;
}

function getDaysTogether() {
  const anniv = localStorage.getItem('anniversary');
  if (!anniv) return '--';
  const start = new Date(anniv + 'T00:00:00');
  const now = getNow();
  const diff = Math.floor((now - start) / (1000 * 60 * 60 * 24));
  return diff >= 0 ? diff : '--';
}

/* ===== 背景系统 ===== */

const BG_CONFIG = {
  morning: { img: 'assets/bg/morning.png', overlay: 'rgba(255,200,180,0.15)' },
  day:     { img: 'assets/bg/day.png',     overlay: 'rgba(255,255,255,0.05)' },
  sunset:  { img: 'assets/bg/sunset.png',  overlay: 'rgba(255,140,80,0.2)' },
  night:   { img: 'assets/bg/night.png',   overlay: 'rgba(0,0,50,0.35)' },
  late:    { img: 'assets/bg/late.png',     overlay: 'rgba(0,0,0,0.55)' }
};

function updateBackground() {
  const now = getNow();
  const phase = getTimePhase(now.getHours());
  const config = BG_CONFIG[phase];
  document.getElementById('background').style.backgroundImage = 'url(' + config.img + ')';
  document.getElementById('bg-overlay').style.background = config.overlay;
}

/* ===== 数据读取 ===== */

async function fetchCount(table) {
  if (!sb) return '--';
  try {
    const { count, error } = await sb.from(table).select('*', { count: 'exact', head: true });
    if (error) throw error;
    return count != null ? count : 0;
  } catch (e) {
    console.error('count(' + table + '):', e);
    return '--';
  }
}

async function fetchWhisper() {
  if (!sb) return null;
  try {
    const { data, error } = await sb
      .from('whispers')
      .select('content, date, created_at')
      .order('created_at', { ascending: false })
      .limit(1);
    if (error) throw error;
    return data && data[0] ? data[0] : null;
  } catch (e) {
    console.error('whisper:', e);
    return null;
  }
}

async function fetchLastSong() {
  if (!sb) return null;
  try {
    const { data, error } = await sb
      .from('songs')
      .select('title, artist, url, reason, created_at')
      .order('created_at', { ascending: false })
      .limit(1);
    if (error) throw error;
    return data && data[0] ? data[0] : null;
  } catch (e) {
    console.error('song:', e);
    return null;
  }
}

async function fetchWeather() {
  const apiKey = localStorage.getItem('weather_api_key');
  const lat = localStorage.getItem('location_lat');
  const lon = localStorage.getItem('location_lon');
  if (!apiKey || !lat || !lon) return null;
  try {
    const r = await fetch(
      'https://api.openweathermap.org/data/2.5/weather?lat=' + lat + '&lon=' + lon + '&appid=' + apiKey + '&units=imperial&lang=zh_cn'
    );
    const d = await r.json();
    if (d.cod !== 200) return null;
    return {
      temp: Math.round(d.main.temp),
      desc: d.weather[0].description,
      icon: d.weather[0].icon
    };
  } catch (e) {
    console.error('weather:', e);
    return null;
  }
}

/* ===== Memory 状态 ===== */

let memFilter = 'all';
let memSearch = '';
let memData = [];
let memExpanded = null;
const MEM_CATEGORIES = ['all', 'daily', 'deeptalk', 'feel', 'mood', 'milestone', 'diary', 'relationship', 'observation'];

async function loadMemories() {
  if (!sb) { memData = []; return; }
  try {
    let q = sb
      .from('memories')
      .select('id, content, category, importance, tags, created_at')
      .order('created_at', { ascending: false })
      .limit(80);
    if (memFilter !== 'all') q = q.eq('category', memFilter);
    if (memSearch.trim()) q = q.ilike('content', '%' + memSearch.trim() + '%');
    const { data, error } = await q;
    if (error) throw error;
    memData = data || [];
  } catch (e) {
    console.error('memories:', e);
    memData = [];
  }
}

/* ===== 连接测试 ===== */

async function testSupabaseConnection() {
  if (!sb) return { ok: false, msg: '未初始化' };
  try {
    const { count, error } = await sb.from('memories').select('*', { count: 'exact', head: true });
    if (error) throw error;
    return { ok: true, msg: '已连接（memories: ' + count + ' 条）' };
  } catch (e) {
    return { ok: false, msg: e.message || '连接失败' };
  }
}

/* ===== Tab 切换 ===== */

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tabbar button').forEach(function(b) { b.classList.remove('active'); });
  document.getElementById('tab-' + tab).classList.add('active');
  document.getElementById('content').className = 'tab-' + tab;
  memExpanded = null;
  render();
}

/* ===== 渲染入口 ===== */

async function render() {
  var el = document.getElementById('content');
  switch (currentTab) {
    case 'home':      await renderHome(el); break;
    case 'play':      renderPlay(el); break;
    case 'memory':    await renderMemory(el); break;
    case 'footprint': renderFootprint(el); break;
    case 'settings':  renderSettings(el); break;
  }
}

/* ===== Home ===== */

async function renderHome(el) {
  var days = getDaysTogether();
  el.innerHTML =
    '<div class="stats">' +
      '<div><div class="stat-num" id="h-days">' + days + '</div><div class="stat-label">days</div></div>' +
      '<div><div class="stat-num" id="h-mem">\u00B7\u00B7\u00B7</div><div class="stat-label">memories</div></div>' +
      '<div><div class="stat-num" id="h-songs">\u00B7\u00B7\u00B7</div><div class="stat-label">songs</div></div>' +
    '</div>' +
    '<div class="card card-whisper" id="h-whisper">' +
      '<div class="card-label">TODAY\'S WHISPER</div>' +
      '<div class="card-body">\u00B7\u00B7\u00B7</div>' +
    '</div>' +
    '<div class="card-grid">' +
      '<div class="card" id="h-weather">' +
        '<div class="card-label">WEATHER</div>' +
        '<div class="card-num">\u00B7\u00B7\u00B7</div>' +
      '</div>' +
      '<div class="card">' +
        '<div class="card-label">TOGETHER</div>' +
        '<div class="card-num">' + days + '</div>' +
        '<div class="card-sub" style="text-align:left">days</div>' +
      '</div>' +
    '</div>' +
    '<div class="card" id="h-song">' +
      '<div class="card-label">LAST SONG</div>' +
      '<div class="card-body">\u00B7\u00B7\u00B7</div>' +
    '</div>';

  if (!sb) {
    document.getElementById('h-mem').textContent = '--';
    document.getElementById('h-songs').textContent = '--';
    document.querySelector('#h-whisper .card-body').textContent = '请先在 Settings 中连接 Supabase';
    document.querySelector('#h-weather .card-num').textContent = '--';
    document.querySelector('#h-song .card-body').textContent = '请先在 Settings 中连接 Supabase';
    return;
  }

  var results = await Promise.all([
    fetchCount('memories'),
    fetchCount('songs'),
    fetchWhisper(),
    fetchWeather(),
    fetchLastSong()
  ]);
  var memCount = results[0], songCount = results[1], whisper = results[2], weather = results[3], lastSong = results[4];

  document.getElementById('h-mem').textContent = memCount;
  document.getElementById('h-songs').textContent = songCount;

  var wEl = document.getElementById('h-whisper');
  if (whisper) {
    wEl.innerHTML =
      '<div class="card-label">TODAY\'S WHISPER</div>' +
      '<div class="card-body">' + escHtml(whisper.content) + '</div>' +
      '<div class="card-sub">' + formatDate(whisper.date || whisper.created_at) + '</div>';
  } else {
    wEl.querySelector('.card-body').textContent = '今天还没有 whisper';
  }

  var wtEl = document.getElementById('h-weather');
  if (weather) {
    wtEl.innerHTML =
      '<div class="card-label">WEATHER</div>' +
      '<div class="card-num">' + weather.temp + '\u00B0F</div>' +
      '<div class="card-sub" style="text-align:left">' + weather.desc + '</div>';
  } else {
    wtEl.querySelector('.card-num').textContent = '--';
  }

  var sEl = document.getElementById('h-song');
  if (lastSong) {
    var titleHtml = lastSong.url
      ? '<a href="' + escHtml(lastSong.url) + '" target="_blank" rel="noopener" class="song-link">' + escHtml(lastSong.title) + '</a>'
      : escHtml(lastSong.title);
    sEl.innerHTML =
      '<div class="card-label">LAST SONG</div>' +
      '<div class="card-body">' + titleHtml + ' \u2014 ' + escHtml(lastSong.artist) + '</div>' +
      (lastSong.reason ? '<div class="card-sub" style="text-align:left">' + escHtml(lastSong.reason) + '</div>' : '');
  } else {
    sEl.querySelector('.card-body').textContent = '还没有推歌记录';
  }
}

/* ===== Play ===== */

function renderPlay(el) {
  el.innerHTML =
    '<div class="play-grid">' +
      '<div class="play-card locked"><div class="play-card-icon">&#9835;</div><div class="play-card-name">点歌</div><div class="play-card-desc">即将上线</div></div>' +
      '<div class="play-card locked"><div class="play-card-icon">&#9878;</div><div class="play-card-name">Tally</div><div class="play-card-desc">记账 / 扭蛋</div></div>' +
      '<div class="play-card locked"><div class="play-card-icon">&#9776;</div><div class="play-card-name">共读</div><div class="play-card-desc">Catchword</div></div>' +
      '<div class="play-card locked"><div class="play-card-icon">&#9836;</div><div class="play-card-name">弹琴</div><div class="play-card-desc">Overtone</div></div>' +
      '<div class="play-card locked"><div class="play-card-icon">&#9113;</div><div class="play-card-name">咕咕机</div><div class="play-card-desc">打印小纸条</div></div>' +
      '<div class="play-card locked"><div class="play-card-icon">+</div><div class="play-card-name">更多</div><div class="play-card-desc">即将到来</div></div>' +
    '</div>';
}

/* ===== Memory ===== */

async function renderMemory(el) {
  var filterHtml = MEM_CATEGORIES.map(function(c) {
    return '<button class="filter-btn' + (memFilter === c ? ' active' : '') + '" onclick="setMemFilter(\'' + c + '\')">' + c + '</button>';
  }).join('');

  el.innerHTML =
    '<div class="filter-bar">' + filterHtml + '</div>' +
    '<div class="search-bar"><input class="search-input" id="mem-search" type="text" placeholder="搜索记忆..." value="' + escHtml(memSearch) + '" /></div>' +
    '<div id="mem-list" class="mem-list"><div class="mem-loading">\u00B7\u00B7\u00B7</div></div>';

  var searchInput = document.getElementById('mem-search');
  var searchTimer = null;
  searchInput.addEventListener('input', function() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function() {
      memSearch = searchInput.value;
      refreshMemories();
    }, 400);
  });

  await refreshMemories();
}

async function refreshMemories() {
  var listEl = document.getElementById('mem-list');
  if (!listEl) return;
  if (!sb) {
    listEl.innerHTML = '<div class="mem-empty">请先在 Settings 中连接 Supabase</div>';
    return;
  }
  listEl.innerHTML = '<div class="mem-loading">加载中\u00B7\u00B7\u00B7</div>';
  await loadMemories();
  if (memData.length === 0) {
    listEl.innerHTML = '<div class="mem-empty">暂无记忆</div>';
    return;
  }
  listEl.innerHTML = memData.map(function(m) {
    var isExp = memExpanded === m.id;
    var preview = m.content.length > 80 && !isExp ? m.content.slice(0, 80) + '...' : m.content;
    var tags = m.tags ? (Array.isArray(m.tags) ? m.tags : [m.tags]).join(' \u00B7 ') : '';
    return '<div class="mem-card' + (isExp ? ' expanded' : '') + '" onclick="toggleMemory(\'' + m.id + '\')">' +
      '<div class="mem-meta"><span class="mem-cat">' + (m.category || '') + '</span><span class="mem-date">' + formatDate(m.created_at) + '</span></div>' +
      '<div class="mem-content">' + escHtml(preview) + '</div>' +
      (tags ? '<div class="mem-tags">' + escHtml(tags) + '</div>' : '') +
    '</div>';
  }).join('');
}

function setMemFilter(f) {
  memFilter = f;
  memExpanded = null;
  document.querySelectorAll('.filter-btn').forEach(function(btn) {
    btn.classList.toggle('active', btn.textContent === f);
  });
  refreshMemories();
}

function toggleMemory(id) {
  memExpanded = memExpanded === id ? null : id;
  refreshMemories();
}

/* ===== Footprint ===== */

function renderFootprint(el) {
  el.innerHTML =
    '<div class="empty-state">' +
      '<div class="empty-icon">~</div>' +
      '<div class="empty-title">足迹功能即将上线</div>' +
      '<div class="empty-desc">这里会记录陆洄在各处留下的痕迹</div>' +
    '</div>';
}

/* ===== Settings ===== */

function renderSettings(el) {
  var v = function(k) { return localStorage.getItem(k) || ''; };
  var tz = v('timezone') || 'America/Los_Angeles';

  var tzOptions = [
    ['America/Los_Angeles', '太平洋时间 (UTC-7/8)'],
    ['America/Denver', '山地时间 (UTC-6/7)'],
    ['America/Chicago', '中部时间 (UTC-5/6)'],
    ['America/New_York', '东部时间 (UTC-4/5)'],
    ['Asia/Shanghai', '北京时间 (UTC+8)'],
    ['Asia/Tokyo', '东京时间 (UTC+9)'],
    ['Europe/London', '伦敦时间 (UTC+0/1)']
  ];
  var tzHtml = tzOptions.map(function(o) {
    return '<option value="' + o[0] + '"' + (tz === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
  }).join('');

  el.innerHTML =
    '<div class="card">' +
      '<div class="card-label">SUPABASE</div>' +
      '<div class="setting-label">URL</div>' +
      '<input class="setting-input" id="cfg-url" value="' + escHtml(v('supabase_url')) + '" placeholder="https://xxx.supabase.co" />' +
      '<div class="setting-label">Anon Key</div>' +
      '<input class="setting-input" id="cfg-key" value="' + escHtml(v('supabase_key')) + '" placeholder="eyJ..." />' +
      '<div id="conn-status" class="conn-status"></div>' +
    '</div>' +
    '<div class="card">' +
      '<div class="card-label">TIME & LOCATION</div>' +
      '<div class="setting-label">时区</div>' +
      '<select class="setting-input" id="cfg-tz">' + tzHtml + '</select>' +
      '<div class="setting-label">纪念日</div>' +
      '<input class="setting-input" id="cfg-anniv" type="date" value="' + v('anniversary') + '" />' +
      '<div class="setting-label">位置 · 纬度</div>' +
      '<input class="setting-input" id="cfg-lat" type="text" value="' + v('location_lat') + '" placeholder="47.6062" />' +
      '<div class="setting-label">位置 · 经度</div>' +
      '<input class="setting-input" id="cfg-lon" type="text" value="' + v('location_lon') + '" placeholder="-122.3321" />' +
    '</div>' +
    '<div class="card">' +
      '<div class="card-label">WEATHER</div>' +
      '<div class="setting-label">OpenWeatherMap API Key</div>' +
      '<input class="setting-input" id="cfg-weather" value="' + escHtml(v('weather_api_key')) + '" placeholder="你的 API Key" />' +
    '</div>' +
    '<button class="save-btn" onclick="saveSettings()">SAVE</button>';

  if (sb) {
    var st = document.getElementById('conn-status');
    st.textContent = '检查连接中...';
    st.className = 'conn-status checking';
    testSupabaseConnection().then(function(r) {
      st.textContent = r.msg;
      st.className = 'conn-status ' + (r.ok ? 'ok' : 'fail');
    });
  }
}

async function saveSettings() {
  localStorage.setItem('supabase_url', document.getElementById('cfg-url').value.trim());
  localStorage.setItem('supabase_key', document.getElementById('cfg-key').value.trim());
  localStorage.setItem('timezone', document.getElementById('cfg-tz').value);
  localStorage.setItem('anniversary', document.getElementById('cfg-anniv').value);
  localStorage.setItem('location_lat', document.getElementById('cfg-lat').value.trim());
  localStorage.setItem('location_lon', document.getElementById('cfg-lon').value.trim());
  localStorage.setItem('weather_api_key', document.getElementById('cfg-weather').value.trim());

  initSupabase();
  updateBackground();

  var st = document.getElementById('conn-status');
  if (st) {
    st.textContent = '正在测试连接...';
    st.className = 'conn-status checking';
    var r = await testSupabaseConnection();
    st.textContent = (r.ok ? '\u2713 ' : '\u2717 ') + r.msg;
    st.className = 'conn-status ' + (r.ok ? 'ok' : 'fail');
  }
}

/* ===== 工具 ===== */

function escHtml(s) {
  if (!s) return '';
  var d = document.createElement('div');
  d.textContent = String(s);
  return d.innerHTML;
}

/* ===== 初始化 ===== */

window.onload = function() {
  initSupabase();
  updateBackground();
  setInterval(updateBackground, 10 * 60 * 1000);
  render();
};

/* ============================================
   app.js — Phase 2 推歌模块新增/修改代码
   追加到现有 app.js 中，部分函数需要修改
   ============================================ */

/* ==========================================
   1. 修改 renderPlay() — 解锁点歌卡片
   ========================================== */
// 在现有的 renderPlay(el) 函数中，找到点歌卡片对应的 HTML，
// 将 locked class 和相关 locked 标记移除，改为可点击。
//
// 点歌卡片的 HTML 参考（替换原有的 locked 卡片）：
//
// '<div class="play-card" onclick="openPlayModule(\'jukebox\')">' +
//   '<div class="play-card-icon">&#9835;</div>' +
//   '<div class="play-card-name">点歌</div>' +
//   '<div class="play-card-desc">推歌记录</div>' +
// '</div>'
//
// 如果原卡片是 locked 状态，去掉类似下面的内容：
//   class="play-card locked"
//   以及卡片内部的 locked 图标/文字


/* ==========================================
   2. 新增 openPlayModule() — 子页面路由
   ========================================== */
/**
 * 打开 Play 模块的子页面
 * @param {string} name - 模块名称：'jukebox' | 'tally' | 'reading' | 'piano' | 'memobird'
 */
function openPlayModule(name) {
  var el = document.getElementById('content');
  if (!el) return;

  switch (name) {
    case 'jukebox':
      renderJukebox(el);
      break;
    // 以下模块 Phase 3 实现，暂时占位
    case 'tally':
      el.innerHTML =
        '<div class="sub-header">' +
          '<button class="back-btn" onclick="switchTab(\'play\')">&lt; 返回</button>' +
          '<span class="sub-title">记账</span>' +
        '</div>' +
        '<div style="text-align:center;padding:60px 0;font-family:\'Zpix\',monospace;font-size:11px;color:rgba(200,180,150,0.3);letter-spacing:2px;">即将上线…</div>';
      break;
    case 'reading':
      el.innerHTML =
        '<div class="sub-header">' +
          '<button class="back-btn" onclick="switchTab(\'play\')">&lt; 返回</button>' +
          '<span class="sub-title">共读</span>' +
        '</div>' +
        '<div style="text-align:center;padding:60px 0;font-family:\'Zpix\',monospace;font-size:11px;color:rgba(200,180,150,0.3);letter-spacing:2px;">即将上线…</div>';
      break;
    case 'piano':
      el.innerHTML =
        '<div class="sub-header">' +
          '<button class="back-btn" onclick="switchTab(\'play\')">&lt; 返回</button>' +
          '<span class="sub-title">弹琴</span>' +
        '</div>' +
        '<div style="text-align:center;padding:60px 0;font-family:\'Zpix\',monospace;font-size:11px;color:rgba(200,180,150,0.3);letter-spacing:2px;">即将上线…</div>';
      break;
    case 'memobird':
      el.innerHTML =
        '<div class="sub-header">' +
          '<button class="back-btn" onclick="switchTab(\'play\')">&lt; 返回</button>' +
          '<span class="sub-title">咕咕机</span>' +
        '</div>' +
        '<div style="text-align:center;padding:60px 0;font-family:\'Zpix\',monospace;font-size:11px;color:rgba(200,180,150,0.3);letter-spacing:2px;">即将上线…</div>';
      break;
    default:
      switchTab('play');
  }
}


/* ==========================================
   3. 新增 renderJukebox() — 点歌子页面
   ========================================== */
/**
 * 渲染点歌子页面（推歌历史列表）
 * @param {HTMLElement} el - #content 容器
 */
function renderJukebox(el) {
  el.innerHTML =
    '<div class="sub-header">' +
      '<button class="back-btn" onclick="switchTab(\'play\')">&lt; 返回</button>' +
      '<span class="sub-title">&#9835; 点歌</span>' +
      '<span class="sub-count" id="jukebox-count"></span>' +
    '</div>' +
    '<div id="jukebox-list">' +
      '<div class="jukebox-loading">推歌正在涌来…</div>' +
    '</div>';

  loadJukeboxData();
}


/* ==========================================
   4. 新增 loadJukeboxData() — 加载歌曲数据
   ========================================== */
/**
 * 从 Supabase 加载推歌数据并渲染
 */
async function loadJukeboxData() {
  var listEl = document.getElementById('jukebox-list');
  var countEl = document.getElementById('jukebox-count');
  if (!listEl) return;

  // 检查 Supabase 是否已初始化
  if (typeof sb === 'undefined' || !sb) {
    listEl.innerHTML =
      '<div class="jukebox-error">' +
        '<p>请先在设置中配置 Supabase 连接</p>' +
        '<button class="jukebox-retry-btn" onclick="switchTab(\'settings\')">前往设置</button>' +
      '</div>';
    return;
  }

  try {
    var result = await sb
      .from('songs')
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (result.error) throw result.error;

    var songs = result.data || [];

    // 更新计数
    if (countEl) {
      countEl.textContent = songs.length + ' 首';
    }

    // 空状态
    if (songs.length === 0) {
      listEl.innerHTML =
        '<div class="jukebox-empty">' +
          '还没有推歌<br>让 Lumin 帮你挑选一首吧' +
        '</div>';
      return;
    }

    // 渲染歌曲列表
    listEl.innerHTML = songs
      .map(function (song, index) {
        return buildSongCardHTML(song, index, songs.length);
      })
      .join('');

  } catch (err) {
    console.error('加载推歌数据失败:', err);
    listEl.innerHTML =
      '<div class="jukebox-error">' +
        '<p>加载失败，请稍后重试</p>' +
        '<button class="jukebox-retry-btn" onclick="loadJukeboxData()">重新加载</button>' +
      '</div>';
  }
}


/* ==========================================
   5. 新增 buildSongCardHTML() — 构建歌曲卡片
   ========================================== */
/**
 * 构建单首歌曲卡片的 HTML
 * @param {Object} song - 歌曲数据
 * @param {number} index - 在列表中的索引（从0开始）
 * @param {number} total - 列表总数
 * @returns {string} HTML 字符串
 */
function buildSongCardHTML(song, index, total) {
  var displayNumber = total - index; // 倒序编号：最新的是最大号
  var numberStr = String(displayNumber).padStart(2, '0');
  var safeTitle = escHtml(song.title || '未知歌曲');
  var safeArtist = escHtml(song.artist || '未知歌手');
  var safeReason = escHtml(song.reason || '');
  var safeMood = escHtml(song.mood || '');
  var safeUrl = escHtml(song.url || '#');
  var formattedDate = formatDate(song.date); // Phase 1 已有函数

  // 如果 url 不是有效链接，降级为 #
  var hasValidUrl = song.url && /^https?:\/\//.test(song.url);

  var html = '';

  // mood 标签
  if (safeMood) {
    html += '<div class="song-mood-tag">' + safeMood + '</div>';
  }

  // 歌名 + 歌手
  html += '<div class="song-card-header">';
  if (hasValidUrl) {
    html +=
      '<a href="' + safeUrl + '" target="_blank" rel="noopener noreferrer" class="song-title-link">' +
        safeTitle +
      '</a>';
  } else {
    html += '<span class="song-title-link" style="border-bottom:none;cursor:default;">' + safeTitle + '</span>';
  }
  html += '<span class="song-artist">— ' + safeArtist + '</span>';
  html += '</div>';

  // 推歌理由
  if (safeReason) {
    html += '<p class="song-reason">' + safeReason + '</p>';
  }

  // 底部：日期 + 外链按钮
  html += '<div class="song-card-footer">';
  html += '<span class="song-date">' + formattedDate + '</span>';
  if (hasValidUrl) {
    html +=
      '<a href="' + safeUrl + '" target="_blank" rel="noopener noreferrer" class="song-ext-link">' +
        '<svg viewBox="0 0 24 24" fill="currentColor">' +
          '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>' +
        '</svg>' +
        '网易云' +
      '</a>';
  }

  html += '</div>';

  // 用卡片包裹
  return (
    '<div class="song-card" style="animation-delay:' + (index * 0.08) + 's">' +
      '<div class="song-card-index">' + numberStr + '</div>' +
      html +
    '</div>'
  );
}


/* ==========================================
   6. 新增 loadLatestSong() — 加载最新一首歌（供 Home 页使用）
   ========================================== */
/**
 * 查询 songs 表最新一首歌，更新 Home 页 LAST SONG 卡片
 * 在 renderHome() 的数据加载流程中调用此函数
 */
async function loadLatestSong() {
  var cardEl = document.getElementById('last-song-card');
  if (!cardEl) return;

  // 检查 Supabase 是否已初始化
  if (typeof sb === 'undefined' || !sb) {
    cardEl.innerHTML =
      '<div class="last-song-placeholder">' +
        '请先在设置中配置 Supabase' +
      '</div>';
    return;
  }

  try {
    var result = await sb
      .from('songs')
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1);

    if (result.error) throw result.error;

    var songs = result.data || [];

    if (songs.length === 0) {
      // 无数据时保持占位
      cardEl.innerHTML =
        '<div class="last-song-placeholder">' +
          '还没有推歌记录' +
        '</div>';
      return;
    }

    var song = songs[0];
    var safeTitle = escHtml(song.title || '未知歌曲');
    var safeArtist = escHtml(song.artist || '未知歌手');
    var safeReason = escHtml(song.reason || '');
    var safeUrl = escHtml(song.url || '#');
    var hasValidUrl = song.url && /^https?:\/\//.test(song.url);
    var formattedDate = formatDate(song.date);

    var html = '';

    // 歌名 + 歌手
    html += '<div class="song-card-header">';
    if (hasValidUrl) {
      html +=
        '<a href="' + safeUrl + '" target="_blank" rel="noopener noreferrer" class="song-title-link">' +
          safeTitle +
        '</a>';
    } else {
      html += '<span class="song-title-link" style="border-bottom:none;cursor:default;">' + safeTitle + '</span>';
    }
    html += '<span class="song-artist">— ' + safeArtist + '</span>';
    html += '</div>';

    // 推歌理由
    if (safeReason) {
      html += '<p class="song-reason">' + safeReason + '</p>';
    }

    // 底部日期
    html +=
      '<div class="song-card-footer">' +
        '<span class="song-date">' + formattedDate + '</span>' +
      '</div>';

    cardEl.innerHTML = html;

  } catch (err) {
    console.error('加载最新推歌失败:', err);
    cardEl.innerHTML =
      '<div class="last-song-placeholder">' +
        '加载失败' +
      '</div>';
  }
}


/* ==========================================
   7. 修改 renderHome() — 集成 loadLatestSong()
   ========================================== */
// 在现有的 renderHome(el) 函数中：
//
// 步骤 A：确保 LAST SONG 卡片容器有 id="last-song-card"
//   将其 HTML 改为：
//   '<div class="last-song-card" id="last-song-card">' +
//     '<div class="last-song-placeholder">加载中…</div>' +
//   '</div>'
//
// 步骤 B：在 renderHome 的数据加载完成后调用 loadLatestSong()
//   例如在 Promise.all 或所有 await 之后添加：
//   loadLatestSong();
//
// 如果 renderHome 使用 .then() 链式调用，在最后的 .then() 中调用。


/* ==========================================
   8. 辅助函数确保存在（Phase 1 已有，这里仅作参考）
   ========================================== */
// 以下函数在 Phase 1 的 app.js 中应该已存在。
// 如果不存在，请添加：

/**
 * HTML 转义，防止 XSS
 * @param {string} s
 * @returns {string}
 */
function escHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 格式化 ISO 日期为 MM-DD
 * @param {string} iso - ISO 日期字符串
 * @returns {string}
 */
function formatDate(iso) {
  if (!iso) return '--';
  try {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '--';
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return m + '-' + day;
  } catch (e) {
    return '--';
  }
}

/**
 * 切换底部 Tab
 * @param {string} tab - 'home' | 'play' | 'memory' | 'footprint' | 'settings'
 */
function switchTab(tab) {
  // Phase 1 已实现，此处为占位说明
  // 该函数应更新底部导航高亮，并调用对应的 renderXxx(document.getElementById('content'))
  console.log('switchTab:', tab);
}
