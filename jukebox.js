/* ================================================================
   Lumin Home — jukebox.js (点歌模块)
   依赖: app.js (sb, escHtml, formatDate, switchTab, getNow)
   ================================================================ */

/* ===== 点歌子页面（Phase 2） ===== */

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

async function loadJukeboxData() {
  var listEl = document.getElementById('jukebox-list');
  var countEl = document.getElementById('jukebox-count');
  if (!listEl) return;

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

    if (countEl) {
      countEl.textContent = songs.length + ' 首';
    }

    if (songs.length === 0) {
      listEl.innerHTML =
        '<div class="jukebox-empty">' +
          '还没有推歌<br>让 Lumin 帮你挑选一首吧' +
        '</div>';
      return;
    }

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

function buildSongCardHTML(song, index, total) {
  var displayNumber = total - index;
  var numberStr = String(displayNumber).padStart(2, '0');
  var safeTitle = escHtml(song.title || '未知歌曲');
  var safeArtist = escHtml(song.artist || '未知歌手');
  var safeReason = escHtml(song.reason || '');
  var safeMood = escHtml(song.mood || '');
  var safeUrl = escHtml(song.url || '#');
  var formattedDate = formatDate(song.date);
  var hasValidUrl = song.url && /^https?:\/\//.test(song.url);

  var html = '';

  if (safeMood) {
    html += '<div class="song-mood-tag">' + safeMood + '</div>';
  }

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

  if (safeReason) {
    html += '<p class="song-reason">' + safeReason + '</p>';
  }

  html += '<div class="song-card-footer">';
  html += '<span class="song-date">' + formattedDate + '</span>';
  if (hasValidUrl) {
    html +=
      '<a href="' + safeUrl + '" target="_blank" rel="noopener noreferrer" class="song-ext-link">' +
        '<svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12">' +
          '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>' +
        '</svg>' +
        '网易云' +
      '</a>';
  }
  html += '</div>';

  return (
    '<div class="song-card" style="animation-delay:' + (index * 0.08) + 's">' +
      '<div class="song-card-index">' + numberStr + '</div>' +
      html +
    '</div>'
  );
}

/* ===== Home LAST SONG 独立加载 ===== */

async function loadLatestSong() {
  var cardEl = document.getElementById('h-song');
  if (!cardEl) return;

  if (typeof sb === 'undefined' || !sb) {
    cardEl.innerHTML =
      '<div class="card-label">LAST SONG</div>' +
      '<div class="last-song-placeholder">请先在设置中配置 Supabase</div>';
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
      cardEl.innerHTML =
        '<div class="card-label">LAST SONG</div>' +
        '<div class="last-song-placeholder">还没有推歌记录</div>';
      return;
    }

    var song = songs[0];
    var safeTitle = escHtml(song.title || '未知歌曲');
    var safeArtist = escHtml(song.artist || '未知歌手');
    var safeReason = escHtml(song.reason || '');
    var safeMood = escHtml(song.mood || '');
    var safeUrl = escHtml(song.url || '#');
    var hasValidUrl = song.url && /^https?:\/\//.test(song.url);
    var formattedDate = formatDate(song.date);

    var html = '<div class="card-label">LAST SONG</div>';

    if (safeMood) {
      html += '<div class="song-mood-tag" style="margin-bottom:8px;">' + safeMood + '</div>';
    }

    html += '<div class="card-body" style="margin-bottom:4px;">';
    if (hasValidUrl) {
      html +=
        '<a href="' + safeUrl + '" target="_blank" rel="noopener noreferrer" class="song-title-link" style="font-size:13px;">' +
          safeTitle +
        '</a>';
    } else {
      html += '<span class="song-title-link" style="border-bottom:none;cursor:default;font-size:13px;">' + safeTitle + '</span>';
    }
    html += ' <span class="song-artist" style="font-size:11px;">— ' + safeArtist + '</span>';
    html += '</div>';

    if (safeReason) {
      html += '<div class="card-sub" style="text-align:left;margin-top:4px;">' + safeReason + '</div>';
    }

    html +=
      '<div class="song-card-footer" style="margin-top:8px;">' +
        '<span class="song-date">' + formattedDate + '</span>' +
      '</div>';

    cardEl.innerHTML = html;

  } catch (err) {
    console.error('加载最新推歌失败:', err);
    cardEl.innerHTML =
      '<div class="card-label">LAST SONG</div>' +
      '<div class="last-song-placeholder">加载失败</div>';
  }
}
