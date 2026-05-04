let currentTab = 'home';

function switchTab(tab){
  currentTab = tab;
  render();
}

function render(){
  const el = document.getElementById('content');
  if(currentTab==='home'){
    el.innerHTML = `
      <div class="card">Today's Whisper（占位）</div>
      <div class="card">天气（占位）</div>
      <div class="card">纪念日（占位）</div>
    `;
  }
  if(currentTab==='play'){
    el.innerHTML = `<div class="card">功能即将上线</div>`;
  }
  if(currentTab==='memory'){
    el.innerHTML = `<div class="card">记忆库（待连接Supabase）</div>`;
  }
  if(currentTab==='footprint'){
    el.innerHTML = `<div class="card">足迹功能即将上线</div>`;
  }
  if(currentTab==='settings'){
    el.innerHTML = `
      <div class="card">
        <label>Supabase URL <input id="url"/></label><br/>
        <label>Anon Key <input id="key"/></label><br/>
        <button onclick="saveSettings()">保存</button>
      </div>
    `;
  }
}

function saveSettings(){
  const url = document.getElementById('url').value;
  const key = document.getElementById('key').value;
  localStorage.setItem('supabase_url', url);
  localStorage.setItem('supabase_key', key);
  alert('已保存');
}

render();
