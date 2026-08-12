/* 鼎瑋後台代租代管結算：案場 → 屋主 → 當月房戶。所有金額皆在瀏覽器即時計算。 */
(function () {
  const ROC_YEAR = new Date().getFullYear() - 1911;
  const MONTH = new Date().getMonth() + 1;
  const state = { projects: [], project: null, owners: [], owner: null, statements: [], statement: null, units: [] };
  const api = () => (typeof _sb !== 'undefined' ? _sb : null);
  const $ = (selector) => document.querySelector(selector);
  const esc = (value) => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));
  const num = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
  const money = (value) => Math.round(num(value)).toLocaleString('zh-TW');
  const decimal = (value) => Number(num(value).toFixed(2)).toString();
  const filenameSafe = (value) => String(value || '').replace(/[\\/:*?"<>|]/g, '－').trim() || '未命名';
  const todayUnit = () => ({ lease_roc_year: ROC_YEAR, lease_month: '', lease_day: '', unit_no: '', electricity_kwh: '', electricity_fee_override: null, rent_amount: '', management_fee: '', note: '' });
  const statementTitle = () => `${state.statement?.billing_roc_year || ROC_YEAR}年${state.statement?.billing_month || MONTH}月結算`;
  const fullFilename = () => `${filenameSafe(state.project?.name)}-${filenameSafe(state.owner?.owner_name)}-${statementTitle()}代租代管結算`;
  const calc = (unit) => {
    // 與既有代租代管帳表一致：用電度數乘單價後，小數直接捨去；
    // 舊帳表如曾人工調整電費，則保留該筆已核對的金額。
    const hasOverride = unit.electricity_fee_override !== null && unit.electricity_fee_override !== undefined && unit.electricity_fee_override !== '';
    const electricity = hasOverride ? num(unit.electricity_fee_override) : Math.floor(num(unit.electricity_kwh) * num(state.statement?.electricity_rate));
    const subtotal = Math.round(num(unit.rent_amount) + electricity);
    const total = Math.round(subtotal - num(unit.management_fee));
    return { electricity, subtotal, total };
  };
  const summary = () => state.units.reduce((sum, unit) => {
    const values = calc(unit);
    sum.kwh += num(unit.electricity_kwh); sum.rent += num(unit.rent_amount); sum.electricity += values.electricity;
    sum.subtotal += values.subtotal; sum.fee += num(unit.management_fee); sum.total += values.total; return sum;
  }, { kwh:0, rent:0, electricity:0, subtotal:0, fee:0, total:0 });
  const statementDraft = () => ({ id: '', billing_roc_year: ROC_YEAR, billing_month: MONTH, electricity_rate: num(state.project?.default_electricity_rate || 6.5), note: '' });

  function rootMarkup() {
    return `<section class="settle-shell" aria-label="代租代管結算">
      <header class="settle-head"><div><h2>代租代管結算</h2><p>依「案場 → 屋主 → 房戶」建立每月結算；總計即為本期應付屋主金額。</p></div><button class="btn btn-primary" type="button" onclick="DWRentalSettlements.showCreateProject()">＋ 新增案場</button></header>
      <div id="settleProjectCreate"></div><div id="settleProjects"></div><div id="settleWorkspace"></div>
    </section>`;
  }
  function renderCreateProject(show = true) {
    const el = $('#settleProjectCreate'); if (!el) return;
    el.innerHTML = show ? `<section class="settle-card"><div class="settle-card-head"><h3>建立新的代租代管案場</h3><button class="btn btn-ghost btn-sm" type="button" onclick="DWRentalSettlements.showCreateProject(false)">取消</button></div><div class="settle-project-form"><label>案場名称<input id="settleProjectName" placeholder="例：大園獨立套房"></label><label>预设每度（元）<input id="settleProjectRate" type="number" min="0" step="0.01" value="6.5"></label><button class="btn btn-primary" type="button" onclick="DWRentalSettlements.createProject()">建立案场</button></div></section>` : '';
  }
  function renderProjects() {
    const el = $('#settleProjects'); if (!el) return;
    if (!state.projects.length) { el.innerHTML = '<div class="settle-empty">尚未建立代租代管案场。先建立案场，再分别加入屋主与房户。</div>'; return; }
    el.innerHTML = `<div class="settle-project-grid">${state.projects.map(project => `<button type="button" class="settle-project ${state.project?.id === project.id ? 'on' : ''}" onclick="DWRentalSettlements.chooseProject('${project.id}')"><b>${esc(project.name)}</b><span>预设每度 ${decimal(project.default_electricity_rate)} 元</span><strong>${state.project?.id === project.id ? '处理中' : '开启结算'}</strong></button>`).join('')}</div>`;
  }
  function renderWorkspace() {
    const root = $('#settleWorkspace'); if (!root) return;
    if (!state.project) { root.innerHTML = ''; return; }
    root.innerHTML = `<div class="settle-workspace"><aside class="settle-side">
      <section class="settle-side-section"><div class="settle-side-title"><span>屋主名单</span><span>${state.owners.length} 位</span></div><div id="settleOwners" class="settle-owner-list"></div><div class="settle-mini-form"><input id="settleOwnerName" placeholder="屋主姓名或称呼"><input id="settleOwnerCode" placeholder="A／B／C"><button class="btn btn-primary" type="button" onclick="DWRentalSettlements.addOwner()">新增屋主</button></div></section>
      <p class="settle-rate-note">目前此案预设为 <b>${decimal(state.project.default_electricity_rate)} 元／度</b>，每张结算单皆可调整。住宅租赁按度计费须不超过当期电费单平均电价；储存前请以实际帐单核对。<a href="https://www.ey.gov.tw/Page/DFB720D019CCCB0A/478917df-7599-418f-8715-fd2716b623b4" target="_blank" rel="noopener">查看规定</a></p>
    </aside><section class="settle-main settle-card" id="settleStatement"></section></div>`;
    renderOwners(); renderStatement();
  }
  function renderOwners() {
    const el = $('#settleOwners'); if (!el) return;
    el.innerHTML = state.owners.length ? state.owners.map(owner => `<button type="button" class="settle-owner ${state.owner?.id === owner.id ? 'on' : ''}" onclick="DWRentalSettlements.chooseOwner('${owner.id}')"><b>${esc(owner.owner_name)}</b><span>${esc(owner.owner_code || '屋主')}</span></button>`).join('') : '<div class="settle-empty" style="padding:25px 10px">请先新增此案场的屋主。</div>';
  }
  function renderStatement() {
    const el = $('#settleStatement'); if (!el) return;
    if (!state.owner) { el.innerHTML = '<div class="settle-no-owner">从左侧选择屋主，或先新增屋主后开始建立结算表。</div>'; return; }
    const s = state.statement || statementDraft(); const existingOptions = state.statements.map(row => `<option value="${row.id}" ${row.id === s.id ? 'selected' : ''}>${row.billing_roc_year}年${row.billing_month}月</option>`).join('');
    el.innerHTML = `<div class="settle-statement-head"><div><h3>${esc(state.project.name)} · ${esc(state.owner.owner_name)} 的结算表</h3><p>租金 + 电费 = 合计；合计 − 代管费 = <b>应付屋主总计</b>。</p></div><div class="settle-actions"><select aria-label="已储存结算单" onchange="DWRentalSettlements.loadStatement(this.value)"><option value="">建立本期新结算</option>${existingOptions}</select><button class="btn btn-ghost" type="button" onclick="DWRentalSettlements.printStatement()">列印</button><button class="btn btn-ghost" type="button" onclick="DWRentalSettlements.downloadXlsx()">下载 Excel</button><button class="btn btn-ghost" type="button" onclick="DWRentalSettlements.shareStatement()">转发</button></div></div>
      <div class="settle-form"><label>结算民国年<input type="number" min="1" max="999" value="${esc(s.billing_roc_year)}" oninput="DWRentalSettlements.setStatement('billing_roc_year',this.value)"></label><label>结算月份<input type="number" min="1" max="12" value="${esc(s.billing_month)}" oninput="DWRentalSettlements.setStatement('billing_month',this.value)"></label><label>本期每度（元）<input class="settle-rate" type="number" min="0" step="0.01" value="${esc(s.electricity_rate)}" oninput="DWRentalSettlements.setStatement('electricity_rate',this.value)"></label><label>本期说明（选填）<input value="${esc(s.note)}" placeholder="例：电费依 115 年 8 月帐单平均电价" oninput="DWRentalSettlements.setStatement('note',this.value)"></label></div>
      <div class="settle-table-wrap"><table class="settle-table"><thead><tr><th>起租日</th><th>编号／房号</th><th>用电度数</th><th>租金</th><th>电费</th><th>合计</th><th>代管费</th><th>总计</th><th>备注</th><th></th></tr></thead><tbody id="settleRows"></tbody></table></div>
      <button type="button" class="btn btn-ghost settle-add-row" onclick="DWRentalSettlements.addUnit()">＋ 新增房户</button><div id="settleSummary" class="settle-summary"></div><div class="settle-note"><label>备注（本期整体特殊情形）<textarea placeholder="例：A1 房客当月未入住；电表故障待补抄。" oninput="DWRentalSettlements.setStatement('note',this.value)">${esc(s.note)}</textarea></label></div><div class="settle-save-line"><span id="settleSaveStatus" class="settle-save-status">${s.id ? '已开启已储存的结算单' : '尚未储存；可以先直接输入，稍后再储存。'}</span><button type="button" class="btn btn-primary" onclick="DWRentalSettlements.saveStatement()">储存本期结算</button></div>`;
    renderRows(); updateSummary();
  }
  function dateInput(i, field, width) { return `<input inputmode="numeric" maxlength="${width}" value="${esc(state.units[i][field] ?? '')}" oninput="DWRentalSettlements.changeUnit(${i},'${field}',this.value.replace(/\\D/g,''))">`; }
  function renderRows() {
    const el = $('#settleRows'); if (!el) return;
    el.innerHTML = state.units.map((unit, i) => { const c = calc(unit); return `<tr><td><div class="settle-date">${dateInput(i,'lease_roc_year',3)}<i>/</i>${dateInput(i,'lease_month',2)}<i>/</i>${dateInput(i,'lease_day',2)}</div></td><td><input type="text" value="${esc(unit.unit_no)}" oninput="DWRentalSettlements.changeUnit(${i},'unit_no',this.value)"></td><td><input type="number" min="0" step="0.01" value="${esc(unit.electricity_kwh)}" oninput="DWRentalSettlements.changeUnit(${i},'electricity_kwh',this.value)"></td><td><input type="number" min="0" step="1" value="${esc(unit.rent_amount)}" oninput="DWRentalSettlements.changeUnit(${i},'rent_amount',this.value)"></td><td><span class="settle-calc settle-electric" data-electric="${i}">${money(c.electricity)}</span></td><td><span class="settle-calc settle-subtotal" data-subtotal="${i}">${money(c.subtotal)}</span></td><td><input type="number" min="0" step="1" value="${esc(unit.management_fee)}" oninput="DWRentalSettlements.changeUnit(${i},'management_fee',this.value)"></td><td><span class="settle-calc settle-total" data-total="${i}">${money(c.total)}</span></td><td><input type="text" value="${esc(unit.note)}" oninput="DWRentalSettlements.changeUnit(${i},'note',this.value)"></td><td><button type="button" class="settle-delete" aria-label="删除本列" onclick="DWRentalSettlements.removeUnit(${i})">×</button></td></tr>`; }).join('');
  }
  function updateSummary() {
    const totals = summary(); const el = $('#settleSummary'); if (!el) return;
    state.units.forEach((unit, i) => { const c = calc(unit); const put = (kind, value) => { const node = document.querySelector(`[data-${kind}="${i}"]`); if (node) node.textContent = money(value); }; put('electric', c.electricity); put('subtotal', c.subtotal); put('total', c.total); });
    el.innerHTML = `<div><span>房户数／用电度数</span><b>${state.units.length} 间／${decimal(totals.kwh)} 度</b></div><div><span>租金合计</span><b>${money(totals.rent)} 元</b></div><div><span>电费合计</span><b>${money(totals.electricity)} 元</b></div><div><span>代管费合计</span><b>${money(totals.fee)} 元</b></div><div><span>本期应付屋主</span><b>${money(totals.total)} 元</b></div>`;
  }
  async function open() { if (!$('#panelSettlements').dataset.ready) { $('#panelSettlements').dataset.ready = 'yes'; $('#panelSettlements').innerHTML = rootMarkup(); } await loadProjects(); }
  async function loadProjects() { const sb = api(); if (!sb) return; const { data, error } = await sb.from('dw_management_projects').select('*').order('created_at', { ascending:false }); if (error) { $('#settleProjects').innerHTML = `<div class="settle-empty">读取案场失败：${esc(error.message)}</div>`; return; } state.projects = data || []; if (state.project && !state.projects.some(row => row.id === state.project.id)) state.project = null; renderProjects(); if (state.project) await chooseProject(state.project.id, true); }
  async function chooseProject(id, silent) { const project = state.projects.find(row => row.id === id); if (!project) return; state.project = project; state.owner = null; state.statement = null; state.units = []; renderProjects(); const sb = api(); const { data, error } = await sb.from('dw_management_owners').select('*').eq('project_id', id).order('created_at'); if (error) { if (!silent) alert('读取屋主失败：' + error.message); state.owners=[]; } else state.owners=data || []; renderWorkspace(); }
  async function createProject() { const name = ($('#settleProjectName')?.value || '').trim(); const rate = num($('#settleProjectRate')?.value); if (!name) { alert('请填写案场名称。'); return; } const { data, error } = await api().from('dw_management_projects').insert({ name, default_electricity_rate:rate || 6.5 }).select().single(); if (error) { alert('建立案场失败：' + error.message); return; } renderCreateProject(false); state.project=data; await loadProjects(); }
  async function addOwner() { const name = ($('#settleOwnerName')?.value || '').trim(); const code = ($('#settleOwnerCode')?.value || '').trim(); if (!name) { alert('请填写屋主姓名或称呼。'); return; } const { data, error } = await api().from('dw_management_owners').insert({ project_id:state.project.id, owner_name:name, owner_code:code }).select().single(); if (error) { alert('新增屋主失败：' + error.message); return; } state.owners.push(data); $('#settleOwnerName').value=''; $('#settleOwnerCode').value=''; chooseOwner(data.id); }
  async function chooseOwner(id) { state.owner = state.owners.find(row => row.id === id) || null; state.statement = statementDraft(); state.units = []; state.statements=[]; renderOwners(); if (!state.owner) { renderStatement(); return; } const { data, error } = await api().from('dw_management_statements').select('*').eq('owner_id', id).order('billing_roc_year', { ascending:false }).order('billing_month', { ascending:false }); if (error) alert('读取结算单失败：' + error.message); else state.statements=data || []; renderStatement(); }
  async function loadStatement(id) { if (!id) { state.statement=statementDraft(); state.units=[]; renderStatement(); return; } const statement=state.statements.find(row=>row.id===id); if (!statement) return; const { data, error } = await api().from('dw_management_statement_units').select('*').eq('statement_id', id).order('sort_order'); if (error) { alert('读取房户资料失败：'+error.message); return; } state.statement=statement; state.units=(data||[]).map(row=>({ ...row })); renderStatement(); }
  function setStatement(field, value) { if (!state.statement) state.statement=statementDraft(); state.statement[field]=value; if (field === 'electricity_rate') updateSummary(); }
  function changeUnit(index, field, value) { state.units[index][field]=value; updateSummary(); }
  function addUnit() { state.units.push(todayUnit()); renderRows(); updateSummary(); }
  function removeUnit(index) { state.units.splice(index,1); renderRows(); updateSummary(); }
  async function saveStatement(options={}) { if (!state.owner || !state.project) return null; const year=Math.trunc(num(state.statement.billing_roc_year)); const month=Math.trunc(num(state.statement.billing_month)); if (!year || month < 1 || month > 12) { if (!options.silent) alert('请填写正确的民国年与月份。'); return null; } const rate=num(state.statement.electricity_rate); const payload={ project_id:state.project.id, owner_id:state.owner.id, billing_roc_year:year, billing_month:month, electricity_rate:rate, note:(state.statement.note||'').trim() }; const status=$('#settleSaveStatus'); if (status) status.textContent='储存中…'; let result; if (state.statement.id) result=await api().from('dw_management_statements').update(payload).eq('id',state.statement.id).select().single(); else result=await api().from('dw_management_statements').upsert(payload,{onConflict:'owner_id,billing_roc_year,billing_month'}).select().single(); if (result.error) { if (!options.silent) alert('储存结算单失败：'+result.error.message); if(status) status.textContent='储存失败'; return null; } state.statement=result.data; const del=await api().from('dw_management_statement_units').delete().eq('statement_id',state.statement.id); if (del.error) { if (!options.silent) alert('清除旧房户资料失败：'+del.error.message); return null; } const units=state.units.map((unit,index)=>({ statement_id:state.statement.id, sort_order:index, lease_roc_year:num(unit.lease_roc_year)||null, lease_month:num(unit.lease_month)||null, lease_day:num(unit.lease_day)||null, unit_no:(unit.unit_no||'').trim(), electricity_kwh:num(unit.electricity_kwh), rent_amount:num(unit.rent_amount), management_fee:num(unit.management_fee), note:(unit.note||'').trim() })); if (units.length) { const inserted=await api().from('dw_management_statement_units').insert(units); if (inserted.error) { if (!options.silent) alert('储存房户资料失败：'+inserted.error.message); return null; } } state.statements=[state.statement,...state.statements.filter(row=>row.id!==state.statement.id)]; if(status) status.textContent=`已储存 ${new Date().toLocaleTimeString('zh-TW',{hour:'2-digit',minute:'2-digit'})}`; if (!options.silent) renderStatement(); return state.statement; }
  function makeWorkbook() { if (!window.XLSX) throw new Error('Excel 下载元件尚未载入，请重新整理后再试。'); const rows=[[`鼎瑋不動產｜${state.project.name}｜${state.owner.owner_name}`],[`${statementTitle()}代租代管結算`],['本期每度（元）',num(state.statement.electricity_rate)],['起租日','编号／房号','用电度数','租金','电费','合计','代管费','总计','备注']]; state.units.forEach((unit,index)=>{ const line=index+5; rows.push([`${unit.lease_roc_year||''}/${unit.lease_month||''}/${unit.lease_day||''}`,unit.unit_no||'',num(unit.electricity_kwh),num(unit.rent_amount),{f:`C${line}*$B$3`},{f:`D${line}+E${line}`},num(unit.management_fee),{f:`F${line}-G${line}`},unit.note||'']); }); const totalLine=5+state.units.length; const firstUnit=state.units.length ? 5 : totalLine; rows.push(['合计',`${state.units.length} 间`,{f:`SUM(C${firstUnit}:C${totalLine-1})`},{f:`SUM(D${firstUnit}:D${totalLine-1})`},{f:`SUM(E${firstUnit}:E${totalLine-1})`},{f:`SUM(F${firstUnit}:F${totalLine-1})`},{f:`SUM(G${firstUnit}:G${totalLine-1})`},{f:`SUM(H${firstUnit}:H${totalLine-1})`},'']); rows.push([]); rows.push(['本期应付屋主','','','','','','',{f:`H${totalLine}`},'']); rows.push([]); rows.push(['备注',state.statement.note||'']); const ws=XLSX.utils.aoa_to_sheet(rows); ws['!cols']=[{wch:14},{wch:13},{wch:12},{wch:13},{wch:13},{wch:13},{wch:13},{wch:14},{wch:27}]; ws['!merges']=[XLSX.utils.decode_range('A1:I1'),XLSX.utils.decode_range('A2:I2')]; const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'屋主结算'); return wb; }
  async function downloadXlsx() { const saved=await saveStatement({silent:true}); if(!saved) return; try { XLSX.writeFile(makeWorkbook(), fullFilename()+'.xlsx'); } catch(err) { alert('下载 Excel 失败：'+err.message); } }
  async function shareStatement() { const saved=await saveStatement({silent:true}); if(!saved) return; const name=fullFilename()+'.xlsx'; try { const wb=makeWorkbook(); const bytes=XLSX.write(wb,{bookType:'xlsx',type:'array'}); const file=new File([bytes],name,{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}); const text=`${state.project.name}｜${state.owner.owner_name}｜${statementTitle()}，本期应付屋主：${money(summary().total)} 元。`; if (navigator.share && navigator.canShare && navigator.canShare({files:[file]})) { await navigator.share({title:name,text,files:[file]}); } else { await navigator.clipboard.writeText(text); alert('此装置无法直接转发 Excel，已复制结算摘要；请先下载 Excel 后附档传送。'); } } catch(err) { if (err.name !== 'AbortError') alert('转发失败：'+err.message); } }
  async function printStatement() { const win=window.open('about:blank','_blank'); const saved=await saveStatement({silent:true}); if(!saved) { if(win) win.close(); return; } if (win) win.location.href='dw-settlement-print-k7f3q9.html?statement='+encodeURIComponent(saved.id); else alert('浏览器阻挡了列印视窗，请允许弹出视窗后再试。'); }
  // Re-declared here so imports with an audited manual electricity amount keep it
  // after any later save, Excel export, or share action.
  async function saveStatement(options = {}) {
    if (!state.owner || !state.project) return null;
    const year = Math.trunc(num(state.statement.billing_roc_year));
    const month = Math.trunc(num(state.statement.billing_month));
    if (!year || month < 1 || month > 12) { if (!options.silent) alert('請填寫正確的民國年與月份。'); return null; }
    const payload = { project_id:state.project.id, owner_id:state.owner.id, billing_roc_year:year, billing_month:month, electricity_rate:num(state.statement.electricity_rate), note:(state.statement.note || '').trim() };
    const status = $('#settleSaveStatus'); if (status) status.textContent = '儲存中…';
    const result = state.statement.id
      ? await api().from('dw_management_statements').update(payload).eq('id', state.statement.id).select().single()
      : await api().from('dw_management_statements').upsert(payload, { onConflict:'owner_id,billing_roc_year,billing_month' }).select().single();
    if (result.error) { if (!options.silent) alert('儲存結算單失敗：' + result.error.message); if (status) status.textContent = '儲存失敗'; return null; }
    state.statement = result.data;
    const deleted = await api().from('dw_management_statement_units').delete().eq('statement_id', state.statement.id);
    if (deleted.error) { if (!options.silent) alert('清除舊房戶資料失敗：' + deleted.error.message); return null; }
    const units = state.units.map((unit, index) => ({
      statement_id:state.statement.id, sort_order:index,
      lease_roc_year:num(unit.lease_roc_year) || null, lease_month:num(unit.lease_month) || null, lease_day:num(unit.lease_day) || null,
      unit_no:(unit.unit_no || '').trim(), electricity_kwh:num(unit.electricity_kwh),
      electricity_fee_override:(unit.electricity_fee_override === null || unit.electricity_fee_override === undefined || unit.electricity_fee_override === '') ? null : num(unit.electricity_fee_override),
      rent_amount:num(unit.rent_amount), management_fee:num(unit.management_fee), note:(unit.note || '').trim()
    }));
    if (units.length) { const inserted = await api().from('dw_management_statement_units').insert(units); if (inserted.error) { if (!options.silent) alert('儲存房戶資料失敗：' + inserted.error.message); return null; } }
    state.statements = [state.statement, ...state.statements.filter(row => row.id !== state.statement.id)];
    if (status) status.textContent = `已儲存 ${new Date().toLocaleTimeString('zh-TW', { hour:'2-digit', minute:'2-digit' })}`;
    if (!options.silent) renderStatement();
    return state.statement;
  }
  function makeWorkbook() {
    if (!window.XLSX) throw new Error('Excel 下載元件尚未載入，請重新整理後再試。');
    const rows = [[`鼎瑋不動產｜${state.project.name}｜${state.owner.owner_name}`], [`${statementTitle()}代租代管結算`], ['本期每度（元）', num(state.statement.electricity_rate)], ['起租日','編號／房號','用電度數','租金','電費','合計','代管費','總計','備註']];
    state.units.forEach((unit, index) => {
      const line = index + 5;
      const fixedElectricity = unit.electricity_fee_override !== null && unit.electricity_fee_override !== undefined && unit.electricity_fee_override !== '';
      const electricityCell = fixedElectricity ? num(unit.electricity_fee_override) : { f:`ROUNDDOWN(C${line}*$B$3,0)` };
      rows.push([`${unit.lease_roc_year || ''}/${unit.lease_month || ''}/${unit.lease_day || ''}`, unit.unit_no || '', num(unit.electricity_kwh), num(unit.rent_amount), electricityCell, { f:`D${line}+E${line}` }, num(unit.management_fee), { f:`F${line}-G${line}` }, unit.note || '']);
    });
    const totalLine = 5 + state.units.length, firstUnit = state.units.length ? 5 : totalLine;
    rows.push(['合計', `${state.units.length} 間`, { f:`SUM(C${firstUnit}:C${totalLine - 1})` }, { f:`SUM(D${firstUnit}:D${totalLine - 1})` }, { f:`SUM(E${firstUnit}:E${totalLine - 1})` }, { f:`SUM(F${firstUnit}:F${totalLine - 1})` }, { f:`SUM(G${firstUnit}:G${totalLine - 1})` }, { f:`SUM(H${firstUnit}:H${totalLine - 1})` }, '']);
    rows.push([], ['本期應付屋主','','','','','','', { f:`H${totalLine}` }, ''], [], ['備註', state.statement.note || '']);
    const ws = XLSX.utils.aoa_to_sheet(rows); ws['!cols'] = [{ wch:14 },{ wch:13 },{ wch:12 },{ wch:13 },{ wch:13 },{ wch:13 },{ wch:13 },{ wch:14 },{ wch:27 }]; ws['!merges'] = [XLSX.utils.decode_range('A1:I1'), XLSX.utils.decode_range('A2:I2')];
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, '屋主結算'); return wb;
  }
  window.DWRentalSettlements={ open, showCreateProject:renderCreateProject, chooseProject, createProject, addOwner, chooseOwner, loadStatement, setStatement, changeUnit, addUnit, removeUnit, saveStatement, downloadXlsx, shareStatement, printStatement };
})();
