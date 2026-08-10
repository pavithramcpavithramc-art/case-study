const STORAGE_KEY = 'spendwise_dashboard_v1';
const DEFAULT_BUDGETS = {
  Food: 2500,
  Transport: 800,
  Groceries: 1500,
  Study: 1200,
  Entertainment: 1000,
  Other: 800
};

export const spendwise = (function(){
  let state = {transactions: [], budgets: {...DEFAULT_BUDGETS}, savingsGoal: 20000};

  function load(){
   try {
     const raw = localStorage.getItem(STORAGE_KEY);
     if (!raw) return;
     const parsed = JSON.parse(raw);
     if (Array.isArray(parsed)) {
       state.transactions = parsed;
       state.budgets = {...DEFAULT_BUDGETS};
       state.savingsGoal = 20000;
       return;
     }
     state.transactions = Array.isArray(parsed.transactions) ? parsed.transactions : [];
     state.budgets = parsed.budgets && typeof parsed.budgets === 'object' ? {...DEFAULT_BUDGETS, ...parsed.budgets} : {...DEFAULT_BUDGETS};
     state.savingsGoal = Number(parsed.savingsGoal) || 20000;
   } catch (error) {
     state = {transactions: [], budgets: {...DEFAULT_BUDGETS}, savingsGoal: 20000};
   }
  }

  function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  function all(){ return state.transactions.slice().sort((a,b)=> new Date(b.date) - new Date(a.date)); }
  function add(tx){
   tx.id = crypto.randomUUID();
   tx.date = tx.date || new Date().toISOString();
   tx.type = tx.type || 'expense';
   tx.amount = Number(tx.amount) || 0;
   state.transactions.push(tx);
   save();
  }
  function remove(id){ state.transactions = state.transactions.filter(t=>t.id!==id); save(); }
  function update(id, patch){ const t = state.transactions.find(x=>x.id===id); if(t){ Object.assign(t, patch); t.amount = Number(t.amount) || 0; save(); } }
  function setGoal(goal){ state.savingsGoal = Math.max(Number(goal)||0, 0); save(); }
  function totals(){
   const income = state.transactions.filter(t=>t.type==='income').reduce((sum, t)=> sum + Number(t.amount||0), 0);
   const expenses = state.transactions.filter(t=>t.type==='expense').reduce((sum, t)=> sum + Number(t.amount||0), 0);
   return {income, expenses, balance: income - expenses};
  }
  function budgetSnapshot(){
   const byCategory = {};
   state.transactions.filter(t=>t.type==='expense').forEach(t=>{
     byCategory[t.category] = (byCategory[t.category] || 0) + Number(t.amount || 0);
   });
   return Object.keys(state.budgets).map(category=>{
     const used = byCategory[category] || 0;
     const budget = Number(state.budgets[category] || 0);
     return {category, used, budget, percent: budget ? Math.min(100, Math.round((used / budget) * 100)) : 0};
   });
  }
  function insight(){
   const {income, expenses, balance} = totals();
   if (expenses > income) {
     return {tone: 'warning', text: 'You are spending more than you are receiving this month. Consider reducing discretionary categories first.'};
   }
   if (balance > 0) {
     return {tone: 'positive', text: 'Your balance is healthy and you are building room for savings.'};
   }
   return {tone: 'neutral', text: 'You are keeping spending close to your current income. Track each category to stay on target.'};
  }
  function monthlySummary(month){
   const visible = state.transactions.filter(t=>{
     const d = new Date(t.date);
     return !month || (d.getMonth()===month.getMonth() && d.getFullYear()===month.getFullYear());
   });
   return visible;
  }

  load();
  return {load, save, all, add, remove, update, setGoal, totals, budgetSnapshot, insight, monthlySummary};
})();

export function initSpendwiseUI(){
  const list = document.getElementById('spendwise-list');
  const form = document.getElementById('spendwise-form');
  const emptyState = document.getElementById('spendwise-empty');
  const balanceEl = document.getElementById('spendwise-balance');
  const incomeEl = document.getElementById('spendwise-income');
  const expensesEl = document.getElementById('spendwise-expenses');
  const savingsEl = document.getElementById('spendwise-savings');
  const budgetList = document.getElementById('budget-list');
  const insightCard = document.getElementById('insight-card');
  const goalForm = document.getElementById('goal-form');
  const goalInput = document.getElementById('goal-input');
  const goalProgress = document.getElementById('goal-progress');
  const goalStatus = document.getElementById('goal-status');
  const dateInput = form?.querySelector('input[name="date"]');
  const editingIdInput = document.getElementById('spendwise-editing-id');
  const formError = document.getElementById('spendwise-form-error');
  const submitButton = form?.querySelector('button[type="submit"]');
  const filterType = document.getElementById('filter-type');
  const filterCategory = document.getElementById('filter-category');
  const monthLabel = document.getElementById('spendwise-current-month');
  const categorySelect = form?.querySelector('select[name="category"]');
  const typeSelect = form?.querySelector('select[name="type"]');

  if(!list || !form) return;

  let filterState = {type: 'all', category: 'all'};
  let editingId = null;

  function render(){
   const transactions = spendwise.all().filter(tx => {
     const matchesType = filterState.type === 'all' || tx.type === filterState.type;
     const matchesCategory = filterState.category === 'all' || tx.category === filterState.category;
     return matchesType && matchesCategory;
   });

   list.innerHTML = '';
   emptyState?.classList.toggle('hidden', transactions.length > 0);

   transactions.forEach(tx => {
     const item = document.createElement('li');
     item.className = 'rounded-2xl border border-slate-200 bg-slate-50 p-4';
     const tone = tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600';
     const amountLabel = `${tx.type === 'income' ? '+' : '-'} ₹${Number(tx.amount || 0).toFixed(2)}`;
     item.innerHTML = `
       <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
         <div>
           <div class="flex flex-wrap items-center gap-2">
             <h3 class="font-semibold text-slate-900">${escapeHtml(tx.title)}</h3>
             <span class="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600">${escapeHtml(tx.category)}</span>
             <span class="rounded-full px-2.5 py-1 text-xs font-medium ${tx.type === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}">${escapeHtml(tx.type)}</span>
           </div>
           <p class="mt-2 text-sm text-slate-600">${new Date(tx.date).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'})}</p>
         </div>
         <div class="flex items-center gap-3">
           <p class="text-lg font-semibold ${tone}">${amountLabel}</p>
           <button class="rounded-full border border-slate-200 px-3 py-1 text-sm font-medium text-slate-600" data-action="edit" data-id="${tx.id}">Edit</button>
           <button class="rounded-full border border-rose-200 px-3 py-1 text-sm font-medium text-rose-600" data-action="delete" data-id="${tx.id}">Delete</button>
         </div>
       </div>`;
     list.appendChild(item);
   });

   const totals = spendwise.totals();
   balanceEl.textContent = formatCurrency(totals.balance);
   incomeEl.textContent = formatCurrency(totals.income);
   expensesEl.textContent = formatCurrency(totals.expenses);
   savingsEl.textContent = formatCurrency(Math.max(totals.balance, 0));

   budgetList.innerHTML = '';
   spendwise.budgetSnapshot().forEach(item => {
     const row = document.createElement('div');
     row.className = 'rounded-2xl border border-slate-200 bg-slate-50 p-4';
     row.innerHTML = `
       <div class="flex items-center justify-between gap-3">
         <div>
           <p class="font-semibold text-slate-900">${escapeHtml(item.category)}</p>
           <p class="text-sm text-slate-600">Used ${formatCurrency(item.used)} of ${formatCurrency(item.budget)}</p>
         </div>
         <p class="text-sm font-semibold ${item.percent >= 100 ? 'text-rose-600' : 'text-slate-700'}">${item.percent}%</p>
       </div>
       <div class="mt-3 h-2 rounded-full bg-white">
         <div class="h-2 rounded-full ${item.percent >= 100 ? 'bg-rose-500' : item.percent >= 75 ? 'bg-amber-500' : 'bg-emerald-500'}" style="width:${Math.min(100, item.percent)}%"></div>
       </div>`;
     budgetList.appendChild(row);
   });

   const insight = spendwise.insight();
   insightCard.className = `mt-6 rounded-2xl border p-4 text-sm text-slate-700 ${insight.tone === 'warning' ? 'border-rose-200 bg-rose-50' : insight.tone === 'positive' ? 'border-emerald-200 bg-emerald-50' : 'border-indigo-100 bg-indigo-50'}`;
   insightCard.textContent = insight.text;

   const goal = Number(spendwise.savingsGoal || 0);
   goalInput.value = goal;
   const progressWidth = goal ? Math.min(100, Math.round((Math.max(totals.balance, 0) / goal) * 100)) : 0;
   goalProgress.style.width = `${progressWidth}%`;
   goalStatus.textContent = goal ? `You are ${progressWidth}% of the way toward your ${formatCurrency(goal)} target.` : 'Set a savings target to start tracking progress.';

   const now = new Date();
   monthLabel.textContent = now.toLocaleDateString(undefined, {month: 'long', year: 'numeric'});
  }

  function resetForm(){
   form.reset();
   editingId = null;
   editingIdInput.value = '';
   submitButton.textContent = 'Add transaction';
   formError.classList.add('hidden');
   if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
  }

  function setEditing(id){
   const tx = spendwise.all().find(item => item.id === id);
   if (!tx) return;
   editingId = id;
   editingIdInput.value = id;
   formError.classList.add('hidden');
   if (form) {
     const titleInput = form.querySelector('input[name="title"]');
     const amountInput = form.querySelector('input[name="amount"]');
     const dateField = form.querySelector('input[name="date"]');
     if (titleInput) titleInput.value = tx.title || '';
     if (amountInput) amountInput.value = tx.amount || '';
     if (dateField) dateField.value = tx.date ? tx.date.split('T')[0] : new Date().toISOString().split('T')[0];
     if (typeSelect) typeSelect.value = tx.type || 'expense';
     if (categorySelect) categorySelect.value = tx.category || 'Other';
     submitButton.textContent = 'Update transaction';
     titleInput?.focus();
   }
  }

  form.addEventListener('submit', (e)=>{
   e.preventDefault();
   const fd = new FormData(form);
   const title = String(fd.get('title') || '').trim();
   const amount = Number(fd.get('amount'));
   const type = String(fd.get('type') || 'expense');
   const category = String(fd.get('category') || 'Other');
   const date = String(fd.get('date') || '').trim();

   if (!title || !Number.isFinite(amount) || amount <= 0 || !date) {
     formError.textContent = 'Please enter a title, a positive amount, and a date.';
     formError.classList.remove('hidden');
     return;
   }

   const tx = {title, amount, type, category, date: new Date(`${date}T00:00:00`).toISOString()};
   if (editingId) {
     spendwise.update(editingId, tx);
     toast('Transaction updated');
   } else {
     spendwise.add(tx);
     toast('Transaction added');
   }
   resetForm();
   render();
  });

  list.addEventListener('click', (event) => {
   const button = event.target.closest('button[data-id]');
   if (!button) return;
   const id = button.getAttribute('data-id');
   const action = button.getAttribute('data-action');
   if (action === 'delete') {
     spendwise.remove(id);
     if (editingId === id) resetForm();
     render();
     toast('Transaction deleted');
   }
   if (action === 'edit') {
     setEditing(id);
   }
  });

  filterType?.addEventListener('change', (e)=>{ filterState.type = e.target.value; render(); });
  filterCategory?.addEventListener('change', (e)=>{ filterState.category = e.target.value; render(); });

  goalForm?.addEventListener('submit', (e)=>{
   e.preventDefault();
   spendwise.setGoal(goalInput.value);
   render();
   toast('Savings goal updated');
  });

  resetForm();
  render();
}

function toast(msg){
  const t = document.createElement('div');
  t.textContent = msg;
  t.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-lg';
  document.body.appendChild(t);
  setTimeout(()=>t.remove(), 2000);
}

function formatCurrency(value){
  return `₹${Number(value || 0).toFixed(2)}`;
}

function escapeHtml(s){
  return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
}
