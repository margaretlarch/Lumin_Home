/* ================================================================
   Lumin Home — tally.js (记账模块)
   依赖: app.js (sb, escHtml, formatDate, switchTab, getNow)
   ================================================================ */

/* ================================================================
   Phase 3 — Tally 记账模块
   ================================================================ */

var TALLY_CATS = {
  expense: [
    { name: '餐饮', color: '#d4916a' },
    { name: '交通', color: '#6a9abd' },
    { name: '日用', color: '#c8b870' },
    { name: '娱乐', color: '#9a7abd' },
    { name: '医疗', color: '#6abd9a' },
    { name: '恰恰', color: '#d4a07a' },
    { name: '其他', color: '#9a9080' },
    { name: '自定义', color: '#8a8a7a' }
  ],
  income: [
    { name: '工资报销', color: '#8abd6a' },
    { name: '红包', color: '#d47a6a' },
    { name: '其他', color: '#9a9080' }
  ]
};

function getCatColor(catName) {
  var all = TALLY_CATS.expense.concat(TALLY_CATS.income);
  var match = all.find(function(c) { return c.name === catName; });
  return match ? match.color : '#8a8a7a';
}

var tallyView = 'list'; // 'list' or 'stats'
var tallyFilter = '全部';
var tallyStatsMode = 'month'; // 'month' or 'year'
var tallyStatsDate = null; // { year, month }

async function renderTally(el) {
  var now = getNow();
  tallyStatsDate = { year: now.getFullYear(), month: now.getMonth() + 1 };

  el.innerHTML =
    '<div class="sub-header">' +
      '<button class="back-btn" onclick="switchTab(\'play\')">&lt; 返回</button>' +
      '<span class="sub-title">&#9878; 记账</span>' +
    '</div>' +
    '<div class="tally-tabs">' +
      '<button class="tally-tab active" id="tally-tab-list" onclick="switchTallyView(\'list\')">明细</button>' +
      '<button class="tally-tab" id="tally-tab-stats" onclick="switchTallyView(\'stats\')">统计</button>' +
    '</div>' +
    '<div id="tally-view"></div>';

  switchTallyView('list');
}

function switchTallyView(view) {
  tallyView = view;
  document.querySelectorAll('.tally-tab').forEach(function(b) { b.classList.remove('active'); });
  var tabBtn = document.getElementById('tally-tab-' + view);
  if (tabBtn) tabBtn.classList.add('active');

  var viewEl = document.getElementById('tally-view');
  if (!viewEl) return;

  if (view === 'list') {
    renderTallyList(viewEl);
  } else {
    renderTallyStats(viewEl);
  }
}

/* ----- 明细视图 ----- */

function renderTallyList(el) {
  var selectedType = 'expense';

  el.innerHTML =
    '<div class="tally-form">' +
      '<div class="tally-form-row">' +
        '<select id="tally-type" class="tally-select" onchange="updateTallyCats()"><option value="expense">支出</option><option value="income">收入</option></select>' +
        '<input id="tally-amount" class="tally-input" type="number" placeholder="金额" step="0.01" min="0.01" />' +
      '</div>' +
      '<div class="tally-cat-grid" id="tally-cat-grid"></div>' +
      '<input id="tally-custom-cat" class="tally-input" type="text" placeholder="自定义分类名" style="display:none;" />' +
      '<input id="tally-note" class="tally-input" type="text" placeholder="备注（可选）" />' +
      '<input id="tally-date" class="tally-input" type="date" />' +
      '<button class="tally-save-btn" onclick="saveTallyRecord()">记一笔</button>' +
    '</div>' +
    '<div class="tally-filter-bar" id="tally-filter-bar"></div>' +
    '<div id="tally-list"></div>';

  document.getElementById('tally-date').value = getNow().toISOString().split('T')[0];
  updateTallyCats();
  renderTallyFilterBar();
  loadTallyList();
}

function updateTallyCats() {
  var type = document.getElementById('tally-type').value;
  var cats = TALLY_CATS[type] || [];
  var grid = document.getElementById('tally-cat-grid');
  if (!grid) return;

  grid.innerHTML = cats.map(function(c, i) {
    return '<button class="tally-cat-btn' + (i === 0 ? ' active' : '') + '" data-cat="' + c.name + '" onclick="selectTallyCat(this)">' +
      '<span class="cat-dot" style="background:' + c.color + '"></span>' + c.name +
    '</button>';
  }).join('');

  var customInput = document.getElementById('tally-custom-cat');
  if (customInput) customInput.style.display = 'none';
}

function selectTallyCat(btn) {
  document.querySelectorAll('.tally-cat-btn').forEach(function(b) { b.classList.remove('active'); });
  btn.classList.add('active');

  var customInput = document.getElementById('tally-custom-cat');
  if (customInput) {
    customInput.style.display = btn.dataset.cat === '自定义' ? 'block' : 'none';
  }
}

function getSelectedCat() {
  var active = document.querySelector('.tally-cat-btn.active');
  if (!active) return '';
  if (active.dataset.cat === '自定义') {
    var customInput = document.getElementById('tally-custom-cat');
    return customInput ? customInput.value.trim() || '自定义' : '自定义';
  }
  return active.dataset.cat;
}

function renderTallyFilterBar() {
  var bar = document.getElementById('tally-filter-bar');
  if (!bar) return;
  var allCats = ['全部'].concat(TALLY_CATS.expense.map(function(c) { return c.name; }));
  bar.innerHTML = allCats.map(function(name) {
    var isActive = tallyFilter === name;
    var dot = name !== '全部' ? '<span class="cat-dot" style="background:' + getCatColor(name) + '"></span>' : '';
    return '<button class="filter-btn' + (isActive ? ' active' : '') + '" onclick="setTallyFilter(\'' + name + '\')">' +
      dot + name + '</button>';
  }).join('');
}

function setTallyFilter(cat) {
  tallyFilter = cat;
  renderTallyFilterBar();
  loadTallyList();
}

async function loadTallyList() {
  var listEl = document.getElementById('tally-list');
  if (!listEl) return;
  if (!sb) { listEl.innerHTML = '<div class="tally-empty">请先配置 Supabase</div>'; return; }

  try {
    var query = sb.from('tally_records').select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    var { data, error } = await query;
    if (error) throw error;

    var records = data || [];

    // apply filter
    if (tallyFilter !== '全部') {
      records = records.filter(function(r) { return r.category === tallyFilter; });
    }

    if (records.length === 0) {
      listEl.innerHTML = '<div class="tally-empty">' + (tallyFilter !== '全部' ? '该分类暂无记录' : '还没有记账记录') + '</div>';
      return;
    }

    // group by date with subtle spacing
    var lastDate = '';
    listEl.innerHTML = records.map(function(r) {
      var amt = parseFloat(r.amount).toFixed(2);
      var sign = r.type === 'income' ? '+' : '-';
      var catColor = getCatColor(r.category);
      var cat = r.category || '';
      var note = r.note ? ' · ' + escHtml(r.note) : '';
      var dateStr = r.date || '';
      var gap = (lastDate && dateStr !== lastDate) ? ' tally-date-gap' : '';
      lastDate = dateStr;

      return '<div class="tally-item' + gap + '">' +
        '<span class="cat-dot" style="background:' + catColor + '"></span>' +
        '<span class="tally-type ' + r.type + '">' + sign + '¥' + amt + '</span>' +
        '<span class="tally-desc">' + escHtml(cat) + note + '</span>' +
        '<span class="tally-date">' + formatDate(dateStr) + '</span>' +
        '<button class="delete-btn-small" onclick="deleteTallyRecord(\'' + r.id + '\')">×</button>' +
      '</div>';
    }).join('');

  } catch (e) {
    console.error('load tally:', e);
    listEl.innerHTML = '<div class="tally-error">加载失败</div>';
  }
}

async function saveTallyRecord() {
  var type = document.getElementById('tally-type').value;
  var amount = parseFloat(document.getElementById('tally-amount').value);
  var category = getSelectedCat();
  var note = document.getElementById('tally-note').value.trim();
  var date = document.getElementById('tally-date').value;
  if (!amount || amount <= 0) { alert('请输入金额'); return; }
  if (!sb) { alert('未连接 Supabase'); return; }

  try {
    var { error } = await sb.from('tally_records').insert([{
      type: type, amount: amount, category: category || null, note: note || null, date: date
    }]);
    if (error) throw error;
    document.getElementById('tally-amount').value = '';
    document.getElementById('tally-note').value = '';
    var customInput = document.getElementById('tally-custom-cat');
    if (customInput) customInput.value = '';
    loadTallyList();
  } catch (e) {
    console.error('save tally:', e);
    alert('保存失败: ' + e.message);
  }
}

async function deleteTallyRecord(id) {
  if (!confirm('删除这条记录？')) return;
  if (!sb) return;
  try {
    var { error } = await sb.from('tally_records').delete().eq('id', id);
    if (error) throw error;
    loadTallyList();
  } catch (e) {
    console.error('delete tally:', e);
    alert('删除失败: ' + e.message);
  }
}

/* ----- 统计视图 ----- */

function renderTallyStats(el) {
  el.innerHTML =
    '<div class="tally-stats-mode">' +
      '<button class="tally-tab' + (tallyStatsMode === 'month' ? ' active' : '') + '" onclick="setTallyStatsMode(\'month\')">月</button>' +
      '<button class="tally-tab' + (tallyStatsMode === 'year' ? ' active' : '') + '" onclick="setTallyStatsMode(\'year\')">年</button>' +
    '</div>' +
    '<div class="tally-stats-nav">' +
      '<button class="tally-nav-btn" onclick="tallyStatsPrev()">&lt;</button>' +
      '<span id="tally-stats-label">--</span>' +
      '<button class="tally-nav-btn" onclick="tallyStatsNext()">&gt;</button>' +
    '</div>' +
    '<div class="tally-stats-summary" id="tally-stats-summary"></div>' +
    '<div class="tally-chart-area" id="tally-chart-area"></div>' +
    '<div class="tally-stats-legend" id="tally-stats-legend"></div>';

  loadTallyStats();
}

function setTallyStatsMode(mode) {
  tallyStatsMode = mode;
  var viewEl = document.getElementById('tally-view');
  if (viewEl) renderTallyStats(viewEl);
}

function tallyStatsPrev() {
  if (tallyStatsMode === 'month') {
    tallyStatsDate.month--;
    if (tallyStatsDate.month < 1) { tallyStatsDate.month = 12; tallyStatsDate.year--; }
  } else {
    tallyStatsDate.year--;
  }
  loadTallyStats();
}

function tallyStatsNext() {
  if (tallyStatsMode === 'month') {
    tallyStatsDate.month++;
    if (tallyStatsDate.month > 12) { tallyStatsDate.month = 1; tallyStatsDate.year++; }
  } else {
    tallyStatsDate.year++;
  }
  loadTallyStats();
}

async function loadTallyStats() {
  var label = document.getElementById('tally-stats-label');
  var summary = document.getElementById('tally-stats-summary');
  var chartArea = document.getElementById('tally-chart-area');
  var legendEl = document.getElementById('tally-stats-legend');
  if (!label || !summary || !chartArea) return;

  if (!sb) { summary.innerHTML = '<div class="tally-empty">请先配置 Supabase</div>'; return; }

  var y = tallyStatsDate.year;
  var m = tallyStatsDate.month;

  if (tallyStatsMode === 'month') {
    label.textContent = y + '-' + String(m).padStart(2, '0');
    var startDate = y + '-' + String(m).padStart(2, '0') + '-01';
    var endM = m + 1, endY = y;
    if (endM > 12) { endM = 1; endY++; }
    var endDate = endY + '-' + String(endM).padStart(2, '0') + '-01';

    try {
      var { data, error } = await sb.from('tally_records').select('*')
        .gte('date', startDate).lt('date', endDate)
        .order('date', { ascending: true });
      if (error) throw error;

      var records = data || [];
      var totalIn = 0, totalOut = 0;
      var catTotals = {};

      records.forEach(function(r) {
        var amt = parseFloat(r.amount) || 0;
        if (r.type === 'income') { totalIn += amt; }
        else {
          totalOut += amt;
          var cat = r.category || '其他';
          catTotals[cat] = (catTotals[cat] || 0) + amt;
        }
      });

      summary.innerHTML =
        '<div class="stats-row">' +
          '<div class="stats-item"><span class="stats-num income">+¥' + totalIn.toFixed(2) + '</span><span class="stats-label">收入</span></div>' +
          '<div class="stats-item"><span class="stats-num expense">-¥' + totalOut.toFixed(2) + '</span><span class="stats-label">支出</span></div>' +
          '<div class="stats-item"><span class="stats-num">' + (totalIn - totalOut >= 0 ? '+' : '') + '¥' + (totalIn - totalOut).toFixed(2) + '</span><span class="stats-label">结余</span></div>' +
        '</div>';

      // bar chart: each day of the month stacked by category
      renderMonthChart(chartArea, legendEl, records, y, m, catTotals);

    } catch (e) {
      console.error('stats load:', e);
      summary.innerHTML = '<div class="tally-error">加载失败</div>';
    }

  } else {
    // year mode
    label.textContent = y + '年';
    var startDate = y + '-01-01';
    var endDate = (y + 1) + '-01-01';

    try {
      var { data, error } = await sb.from('tally_records').select('*')
        .gte('date', startDate).lt('date', endDate)
        .order('date', { ascending: true });
      if (error) throw error;

      var records = data || [];
      var totalIn = 0, totalOut = 0;
      var catTotals = {};

      records.forEach(function(r) {
        var amt = parseFloat(r.amount) || 0;
        if (r.type === 'income') { totalIn += amt; }
        else {
          totalOut += amt;
          var cat = r.category || '其他';
          catTotals[cat] = (catTotals[cat] || 0) + amt;
        }
      });

      summary.innerHTML =
        '<div class="stats-row">' +
          '<div class="stats-item"><span class="stats-num income">+¥' + totalIn.toFixed(2) + '</span><span class="stats-label">收入</span></div>' +
          '<div class="stats-item"><span class="stats-num expense">-¥' + totalOut.toFixed(2) + '</span><span class="stats-label">支出</span></div>' +
          '<div class="stats-item"><span class="stats-num">' + (totalIn - totalOut >= 0 ? '+' : '') + '¥' + (totalIn - totalOut).toFixed(2) + '</span><span class="stats-label">结余</span></div>' +
        '</div>';

      renderYearChart(chartArea, legendEl, records, y, catTotals);

    } catch (e) {
      console.error('stats load:', e);
      summary.innerHTML = '<div class="tally-error">加载失败</div>';
    }
  }
}

function renderMonthChart(chartArea, legendEl, records, year, month, catTotals) {
  var daysInMonth = new Date(year, month, 0).getDate();
  // build daily expense by category
  var dailyData = [];
  for (var d = 1; d <= daysInMonth; d++) {
    dailyData.push({ day: d, cats: {} });
  }
  records.forEach(function(r) {
    if (r.type !== 'expense') return;
    var day = parseInt(r.date.split('-')[2], 10);
    if (day >= 1 && day <= daysInMonth) {
      var cat = r.category || '其他';
      dailyData[day - 1].cats[cat] = (dailyData[day - 1].cats[cat] || 0) + (parseFloat(r.amount) || 0);
    }
  });

  // find max daily total for scale
  var maxDaily = 0;
  dailyData.forEach(function(dd) {
    var total = 0;
    Object.values(dd.cats).forEach(function(v) { total += v; });
    if (total > maxDaily) maxDaily = total;
  });
  if (maxDaily === 0) maxDaily = 100;

  var chartH = 120;
  var barW = Math.max(4, Math.floor((window.innerWidth - 60) / daysInMonth) - 1);

  var barsHtml = dailyData.map(function(dd) {
    var total = 0;
    Object.values(dd.cats).forEach(function(v) { total += v; });
    var barH = Math.round((total / maxDaily) * chartH);

    var segments = '';
    var sortedCats = Object.keys(dd.cats).sort();
    sortedCats.forEach(function(cat) {
      var segH = Math.max(1, Math.round((dd.cats[cat] / maxDaily) * chartH));
      segments += '<div class="chart-seg" style="height:' + segH + 'px;background:' + getCatColor(cat) + '"></div>';
    });

    return '<div class="chart-bar-wrap" style="width:' + barW + 'px" title="' + dd.day + '日 ¥' + total.toFixed(0) + '">' +
      '<div class="chart-bar" style="height:' + chartH + 'px">' + segments + '</div>' +
      (dd.day % 5 === 1 ? '<span class="chart-x-label">' + dd.day + '</span>' : '') +
    '</div>';
  }).join('');

  chartArea.innerHTML = '<div class="tally-chart">' + barsHtml + '</div>';
  renderLegend(legendEl, catTotals);
}

function renderYearChart(chartArea, legendEl, records, year, catTotals) {
  // group expense by month and category
  var monthlyData = [];
  for (var i = 0; i < 12; i++) { monthlyData.push({ month: i + 1, cats: {} }); }

  records.forEach(function(r) {
    if (r.type !== 'expense') return;
    var m = parseInt(r.date.split('-')[1], 10);
    if (m >= 1 && m <= 12) {
      var cat = r.category || '其他';
      monthlyData[m - 1].cats[cat] = (monthlyData[m - 1].cats[cat] || 0) + (parseFloat(r.amount) || 0);
    }
  });

  var maxMonthly = 0;
  monthlyData.forEach(function(md) {
    var total = 0;
    Object.values(md.cats).forEach(function(v) { total += v; });
    if (total > maxMonthly) maxMonthly = total;
  });
  if (maxMonthly === 0) maxMonthly = 100;

  var chartH = 120;

  var barsHtml = monthlyData.map(function(md) {
    var total = 0;
    Object.values(md.cats).forEach(function(v) { total += v; });

    var segments = '';
    var sortedCats = Object.keys(md.cats).sort();
    sortedCats.forEach(function(cat) {
      var segH = Math.max(1, Math.round((md.cats[cat] / maxMonthly) * chartH));
      segments += '<div class="chart-seg" style="height:' + segH + 'px;background:' + getCatColor(cat) + '"></div>';
    });

    var labels = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
    return '<div class="chart-bar-wrap year-bar" title="' + md.month + '月 ¥' + total.toFixed(0) + '">' +
      '<div class="chart-bar" style="height:' + chartH + 'px">' + segments + '</div>' +
      '<span class="chart-x-label">' + labels[md.month - 1] + '</span>' +
    '</div>';
  }).join('');

  chartArea.innerHTML = '<div class="tally-chart">' + barsHtml + '</div>';
  renderLegend(legendEl, catTotals);
}

function renderLegend(legendEl, catTotals) {
  if (!legendEl) return;
  var sorted = Object.keys(catTotals).sort(function(a, b) { return catTotals[b] - catTotals[a]; });
  if (sorted.length === 0) {
    legendEl.innerHTML = '<div class="tally-empty" style="padding:10px 0">暂无支出数据</div>';
    return;
  }
  legendEl.innerHTML = sorted.map(function(cat) {
    return '<div class="legend-item">' +
      '<span class="cat-dot" style="background:' + getCatColor(cat) + '"></span>' +
      '<span class="legend-name">' + escHtml(cat) + '</span>' +
      '<span class="legend-val">¥' + catTotals[cat].toFixed(2) + '</span>' +
    '</div>';
  }).join('');
}

