const pad = n => String(n).padStart(2, '0');
const toISO = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const vietnamToday = () => new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
const parse = value => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value); return m ? new Date(Number(m[1]), Number(m[2])-1, Number(m[3]), 12) : null; };
const display = value => { const d = parse(value); return d ? `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}` : 'Chọn ngày'; };
let currentClose = null;
function enhance(input) {
  if (input.dataset.dateEnhanced || input.type !== 'date') return;
  input.dataset.dateEnhanced = 'true';
  const wrapper = document.createElement('div'); wrapper.className = 'date-picker';
  input.parentNode.insertBefore(wrapper, input); wrapper.append(input);
  input.classList.add('date-picker-native'); input.tabIndex = -1; input.setAttribute('aria-hidden', 'true');
  const trigger = document.createElement('button'); trigger.type = 'button'; trigger.className = 'date-picker-trigger'; trigger.setAttribute('aria-haspopup','dialog'); trigger.setAttribute('aria-expanded','false');
  const labels = [...input.labels || []];
  const label = labels.map(l => l.textContent.trim()).join(' ') || 'Chọn ngày';
  trigger.setAttribute('aria-label', label); wrapper.append(trigger);
  if (input.id) { trigger.id = `${input.id}-trigger`; labels.forEach(l => { l.htmlFor = trigger.id; }); }
  input.setAttribute('inputmode', 'none');
  const panel = document.createElement('div'); panel.className = 'date-picker-panel'; panel.hidden = true; panel.setAttribute('role','dialog'); panel.setAttribute('aria-label',`Lịch ${label.toLocaleLowerCase('vi')}`); wrapper.append(panel);
  let view = parse(input.value) || parse(input.min) || new Date(); let focused = null;
  function sync() { trigger.textContent = display(input.value); trigger.disabled = input.disabled; trigger.setAttribute('aria-label', `${label}: ${display(input.value)}`); }
  function close(restore = true) { panel.hidden = true; trigger.setAttribute('aria-expanded','false'); if (currentClose === close) currentClose = null; if (restore) trigger.focus(); }
  function render() {
    panel.replaceChildren(); const head = document.createElement('div'); head.className='date-picker-head';
    const prev=document.createElement('button'); prev.type='button'; prev.textContent='‹'; prev.setAttribute('aria-label','Tháng trước');
    const title=document.createElement('strong'); title.textContent=`Tháng ${view.getMonth()+1} ${view.getFullYear()}`;
    const next=document.createElement('button'); next.type='button'; next.textContent='›'; next.setAttribute('aria-label','Tháng sau');
    prev.onclick=()=>{ view=new Date(view.getFullYear(),view.getMonth()-1,1,12); render(); }; next.onclick=()=>{ view=new Date(view.getFullYear(),view.getMonth()+1,1,12); render(); }; head.append(prev,title,next); panel.append(head);
    const grid=document.createElement('div'); grid.className='date-picker-grid'; grid.setAttribute('role','group'); grid.setAttribute('aria-label',title.textContent);
    for (const name of ['T2','T3','T4','T5','T6','T7','CN']) { const cell=document.createElement('span'); cell.className='date-picker-weekday'; cell.textContent=name; grid.append(cell); }
    const first=new Date(view.getFullYear(),view.getMonth(),1,12); const offset=(first.getDay()+6)%7; const count=new Date(view.getFullYear(),view.getMonth()+1,0).getDate();
    for(let i=0;i<offset;i++) { const blank=document.createElement('span'); blank.setAttribute('aria-hidden','true'); grid.append(blank); }
    for(let day=1;day<=count;day++) { const date=new Date(view.getFullYear(),view.getMonth(),day,12); const iso=toISO(date); const b=document.createElement('button'); b.type='button'; b.className='date-picker-day'; b.textContent=String(day); b.dataset.date=iso; b.setAttribute('aria-label',display(iso)); b.setAttribute('aria-pressed',String(iso===input.value)); if(iso===vietnamToday()) b.setAttribute('aria-current','date'); b.disabled=(!!input.min&&iso<input.min)||(!!input.max&&iso>input.max); b.onclick=()=>{input.value=iso; input.dispatchEvent(new Event('input',{bubbles:true})); input.dispatchEvent(new Event('change',{bubbles:true})); sync(); close();}; grid.append(b); }
    panel.append(grid); const footer=document.createElement('div'); footer.className='date-picker-footer'; if(!input.required){const clear=document.createElement('button');clear.type='button';clear.textContent='Xóa';clear.onclick=()=>{input.value='';input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));sync();close();};footer.append(clear)} const today=document.createElement('button');today.type='button';today.textContent='Hôm nay';const now=vietnamToday();today.disabled=(!!input.min&&now<input.min)||(!!input.max&&now>input.max);today.onclick=()=>{input.value=now;input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));sync();close()};footer.append(today);panel.append(footer);
  }
  trigger.addEventListener('click',()=>{if(!panel.hidden){close();return;} if(currentClose)currentClose(false);view=parse(input.value)||parse(input.min)||new Date();render();panel.classList.remove('date-picker-panel--end');panel.hidden=false;if(panel.getBoundingClientRect().right>document.documentElement.clientWidth-8)panel.classList.add('date-picker-panel--end');trigger.setAttribute('aria-expanded','true');currentClose=close;focused=panel.querySelector(`[data-date="${input.value}"]:not(:disabled)`)||panel.querySelector('.date-picker-day:not(:disabled)');if(focused)focused.focus();});
  panel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close();return;} const shifts={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7};if(!(e.key in shifts)||!e.target.dataset.date)return;e.preventDefault();const date=parse(e.target.dataset.date);date.setDate(date.getDate()+shifts[e.key]);const iso=toISO(date);if((input.min&&iso<input.min)||(input.max&&iso>input.max))return;if(date.getMonth()!==view.getMonth()||date.getFullYear()!==view.getFullYear()){view=date;render()}panel.querySelector(`[data-date="${iso}"]`)?.focus();});
  input.addEventListener('input',sync);input.addEventListener('change',sync);input.addEventListener('invalid',()=>{sync();trigger.focus()});new MutationObserver(sync).observe(input,{attributes:true,attributeFilter:['disabled','min','max']});sync();
}
function scan() { document.querySelectorAll('input[type="date"]:not([data-date-enhanced])').forEach(enhance); }
scan(); new MutationObserver(scan).observe(document.body,{childList:true,subtree:true});
document.addEventListener('pointerdown',e=>{if(currentClose && !e.target.closest('.date-picker'))currentClose(false)});
