/* ================================================================
   Lumin Home — reading.js (共读模块)
   依赖: app.js (sb, escHtml, formatDate, switchTab, getNow)
   ================================================================ */

/* ================================================================
   Phase 3 — Reading 共读模块
   ================================================================ */

let currentBookId = null;
let currentChapterNum = null;

async function renderReadingHome(el) {
  el.innerHTML =
    '<div class="sub-header">' +
      '<button class="back-btn" onclick="switchTab(\'play\')">&lt; 返回</button>' +
      '<span class="sub-title">&#9776; 共读</span>' +
      '<span class="sub-count" id="reading-book-count"></span>' +
    '</div>' +
    '<div class="reading-filter-bar">' +
      '<button class="reading-filter-btn active" data-filter="all">全部</button>' +
      '<button class="reading-filter-btn" data-filter="reading">在读</button>' +
      '<button class="reading-filter-btn" data-filter="finished">已读完</button>' +
      '<button class="reading-filter-btn" data-filter="paused">暂停</button>' +
    '</div>' +
    '<div id="reading-book-list"></div>' +
    '<button class="reading-add-btn" onclick="renderAddBook(document.getElementById(\'content\'))">+ 添加新书</button>';

  var filterBar = el.querySelector('.reading-filter-bar');
  filterBar.addEventListener('click', function(e) {
    if (e.target.classList.contains('reading-filter-btn')) {
      filterBar.querySelectorAll('.reading-filter-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      loadReadingBooks(e.target.dataset.filter);
    }
  });
  loadReadingBooks('all');
}

async function loadReadingBooks(filter) {
  var listEl = document.getElementById('reading-book-list');
  var countEl = document.getElementById('reading-book-count');
  if (!listEl) return;
  if (!sb) { listEl.innerHTML = '<div class="empty-state">请先配置 Supabase</div>'; return; }

  try {
    var query = sb.from('reading_books').select('*').order('updated_at', { ascending: false });
    if (filter !== 'all') query = query.eq('status', filter);
    var { data, error } = await query;
    if (error) throw error;
    var books = data || [];
    if (countEl) countEl.textContent = books.length + ' 本';
    if (books.length === 0) {
      listEl.innerHTML = '<div class="empty-state"><div class="empty-desc">书架空空，添加一本新书吧</div></div>';
      return;
    }
    listEl.innerHTML = books.map(book => {
      var progress = book.total_chapters > 0 ? Math.round((book.current_chapter / book.total_chapters) * 100) : 0;
      return '<div class="reading-book-card" onclick="openBook(\'' + book.id + '\')">' +
        '<div class="book-cover">' + (book.cover_emoji || '📖') + '</div>' +
        '<div class="book-info">' +
          '<div class="book-title">' + escHtml(book.title) + '</div>' +
          '<div class="book-author">' + escHtml(book.author || '') + '</div>' +
          '<div class="book-progress-bar"><div class="book-progress-fill" style="width:' + progress + '%"></div></div>' +
          '<div class="book-progress-text">' + book.current_chapter + '/' + book.total_chapters + ' 章</div>' +
        '</div>' +
        '<div class="book-card-actions">' +
          '<div class="book-status">' + (book.status === 'reading' ? '在读' : book.status === 'finished' ? '已读完' : '暂停') + '</div>' +
          '<button class="delete-btn-small" onclick="event.stopPropagation();deleteBook(\'' + book.id + '\',\'' + escHtml(book.title).replace(/'/g, "\\'") + '\')">删除</button>' +
        '</div>' +
      '</div>';
    }).join('');
  } catch (e) {
    console.error('reading books:', e);
    listEl.innerHTML = '<div class="empty-state">加载失败</div>';
  }
}

function openBook(bookId) {
  currentBookId = bookId;
  currentChapterNum = null;
  renderReadingBook(document.getElementById('content'), bookId);
}

async function deleteBook(bookId, title) {
  if (!confirm('确定删除「' + title + '」？所有章节和笔记都会一起删除。')) return;
  if (!sb) return;
  try {
    // 外键设了 ON DELETE CASCADE，只需删 books 行
    var { error } = await sb.from('reading_books').delete().eq('id', bookId);
    if (error) throw error;
    renderReadingHome(document.getElementById('content'));
  } catch (e) {
    console.error('delete book:', e);
    alert('删除失败: ' + e.message);
  }
}

async function renderReadingBook(el, bookId) {
  if (!sb) { el.innerHTML = '请先配置 Supabase'; return; }
  var { data: book, error } = await sb.from('reading_books').select('*').eq('id', bookId).single();
  if (error || !book) {
    el.innerHTML = '<div class="sub-header"><button class="back-btn" onclick="renderReadingHome(document.getElementById(\'content\'))">&lt; 返回</button><span class="sub-title">书籍未找到</span></div>';
    return;
  }
  var chapterNum = currentChapterNum || book.current_chapter || 1;
  var { data: chapters, error: chErr } = await sb.from('reading_chapters').select('*').eq('book_id', bookId).eq('chapter_num', chapterNum).maybeSingle();
  if (chErr) { console.error(chErr); }
  var chapterContent = chapters ? chapters.content : '';
  var chapterTitle = chapters ? chapters.chapter_title : ('第' + chapterNum + '章');
  var wordCount = chapters ? chapters.word_count : 0;

  el.innerHTML =
    '<div class="sub-header">' +
      '<button class="back-btn" onclick="renderReadingHome(document.getElementById(\'content\'))">书架</button>' +
      '<span class="sub-title">' + escHtml(book.title) + '</span>' +
      '<button class="back-btn" onclick="openChapterList(\'' + bookId + '\')">目录</button>' +
    '</div>' +
    '<div class="reading-chapter-info">' +
      '<span id="reading-chapter-title">' + escHtml(chapterTitle) + '</span>' +
      '<span id="reading-word-count">' + wordCount + ' 字</span>' +
    '</div>' +
    '<div id="reading-content" class="reading-content">' +
      (chapterContent ? '<div class="chapter-text">' + escHtml(chapterContent).replace(/\n/g, '<br>') + '</div>' : '<div class="chapter-empty">本章暂无内容，点击编辑添加</div>') +
    '</div>' +
    '<div class="reading-nav">' +
      '<button id="prev-chapter" ' + (chapterNum <= 1 ? 'disabled' : '') + '>上一章</button>' +
      '<span class="reading-chapter-indicator">' + chapterNum + ' / ' + book.total_chapters + '</span>' +
      '<button id="next-chapter" ' + (chapterNum >= book.total_chapters ? 'disabled' : '') + '>下一章</button>' +
    '</div>' +
    '<div class="reading-actions">' +
      '<button class="reading-action-btn" onclick="editChapter(\'' + bookId + '\', ' + chapterNum + ')">编辑本章</button>' +
      '<button class="reading-action-btn" onclick="addNote(\'' + bookId + '\', ' + chapterNum + ')">添加笔记</button>' +
    '</div>' +
    '<div id="reading-notes" class="reading-notes"></div>';

  document.getElementById('prev-chapter').addEventListener('click', function() { navigateChapter(bookId, chapterNum - 1); });
  document.getElementById('next-chapter').addEventListener('click', function() { navigateChapter(bookId, chapterNum + 1); });
  loadReadingNotes(bookId, chapterNum);
  currentChapterNum = chapterNum;
}

function navigateChapter(bookId, newChapter) {
  currentChapterNum = newChapter;
  renderReadingBook(document.getElementById('content'), bookId);
}

async function loadReadingNotes(bookId, chapterNum) {
  var notesEl = document.getElementById('reading-notes');
  if (!notesEl) return;
  if (!sb) return;
  var { data, error } = await sb.from('reading_notes').select('*').eq('book_id', bookId).eq('chapter_num', chapterNum).order('created_at', { ascending: true });
  if (error) { console.error(error); return; }
  if (!data || data.length === 0) {
    notesEl.innerHTML = '';
    return;
  }
  notesEl.innerHTML = '<div class="notes-title">笔记</div>' + data.map(n =>
    '<div class="note-item"><div class="note-quote">“' + escHtml(n.quote || '') + '”</div><div class="note-text">' + escHtml(n.note || '') + '</div></div>'
  ).join('');
}

function editChapter(bookId, chapterNum) {
  var contentEl = document.getElementById('reading-content');
  if (!contentEl) return;
  var currentText = contentEl.querySelector('.chapter-text') ? contentEl.querySelector('.chapter-text').innerText : '';
  contentEl.innerHTML =
    '<textarea id="chapter-editor" class="chapter-editor">' + escHtml(currentText) + '</textarea>' +
    '<button class="reading-action-btn" onclick="saveChapter(\'' + bookId + '\', ' + chapterNum + ')">保存</button>';
}

async function saveChapter(bookId, chapterNum) {
  var textarea = document.getElementById('chapter-editor');
  if (!textarea) return;
  var content = textarea.value;
  var wordCount = content.replace(/\s/g, '').length;
  if (!sb) { alert('未连接 Supabase'); return; }

  var { data: existing } = await sb.from('reading_chapters').select('id').eq('book_id', bookId).eq('chapter_num', chapterNum).maybeSingle();
  if (existing) {
    var { error } = await sb.from('reading_chapters').update({ content, word_count: wordCount }).eq('id', existing.id);
    if (error) { alert('更新失败'); return; }
  } else {
    var { error } = await sb.from('reading_chapters').insert([{ book_id: bookId, chapter_num: chapterNum, content, word_count: wordCount }]);
    if (error) { alert('添加失败'); return; }
  }

  var { data: book } = await sb.from('reading_books').select('current_chapter').eq('id', bookId).single();
  if (book && chapterNum > book.current_chapter) {
    await sb.from('reading_books').update({ current_chapter: chapterNum, updated_at: new Date().toISOString() }).eq('id', bookId);
  } else {
    await sb.from('reading_books').update({ updated_at: new Date().toISOString() }).eq('id', bookId);
  }

  currentChapterNum = chapterNum;
  renderReadingBook(document.getElementById('content'), bookId);
}

function addNote(bookId, chapterNum) {
  var selection = window.getSelection().toString().trim();
  if (!selection) { alert('请先选中一段文字'); return; }
  var note = prompt('输入你的批注:');
  if (note === null) return;
  saveNote(bookId, chapterNum, selection, note);
}

async function saveNote(bookId, chapterNum, quote, note) {
  if (!sb) { alert('未连接'); return; }
  var { error } = await sb.from('reading_notes').insert([{ book_id: bookId, chapter_num: chapterNum, quote, note }]);
  if (error) { alert('保存失败: ' + error.message); return; }
  loadReadingNotes(bookId, chapterNum);
}

async function openChapterList(bookId) {
  var el = document.getElementById('content');
  if (!sb) return;
  var { data: chapters, error } = await sb.from('reading_chapters').select('chapter_num, chapter_title').eq('book_id', bookId).order('chapter_num');
  if (error) { console.error(error); return; }
  var html = '<div class="sub-header"><button class="back-btn" onclick="openBook(\'' + bookId + '\')">返回</button><span class="sub-title">目录</span></div>';
  html += '<div class="chapter-list">';
  if (!chapters || chapters.length === 0) {
    html += '<div class="empty-desc">暂无章节</div>';
  } else {
    chapters.forEach(ch => {
      html += '<div class="chapter-item" onclick="navigateChapter(\'' + bookId + '\', ' + ch.chapter_num + ')">第' + ch.chapter_num + '章 ' + escHtml(ch.chapter_title || '') + '</div>';
    });
  }
  html += '</div>';
  el.innerHTML = html;
}

/* ---------- 添加新书 ---------- */
function renderAddBook(el) {
  el.innerHTML =
    '<div class="sub-header">' +
      '<button class="back-btn" onclick="renderReadingHome(document.getElementById(\'content\'))">&lt; 返回</button>' +
      '<span class="sub-title">添加新书</span>' +
    '</div>' +
    '<div class="add-book-form">' +
      '<div class="tab-bar-add">' +
        '<button class="add-tab active" onclick="showAddMethod(\'manual\')">手动添加</button>' +
        '<button class="add-tab" onclick="showAddMethod(\'upload\')">上传文件</button>' +
      '</div>' +
      '<div id="add-manual">' +
        '<input id="new-book-title" placeholder="书名" class="tally-input" />' +
        '<input id="new-book-author" placeholder="作者（可选）" class="tally-input" />' +
        '<input id="new-book-chapters" type="number" placeholder="总章节数" class="tally-input" min="1" value="1" />' +
        '<input id="new-book-emoji" placeholder="封面 emoji（可选）" class="tally-input" maxlength="2" />' +
        '<button onclick="createManualBook()" class="tally-save-btn">创建</button>' +
      '</div>' +
      '<div id="add-upload" style="display:none">' +
        '<input type="file" id="upload-book-file" accept=".txt,.epub" class="tally-input" />' +
        '<button onclick="uploadAndCreateBook()" class="tally-save-btn">上传并创建</button>' +
      '</div>' +
    '</div>';
}

function showAddMethod(method) {
  document.querySelectorAll('.add-tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  document.getElementById('add-manual').style.display = method === 'manual' ? 'block' : 'none';
  document.getElementById('add-upload').style.display = method === 'upload' ? 'block' : 'none';
}

async function createManualBook() {
  var title = document.getElementById('new-book-title').value.trim();
  var author = document.getElementById('new-book-author').value.trim();
  var total = parseInt(document.getElementById('new-book-chapters').value) || 1;
  var emoji = document.getElementById('new-book-emoji').value.trim() || '📖';
  if (!title) { alert('请输入书名'); return; }
  if (!sb) { alert('未连接 Supabase'); return; }
  var { data, error } = await sb.from('reading_books').insert([{ title, author: author || null, total_chapters: total, cover_emoji: emoji }]).select();
  if (error) { alert('创建失败: ' + error.message); return; }
  openBook(data[0].id);
}

async function uploadAndCreateBook() {
  var fileInput = document.getElementById('upload-book-file');
  var file = fileInput.files[0];
  if (!file) { alert('请选择文件'); return; }
  if (!sb) { alert('未连接 Supabase'); return; }
  var title = file.name.replace(/\.[^/.]+$/, "");
  try {
    var chapters;
    if (file.name.endsWith('.epub')) {
      if (typeof JSZip === 'undefined') { alert('缺少 JSZip，请检查 CDN 引入'); return; }
      chapters = await parseEpub(file);
    } else {
      var text = await readFileAsText(file);
      chapters = parseChapters(text);
    }
    if (!chapters || chapters.length === 0) { alert('未能识别任何章节'); return; }

    var { data: bookData, error: bookErr } = await sb.from('reading_books').insert([{ title, total_chapters: chapters.length, cover_emoji: '📖' }]).select();
    if (bookErr) throw bookErr;
    var bookId = bookData[0].id;
    for (var i = 0; i < chapters.length; i++) {
      var ch = chapters[i];
      var wc = ch.content.replace(/\s/g, '').length;
      await sb.from('reading_chapters').insert([{ book_id: bookId, chapter_num: i + 1, chapter_title: ch.title, content: ch.content, word_count: wc }]);
    }
    alert('导入成功！共 ' + chapters.length + ' 章');
    openBook(bookId);
  } catch (e) {
    console.error(e);
    alert('导入失败: ' + e.message);
  }
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    var reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsText(file, 'UTF-8');
  });
}

function parseChapters(text) {
  // 去 BOM
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);

  var lines = text.split(/\r?\n/);

  // 多种章节标题格式，按优先级尝试
  var patterns = [
    /^第[一二三四五六七八九十百千万零两\d]+[章节回]\s*/,           // 第X章/节/回
    /^第[一二三四五六七八九十百千万零两\d]+[卷部篇集]\s*/,         // 第X卷/部/篇/集
    /^[Cc]hapter\s+\d+/,                                         // Chapter 1
    /^[序楔终]章/,                                                // 序章/楔章/终章
    /^[楔]子/,                                                    // 楔子
    /^[卷][一二三四五六七八九十百千万零两\d]+/,                     // 卷一
    /^【第?[一二三四五六七八九十百千万零两\d]+[章节回】]/,           // 【第X章】
    /^\d{1,4}[、.．]\s*/,                                         // 1、 或 1. 开头
  ];

  // 找到第一个能匹配到至少2个章节的 pattern
  var bestPattern = null;
  var bestCount = 0;
  for (var p = 0; p < patterns.length; p++) {
    var count = 0;
    for (var i = 0; i < lines.length; i++) {
      if (patterns[p].test(lines[i].trim())) count++;
    }
    if (count >= 2 && count > bestCount) {
      bestPattern = patterns[p];
      bestCount = count;
    }
  }

  if (bestPattern) {
    // 用最佳 pattern 切分
    var chapters = [];
    var currentTitle = null;
    var currentContent = [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (bestPattern.test(line)) {
        if (currentTitle !== null) chapters.push({ title: currentTitle, content: currentContent.join('\n').trim() });
        currentTitle = line;
        currentContent = [];
      } else {
        if (currentTitle !== null) {
          currentContent.push(line);
        } else if (chapters.length === 0 && line) {
          // 第一个章节标题前的内容 → 存为"前言"
          if (!currentContent.length) currentTitle = '前言';
          currentContent.push(line);
        }
      }
    }
    if (currentTitle !== null) chapters.push({ title: currentTitle, content: currentContent.join('\n').trim() });
    if (chapters.length > 0) return chapters;
  }

  // 降级：按固定字数切（约 3000 字一章）
  var fullText = lines.join('\n').trim();
  if (!fullText) return [];
  var chunkSize = 3000;
  var chapters = [];
  var pos = 0;
  var chNum = 1;
  while (pos < fullText.length) {
    var end = Math.min(pos + chunkSize, fullText.length);
    // 尽量在段落边界切
    if (end < fullText.length) {
      var breakPoint = fullText.lastIndexOf('\n\n', end);
      if (breakPoint > pos + chunkSize * 0.5) end = breakPoint;
      else {
        breakPoint = fullText.lastIndexOf('\n', end);
        if (breakPoint > pos + chunkSize * 0.5) end = breakPoint;
      }
    }
    chapters.push({ title: '第' + chNum + '节', content: fullText.slice(pos, end).trim() });
    pos = end;
    chNum++;
    // 跳过切分点的空行
    while (pos < fullText.length && fullText[pos] === '\n') pos++;
  }
  return chapters;
}

async function parseEpub(file) {
  var zip = await JSZip.loadAsync(file);
  var containerFile = zip.file("META-INF/container.xml");
  if (!containerFile) throw new Error("无效 ePub");
  var containerText = await containerFile.async("text");
  var rootMatch = containerText.match(/full-path="([^"]+)"/);
  if (!rootMatch) throw new Error("无法解析 container.xml");
  var opfPath = rootMatch[1];
  var opfFile = zip.file(opfPath);
  if (!opfFile) throw new Error("未找到 OPF");
  var opfText = await opfFile.async("text");

  var idrefs = [];
  var spineMatches = opfText.matchAll(/<itemref\s+[^>]*idref="([^"]+)"/g);
  for (var m of spineMatches) idrefs.push(m[1]);

  var manifestItems = {};
  var itemMatches = opfText.matchAll(/<item\s+[^>]*id="([^"]+)"[^>]*href="([^"]+)"[^>]*media-type="([^"]+)"/g);
  for (var m2 of itemMatches) manifestItems[m2[1]] = { href: m2[2], type: m2[3] };

  var basePath = opfPath.substring(0, opfPath.lastIndexOf('/') + 1);
  var chapters = [];
  for (var i = 0; i < idrefs.length; i++) {
    var idref = idrefs[i];
    var item = manifestItems[idref];
    if (!item || (item.type !== 'application/xhtml+xml' && item.type !== 'text/html')) continue;
    var fullHref = basePath + item.href;
    var htmlFile = zip.file(fullHref);
    if (!htmlFile) continue;
    var htmlText = await htmlFile.async("text");
    var parser = new DOMParser();
    var doc = parser.parseFromString(htmlText, "text/html");
    var bodyText = doc.body ? doc.body.innerText : '';
    chapters.push({ title: doc.title || ('第' + (i+1) + '章'), content: bodyText.trim() });
  }
  return chapters;
}

