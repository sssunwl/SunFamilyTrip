// 共用 App 樣板：所有旅程頁面共用這份邏輯/UI
// 依賴每個旅程頁面先定義好以下全域變數：
// TRIP_ID, TRIP_TITLE, TRIP_SUBTITLE, TRIP_HERO_IMG, PHOTOS_URL,
// TRIP_CITY, TRIP_COORDS({lat,lon}，留空則不顯示即時資訊), TRIP_DEFAULT_CURRENCY, TRIP_EMERGENCY([{label,phone}]),
// MEMBERS, ITINERARY, GUIDE_ITEMS, TRIP_POLL(可省略)

window.onerror = function (message, source, lineno) {
    console.error(message);
    document.getElementById('loading').style.display = 'none';
    document.getElementById('root').style.display = 'none';
    const errorDiv = document.getElementById('error-message');
    errorDiv.style.display = 'flex';
    errorDiv.innerHTML = `<h3>哎呀！發生錯誤</h3><p>${message}</p><p>Line: ${lineno}</p>`;
};

const { useState, useEffect } = React;

const SPLITTABLE_MEMBERS = MEMBERS.filter(m => !m.excludeFromSplit);

/* --- Components --- */
const Icon = ({ name, size = 20, className }) => {
    useEffect(() => { lucide.createIcons(); }, [name]);
    return <i data-lucide={name} style={{ width: size, height: size }} className={className}></i>;
};

const WelcomeView = ({ onSelect }) => (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 animate-fade-in">
        <h1 className="font-serif text-2xl text-dark font-bold mb-2 text-center">{TRIP_TITLE}</h1>
        <p className="text-gray-400 text-sm mb-8 text-center">先告訴我們，你是誰？</p>
        <div className="grid grid-cols-3 gap-4 w-full max-w-sm">
            {MEMBERS.map(m => (
                <button key={m.id} onClick={() => onSelect(m)} className="flex flex-col items-center gap-2 bg-white p-4 rounded-2xl shadow-soft border border-white btn-press">
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-3xl">{m.avatar}</div>
                    <span className="text-sm font-bold text-dark">{m.name}</span>
                </button>
            ))}
        </div>
    </div>
);

const HeroHeader = () => (
    <div className="relative h-[220px] w-full overflow-hidden bg-white z-0 flex flex-col justify-end pb-4 items-center">
        <img src={TRIP_HERO_IMG} className="absolute inset-0 w-full h-full object-cover opacity-90" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg to-transparent"></div>
        <div className="relative z-10 text-center mb-1">
            <h1 className="font-serif text-3xl text-dark font-bold tracking-wide leading-tight shadow-sm text-center">{TRIP_TITLE}</h1>
            <div className="text-gray-500 text-xs font-bold mt-1 tracking-wider text-center">{TRIP_SUBTITLE}</div>
        </div>
    </div>
);

const FloatingTopNav = ({ activeDay, scrollTo }) => {
    const dayTabs = ITINERARY.map((day, i) => ({ id: day.id, label: day.date, weekday: day.weekday, dayNum: `Day ${i + 1}` }));
    return (
        <div className="sticky-nav-container justify-center">
            <div className="day-tabs-wrapper no-scrollbar">
                {dayTabs.map((tab) => (
                    <button key={tab.id} onClick={() => scrollTo(tab.id)} className={`day-pill ${activeDay === tab.id ? 'active' : ''}`}>
                        <span className="text-[13px] font-bold leading-tight">{tab.label}</span>
                        <span className="text-[12px] opacity-80 leading-tight">{tab.weekday}</span>
                        <span className="text-[12px] font-black mt-0.5">{tab.dayNum}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

const AvatarButton = ({ user, onClick }) => (
    <button onClick={onClick} className="avatar-fixed-btn" aria-label="切換身份">
        <span className="text-2xl">{user.avatar}</span>
    </button>
);

const IdentitySheet = ({ user, onSelect, onClose }) => (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end">
        <div className="modal-overlay" onClick={onClose}></div>
        <div className="modal-content animate-slide-up">
            <div className="modal-handle-bar" onClick={onClose}><div className="modal-drag-line"></div><div className="modal-close-text mt-1">下拉關閉</div></div>
            <div className="p-6 pt-2">
                <h3 className="font-serif text-xl text-dark font-bold mb-4 text-center">切換身份</h3>
                <div className="grid grid-cols-3 gap-4">
                    {MEMBERS.map(m => (
                        <button key={m.id} onClick={() => { onSelect(m); onClose(); }} className={`flex flex-col items-center gap-2 p-4 rounded-2xl shadow-soft border btn-press ${user.id === m.id ? 'border-accent bg-accent/10' : 'border-white bg-white'}`}>
                            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-3xl">{m.avatar}</div>
                            <span className="text-sm font-bold text-dark">{m.name}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    </div>
);

const BottomNav = ({ scrollTo }) => {
    const navItems = [
        { id: 'timeline', icon: 'calendar', label: '行程' },
        { id: 'guide', icon: 'compass', label: '資訊' },
        { id: 'wallet', icon: 'wallet', label: '記帳' },
        ...(TRIP_POLL ? [{ id: 'vote', icon: 'check-square', label: '投票' }] : []),
        { id: 'tools', icon: 'wrench', label: '工具' },
        { id: 'memory', icon: 'image', label: '回憶' }
    ];
    return (
        <div className="bottom-nav">
            {navItems.map(item => (
                <button key={item.id} onClick={() => scrollTo(item.id)} className="bottom-nav-item">
                    <Icon name={item.icon} size={22} />
                    <span className="text-[12px] font-bold mt-0.5">{item.label}</span>
                </button>
            ))}
        </div>
    );
};

/* --- 即時資訊（當地時間 + 即時天氣 + 即時匯率） --- */
const WEATHER_CODE_MAP = {
    0: { icon: 'sun', label: '晴天' }, 1: { icon: 'sun', label: '晴時多雲' }, 2: { icon: 'cloud-sun', label: '多雲時晴' }, 3: { icon: 'cloud', label: '多雲' },
    45: { icon: 'cloud-fog', label: '有霧' }, 48: { icon: 'cloud-fog', label: '有霧' },
    51: { icon: 'cloud-drizzle', label: '小雨' }, 53: { icon: 'cloud-drizzle', label: '小雨' }, 55: { icon: 'cloud-drizzle', label: '毛毛雨' },
    61: { icon: 'cloud-rain', label: '下雨' }, 63: { icon: 'cloud-rain', label: '下雨' }, 65: { icon: 'cloud-rain', label: '大雨' },
    71: { icon: 'cloud-snow', label: '下雪' }, 73: { icon: 'cloud-snow', label: '下雪' }, 75: { icon: 'cloud-snow', label: '大雪' },
    80: { icon: 'cloud-rain', label: '陣雨' }, 81: { icon: 'cloud-rain', label: '陣雨' }, 82: { icon: 'cloud-rain', label: '強陣雨' },
    95: { icon: 'cloud-lightning', label: '雷雨' }, 96: { icon: 'cloud-lightning', label: '雷雨' }, 99: { icon: 'cloud-lightning', label: '雷雨' }
};

const useLiveWeather = () => {
    const [weather, setWeather] = useState(null);
    useEffect(() => {
        if (!TRIP_COORDS) return;
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${TRIP_COORDS.lat}&longitude=${TRIP_COORDS.lon}&current_weather=true&timezone=auto`)
            .then(res => res.json())
            .then(data => setWeather({ ...data.current_weather, utc_offset_seconds: data.utc_offset_seconds }))
            .catch(() => {});
    }, []);
    return weather;
};

const LiveInfoBar = () => {
    const weather = useLiveWeather();
    const [, forceTick] = useState(0);
    const exchangeRates = useExchangeRates();
    const [quickRateInput, setQuickRateInput] = useState('1000');
    const [leftCurr, setLeftCurr] = useState(TRIP_DEFAULT_CURRENCY || 'THB');
    const [rightCurr, setRightCurr] = useState('HKD');

    useEffect(() => { const t = setInterval(() => forceTick(n => n + 1), 60000); return () => clearInterval(t); }, []);

    const quickRateOutput = exchangeRates ? (parseFloat(quickRateInput || 0) * (exchangeRates[rightCurr] / exchangeRates[leftCurr])).toFixed(2) : '...';

    let localTimeLabel = null;
    if (weather) {
        const destDate = new Date(Date.now() + weather.utc_offset_seconds * 1000);
        localTimeLabel = `${String(destDate.getUTCHours()).padStart(2, '0')}:${String(destDate.getUTCMinutes()).padStart(2, '0')}`;
    }
    const wInfo = weather ? (WEATHER_CODE_MAP[weather.weathercode] || { icon: 'cloud', label: '—' }) : null;

    return (
        <div className="px-6 mb-4 mt-4 space-y-3">
            {weather && (
                <div className="bg-white/80 backdrop-blur rounded-2xl p-3 shadow-sm border border-white flex items-center justify-center gap-6">
                    <div className="flex items-center gap-2"><Icon name="clock" size={18} className="text-primary" /><span className="text-sm font-bold text-dark">{TRIP_CITY} {localTimeLabel}</span></div>
                    <div className="flex items-center gap-2"><Icon name={wInfo.icon} size={18} className="text-primary" /><span className="text-sm font-bold text-dark">{Math.round(weather.temperature)}°C {wInfo.label}</span></div>
                </div>
            )}
            <div className="flex justify-center">
                <div className="bg-white/80 backdrop-blur rounded-full p-2 pl-4 pr-4 shadow-sm border border-white flex items-center gap-2 w-full max-w-xs">
                    <select value={leftCurr} onChange={e => setLeftCurr(e.target.value)} className="bg-transparent text-sm font-bold text-gray-500 outline-none"><option value="THB">THB</option><option value="HKD">HKD</option><option value="TWD">TWD</option><option value="USD">USD</option><option value="CNY">CNY</option><option value="JPY">JPY</option><option value="KRW">KRW</option></select>
                    <input type="number" value={quickRateInput} onChange={e => setQuickRateInput(e.target.value)} className="bg-transparent w-full outline-none font-bold text-dark text-center" placeholder="輸入" />
                    <span className="text-sm font-bold text-gray-400">≈</span>
                    <span className="text-sm font-bold text-primary">{quickRateOutput}</span>
                    <select value={rightCurr} onChange={e => setRightCurr(e.target.value)} className="bg-transparent text-sm font-bold text-primary outline-none"><option value="HKD">HKD</option><option value="THB">THB</option><option value="TWD">TWD</option><option value="USD">USD</option><option value="CNY">CNY</option><option value="JPY">JPY</option><option value="KRW">KRW</option></select>
                </div>
            </div>
        </div>
    );
};

/* --- Expense Module（記帳，透過 Firestore 即時同步） --- */
const CURRENCY_SYMBOLS = { THB: '฿', KRW: '₩', HKD: 'HK$', TWD: 'NT$', USD: '$', CNY: '¥', JPY: '¥' };

const useExchangeRates = () => {
    const [rates, setRates] = useState(null);
    useEffect(() => {
        const cacheKey = `exchange_rates_${TRIP_DEFAULT_CURRENCY}`;
        const saved = JSON.parse(localStorage.getItem(cacheKey));
        const today = new Date().toDateString();
        if (saved && saved.date === today) { setRates(saved.rates); return; }
        fetch(`https://open.er-api.com/v6/latest/${TRIP_DEFAULT_CURRENCY}`)
            .then(res => res.json())
            .then(data => {
                const filtered = {};
                ["THB", "HKD", "TWD", "JPY", "CNY", "USD", "KRW"].forEach(c => filtered[c] = data.rates[c]);
                localStorage.setItem(cacheKey, JSON.stringify({ date: today, rates: filtered }));
                setRates(filtered);
            })
            .catch(() => {
                if (saved) setRates(saved.rates);
                else setRates({ [TRIP_DEFAULT_CURRENCY]: 1, HKD: 0.22, TWD: 0.9, JPY: 4.2, CNY: 0.2, USD: 0.028, KRW: 37, THB: 1 });
            });
    }, []);
    return rates;
};

const ExpenseModule = ({ user }) => {
    const [expenseMode, setExpenseMode] = useState(null);
    const [expenses, setExpenses] = useState([]);
    const [item, setItem] = useState("");
    const [cost, setCost] = useState("");
    const [currency, setCurrency] = useState(TRIP_DEFAULT_CURRENCY || "THB");
    const [payer, setPayer] = useState(user.id);
    const [splitters, setSplitters] = useState(SPLITTABLE_MEMBERS.map(m => m.id));
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [historyFilter, setHistoryFilter] = useState('ALL');
    const [historySort, setHistorySort] = useState('DATE');
    const exchangeRates = useExchangeRates();
    const [isBalancesExpanded, setIsBalancesExpanded] = useState(false);

    useEffect(() => TripDB.listenExpenses(TRIP_ID, setExpenses), []);

    const toBaseAmount = (amt, curr) => {
        if (!exchangeRates) return amt;
        return amt * (1 / exchangeRates[curr]);
    };

    const autoCategorize = (txt) => {
        if (txt.match(/車|Grab|Bolt|Taxi|計程/i)) return "交通";
        if (txt.match(/食|飯|麵|餐|水|烤肉/i)) return "飲食";
        if (txt.match(/買|7-11|Big C|百貨/i)) return "購物";
        return "雜項";
    };

    const addExpense = () => {
        if (!item || !cost) return;
        const cat = autoCategorize(item);
        const baseAmt = toBaseAmount(parseFloat(cost), currency);
        TripDB.addExpense(TRIP_ID, {
            item, cost: parseFloat(cost), inputCurrency: currency, baseAmount: baseAmt,
            payer: expenseMode === 'public' ? payer : user.id,
            splitters: expenseMode === 'public' ? splitters : [user.id],
            type: expenseMode, category: cat
        });
        setItem(""); setCost(""); setExpenseMode(null);
    };

    const toggleSplitter = (id) => { if (splitters.includes(id)) setSplitters(splitters.filter(s => s !== id)); else setSplitters([...splitters, id]); };
    const toggleAll = () => { setSplitters(splitters.length === SPLITTABLE_MEMBERS.length ? [] : SPLITTABLE_MEMBERS.map(m => m.id)); };
    const deleteExpense = (id) => TripDB.deleteExpense(TRIP_ID, id);

    const balances = {};
    MEMBERS.forEach(m => balances[m.id] = 0);
    expenses.filter(e => e.type === 'public').forEach(e => {
        const amount = e.baseAmount;
        const share = amount / e.splitters.length;
        balances[e.payer] += amount;
        e.splitters.forEach(id => balances[id] -= share);
    });

    const publicTotal = expenses.reduce((acc, c) => acc + (c.type === 'public' ? c.baseAmount : 0), 0);
    const privateTotal = expenses.reduce((acc, c) => {
        if (c.type === 'private' && c.payer === user.id) return acc + c.baseAmount;
        if (c.type === 'public' && c.splitters.includes(user.id)) return acc + (c.baseAmount / c.splitters.length);
        return acc;
    }, 0);

    const toHKD = (amt) => (amt * (exchangeRates ? exchangeRates['HKD'] : 0.23)).toFixed(0);
    const baseSymbol = CURRENCY_SYMBOLS[TRIP_DEFAULT_CURRENCY] || '';

    return (
        <div id="wallet" className="px-4 pb-12 pt-8">
            <h2 className="font-serif text-2xl text-dark mb-4 px-2 flex items-center gap-2"><Icon name="book" className="text-accent" /> 旅行帳本</h2>

            <div className="bg-white p-4 rounded-3xl flex justify-between items-center relative overflow-hidden shadow-soft border border-white text-center mb-6">
                <div>
                    <div className="text-[13px] text-gray-500 mb-1 font-bold">總開支</div>
                    <div className="text-3xl font-serif font-bold text-dark">{baseSymbol}{(publicTotal).toFixed(0)}</div>
                    <div className="text-sm font-bold text-gray-400">≈ HKD {toHKD(publicTotal)}</div>
                </div>
                <div className="border-l border-r border-gray-100 px-4">
                    <div className="text-[13px] text-gray-500 mb-1 font-bold">每人應付</div>
                    <div className="text-xl font-bold text-accent">{baseSymbol}{(publicTotal / SPLITTABLE_MEMBERS.length).toFixed(0)}</div>
                    <div className="text-sm font-bold text-gray-400">≈ HKD {toHKD(publicTotal / SPLITTABLE_MEMBERS.length)}</div>
                </div>
                <div className="bg-primary/10 rounded-xl p-2">
                    <div className="text-[13px] text-primary mb-1 font-bold">個人開支</div>
                    <div className="text-lg font-bold text-primary">{baseSymbol}{privateTotal.toFixed(0)}</div>
                    <div className="text-sm font-bold text-primary/70">≈ HKD {toHKD(privateTotal)}</div>
                </div>
            </div>

            <div className="mb-4 bg-white/60 p-4 rounded-2xl">
                <div className="flex justify-between items-center cursor-pointer mb-2" onClick={() => setIsBalancesExpanded(!isBalancesExpanded)}>
                    <h3 className="font-bold text-xs text-gray-400">成員結算狀態</h3>
                    <Icon name={isBalancesExpanded ? "chevron-up" : "chevron-down"} size={16} className="text-gray-400" />
                </div>
                {isBalancesExpanded && (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                        {MEMBERS.map(m => {
                            const val = balances[m.id];
                            return <div key={m.id} className="flex justify-between items-center text-xs bg-white p-2 rounded-xl shadow-sm"><span className="flex items-center gap-1">{m.avatar} {m.name}</span><span className={val >= 0 ? 'text-green-600 font-bold' : 'text-red-500 font-bold'}>{val >= 0 ? `+${val.toFixed(0)}` : `${val.toFixed(0)}`}</span></div>
                        })}
                    </div>
                )}
            </div>

            <div className="bg-white p-5 rounded-3xl shadow-soft space-y-4 border border-white transition-all">
                {!expenseMode ? (
                    <div className="flex gap-2">
                        <button onClick={() => setExpenseMode('public')} className="btn-confirm flex-1 py-3 flex items-center justify-center gap-2"><Icon name="plus" size={18} /> 記公帳</button>
                        <button onClick={() => setExpenseMode('private')} className="btn-secondary flex-1 py-3 flex items-center justify-center gap-2"><Icon name="user-plus" size={18} /> 記私帳</button>
                    </div>
                ) : (
                    <>
                        <div className="flex justify-between items-center"><span className="text-xs font-bold text-gray-400">{expenseMode === 'public' ? '新增公帳' : '新增私帳'}</span><button onClick={() => setExpenseMode(null)}><Icon name="chevron-up" size={20} /></button></div>
                        <div className="flex gap-2 items-center">
                            <input type="number" placeholder="金額" value={cost} onChange={e => setCost(e.target.value)} className="bg-bg p-3 rounded-xl text-xl font-bold outline-none w-28 text-center" />
                            <select value={currency} onChange={e => setCurrency(e.target.value)} className="bg-bg p-3 rounded-xl text-sm font-bold">
                                <option value="THB">THB</option><option value="HKD">HKD</option><option value="KRW">KRW</option>
                            </select>
                        </div>
                        <input placeholder="項目名稱 (自動分類)" value={item} onChange={e => setItem(e.target.value)} className="w-full bg-bg p-3 rounded-xl text-sm outline-none" />
                        {expenseMode === 'public' && (
                            <>
                                <div><label className="text-xs text-gray-400 font-bold mb-1 block">誰付錢</label><div className="person-selector">{MEMBERS.map(m => <div key={m.id} onClick={() => setPayer(m.id)} className={`person-item ${payer === m.id ? 'selected' : 'unselected'}`}><div className="person-avatar">{m.avatar}</div><span className="person-name">{m.name}</span></div>)}</div></div>
                                <div><div className="flex justify-between mb-1"><label className="text-xs text-gray-400 font-bold">誰分攤</label><button onClick={toggleAll} className="text-[13px] text-accent">全選/清空</button></div><div className="person-selector">{MEMBERS.map(m => <div key={m.id} onClick={() => toggleSplitter(m.id)} className={`person-item ${splitters.includes(m.id) ? 'selected' : 'unselected'}`}><div className="person-avatar">{m.avatar}</div><span className="person-name">{m.name}</span></div>)}</div></div>
                            </>
                        )}
                        <div className="flex gap-2"><button onClick={() => setExpenseMode(null)} className="flex-1 bg-gray-100 py-3 rounded-xl font-bold text-gray-500">取消</button><button onClick={addExpense} className="flex-[2] btn-confirm py-3 shadow-lg">加入帳本</button></div>
                    </>
                )}
            </div>
            <button onClick={() => setShowHistoryModal(true)} className="w-full text-center text-sm text-gray-500 font-bold py-3 bg-white rounded-xl border border-gray-100 hover:bg-gray-50 mt-4 flex items-center justify-center gap-2"><Icon name="scroll-text" size={16} /> 查看全部紀錄</button>

            {showHistoryModal && <ExpensesHistoryModal expenses={expenses} onClose={() => setShowHistoryModal(false)} onDelete={deleteExpense} filterMode={historyFilter} setFilterMode={setHistoryFilter} sortMode={historySort} setSortMode={setHistorySort} />}
        </div>
    );
};

/* --- Vote Module（投票，透過 Firestore 即時同步） --- */
const VoteModule = ({ user }) => {
    const [data, setData] = useState({ votes: {} });

    useEffect(() => {
        if (!TRIP_POLL) return;
        return TripDB.listenPoll(TRIP_ID, TRIP_POLL.id, setData);
    }, []);

    if (!TRIP_POLL) return null;

    const votes = data.votes || {};
    const counts = {};
    TRIP_POLL.options.forEach(o => counts[o] = 0);
    Object.values(votes).forEach(choice => { if (counts[choice] !== undefined) counts[choice]++; });
    const myChoice = votes[user.id];
    const totalVotes = Object.keys(votes).length;

    return (
        <div id="vote" className="px-4 pb-12 pt-8">
            <h2 className="font-serif text-2xl text-dark mb-4 px-2 flex items-center gap-2"><Icon name="check-square" className="text-accent" /> 投票</h2>
            <div className="bg-white p-5 rounded-3xl shadow-soft border border-white">
                <div className="font-bold text-dark mb-4">{TRIP_POLL.question}</div>
                <div className="space-y-3">
                    {TRIP_POLL.options.map(opt => {
                        const pct = totalVotes ? Math.round((counts[opt] / totalVotes) * 100) : 0;
                        const selected = myChoice === opt;
                        return (
                            <button key={opt} onClick={() => TripDB.castVote(TRIP_ID, TRIP_POLL.id, user.id, opt)}
                                className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${selected ? 'border-primary bg-primary/10' : 'border-gray-100 bg-bg'}`}>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="font-bold text-dark">{opt}{selected ? ' ✓' : ''}</span>
                                    <span className="text-xs font-bold text-gray-400">{counts[opt]} 票</span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-primary" style={{ width: `${pct}%` }}></div></div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

/* --- 回憶留言（透過 Firestore 即時同步） --- */
const MemoryNotes = ({ user }) => {
    const [notes, setNotes] = useState([]);
    const [text, setText] = useState("");

    useEffect(() => TripDB.listenNotes(TRIP_ID, setNotes), []);

    const submit = () => {
        if (!text.trim()) return;
        TripDB.addNote(TRIP_ID, { userId: user.id, name: user.name, avatar: user.avatar, text: text.trim() });
        setText("");
    };

    return (
        <div className="px-2 text-left">
            <div className="flex gap-2 mb-4">
                <input value={text} onChange={e => setText(e.target.value)} placeholder="留下這次的回憶..." className="flex-1 bg-white p-3 rounded-xl text-sm outline-none border border-gray-100" />
                <button onClick={submit} className="btn-confirm px-4 rounded-xl font-bold">送出</button>
            </div>
            <div className="space-y-2">
                {notes.map(n => (
                    <div key={n.id} className="bg-white p-3 rounded-xl border border-gray-100 flex gap-2 items-start shadow-sm">
                        <div className="text-xl">{n.avatar}</div>
                        <div><div className="text-xs font-bold text-gray-400">{n.name}</div><div className="text-sm text-dark">{n.text}</div></div>
                    </div>
                ))}
                {notes.length === 0 && <div className="text-xs text-gray-400 text-center">還沒有人留言，第一個留言吧！</div>}
            </div>
        </div>
    );
};

const UniversalDetailSheet = ({ item, onClose, type }) => {
    const [activeImgDesc, setActiveImgDesc] = useState("點擊照片查看更多細節...");
    const isGuide = type === 'guide';
    const title = item.title || item.name;
    const tag = item.type || item.tag;
    const desc1 = item.desc || item.desc_1;
    const desc2 = item.galleryDesc || item.desc_2;
    const img = item.img || item.cover;
    const location = item.location || item.name;
    const thai = item.thai_text;

    let displayGallery = [];
    if (isGuide) {
        displayGallery = [...(item.gallery1 || []), ...(item.gallery2 || [])];
    } else {
        displayGallery = (item.gallery || []).slice(0, 6);
    }
    const gridItems = displayGallery.slice(0, 6);

    return (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end">
            <div className="modal-overlay" onClick={onClose}></div>
            <div className="modal-content animate-slide-up">
                <div className="modal-handle-bar" onClick={onClose}><div className="modal-drag-line"></div><div className="modal-close-text mt-1">下拉關閉</div></div>
                <div className="p-6 pt-2 space-y-6">
                    <div className="relative h-56 w-full rounded-2xl overflow-hidden shadow-sm">
                        <img src={img} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                        <div className="absolute bottom-4 left-4">
                            <span className="bg-accent text-white text-[13px] px-2 py-1 rounded-md font-bold uppercase inline-block mb-1 shadow-sm">{tag}</span>
                            <h1 className="text-2xl font-serif font-bold text-white leading-tight">{title}</h1>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button className="flex-1 py-2 bg-gray-100 rounded-xl text-xs font-bold text-gray-600 flex items-center justify-center gap-1 hover:bg-gray-200" onClick={() => window.open(`https://www.google.com/search?q=${title}`, '_blank')}><Icon name="globe" size={14} /> 官網</button>
                        <button className="flex-1 py-2 bg-gray-100 rounded-xl text-xs font-bold text-gray-600 flex items-center justify-center gap-1 hover:bg-gray-200" onClick={() => window.open(`https://www.youtube.com/results?search_query=${title} ${TRIP_TITLE}`, '_blank')}><Icon name="youtube" size={14} /> 影片</button>
                        <button className="flex-1 py-2 bg-gray-100 rounded-xl text-xs font-bold text-gray-600 flex items-center justify-center gap-1 hover:bg-gray-200" onClick={() => window.open(`https://www.instagram.com/explore/tags/${title.replace(/\s/g, '')}/`, '_blank')}><Icon name="instagram" size={14} /> IG</button>
                    </div>
                    <div><h3 className="font-bold text-dark mb-2 text-sm">✨ 亮點介紹</h3><p className="text-sm text-gray-600 leading-relaxed bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">{desc1}</p></div>

                    {gridItems.length > 0 && (
                        <div>
                            <h4 className="font-bold text-dark text-sm mb-3 flex items-center gap-2"><Icon name="image" size={16} className="text-accent" /> 精彩瞬間</h4>
                            <div className="ig-6-grid">
                                {gridItems.map((g, i) => {
                                    const url = g.url || g;
                                    if (i === 4) return <div key={i} className="ig-center-text">{activeImgDesc}</div>;
                                    return <div key={i} className="ig-cell" onClick={() => setActiveImgDesc(g.desc || "查看詳情")}><img src={url} /></div>;
                                })}
                            </div>
                        </div>
                    )}

                    {desc2 && (<div><p className="text-sm text-gray-600 leading-relaxed bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">{desc2}</p></div>)}
                    {thai && (<div className="bg-primary/10 rounded-2xl p-4 flex items-center justify-between border border-primary/20"><div><div className="text-[13px] text-primary font-bold mb-1">SHOW TO DRIVER</div><div className="text-xl font-bold text-dark">{thai}</div></div><Icon name="copy" size={20} className="text-primary cursor-pointer" /></div>)}
                    <div><h4 className="font-bold text-dark mb-2 text-sm">📍 位置導航</h4><div className="square-map shadow-soft overflow-hidden rounded-2xl"><iframe loading="lazy" allowFullScreen src={`https://www.google.com/maps?q=${encodeURIComponent(location)}&output=embed`}></iframe></div><button className="w-full mt-3 bg-dark text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 btn-press shadow-md" onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`, '_blank')}><Icon name="map-pin" size={16} /> 開啟 Google Maps</button></div>
                </div>
            </div>
        </div>
    );
};

const ExpensesHistoryModal = ({ expenses, onClose, onDelete, filterMode, setFilterMode, sortMode, setSortMode }) => {
    const filtered = expenses.filter(ex => {
        if (filterMode === 'ALL') return true;
        if (filterMode === 'PUBLIC') return ex.type === 'public';
        if (filterMode === 'PRIVATE') return ex.type === 'private';
        return true;
    });
    const sorted = [...filtered].sort((a, b) => {
        if (sortMode === 'COST') return b.cost - a.cost;
        return 0;
    });

    return (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="modal-content animate-slide-up" style={{ height: '60vh', background: '#F9FAFB' }}>
                <div className="modal-handle-bar" onClick={onClose}><div className="modal-drag-line"></div></div>
                <div className="p-4 bg-white shadow-sm flex justify-between items-center sticky top-0 z-10">
                    <h2 className="text-xl font-bold text-dark">帳本紀錄</h2>
                </div>
                <div className="p-4 space-y-2 bg-white">
                    <div className="flex gap-2 overflow-x-auto no-scrollbar items-center">
                        {['ALL', 'PUBLIC', 'PRIVATE'].map(m => (
                            <button key={m} onClick={() => setFilterMode(m)} className={`filter-btn ${filterMode === m ? 'active' : ''}`}>{m === 'ALL' ? '全部' : m === 'PUBLIC' ? '公帳' : '個人'}</button>
                        ))}
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 pb-20 bg-gray-50/50">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-3"><h4 className="text-xs font-bold text-gray-400 text-center mb-2">公帳紀錄</h4>{sorted.filter(e => e.type === 'public').map(ex => <ExpenseCard key={ex.id} ex={ex} onDelete={onDelete} />)}</div>
                        <div className="space-y-3 border-l border-gray-100 pl-2"><h4 className="text-xs font-bold text-gray-400 text-center mb-2">個人紀錄</h4>{sorted.filter(e => e.type === 'private').map(ex => <ExpenseCard key={ex.id} ex={ex} onDelete={onDelete} />)}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ExpenseCard = ({ ex, onDelete }) => {
    let catColor = 'bg-white';
    if (ex.category === '交通') catColor = 'bg-blue-50';
    if (ex.category === '飲食') catColor = 'bg-orange-50';
    if (ex.category === '購物') catColor = 'bg-pink-50';
    return (
        <div className={`relative overflow-hidden rounded-xl bg-white shadow-sm border border-gray-100 group ${catColor} p-2`}>
            <button className="absolute right-1 top-1 text-gray-300 hover:text-red-500" onClick={() => onDelete(ex.id)}><Icon name="x" size={14} /></button>
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1"><div className="cat-tag static w-auto h-auto bg-transparent text-gray-400 p-0"><Icon name="bookmark" size={12} fill="currentColor" /></div><span className="text-[13px] font-bold text-gray-500">{ex.category}</span></div>
                <div className="text-sm font-bold text-dark truncate">{ex.item}</div>
                <div className="flex justify-between items-end mt-1"><div className="text-[12px] text-gray-400">{MEMBERS.find(m => m.id === ex.payer)?.name} 付 • {ex.type === 'public' ? '公' : '私'}</div><div className="text-right leading-tight"><div className="font-bold text-dark text-xs">{CURRENCY_SYMBOLS[ex.inputCurrency] || ''}{ex.cost}</div>{ex.inputCurrency !== TRIP_DEFAULT_CURRENCY && <div className="text-[12px] text-gray-400">{ex.inputCurrency}</div>}</div></div>
            </div>
        </div>
    );
};

/* --- MainApp --- */
const MainApp = ({ user, setUser }) => {
    const [selectedItem, setSelectedItem] = useState(null);
    const [selectedType, setSelectedType] = useState(null);
    const [activeDay, setActiveDay] = useState(ITINERARY[0]?.id);
    const [identityOpen, setIdentityOpen] = useState(false);
    const [filter, setFilter] = useState("全部");
    const [isGuideExpanded, setIsGuideExpanded] = useState(false);
    const [expandedDay, setExpandedDay] = useState(null);

    const toggleDay = (id) => setExpandedDay(expandedDay === id ? null : id);

    const scrollTo = (id) => {
        const el = document.getElementById(id);
        if (el) {
            window.scrollTo({ top: el.offsetTop - 220, behavior: 'smooth' });
            setActiveDay(id);
        }
        if (id.startsWith('d')) setExpandedDay(id);
    };

    const categories = ["全部", ...Array.from(new Set(GUIDE_ITEMS.map(i => i.category)))];
    const filteredGuide = filter === "全部" ? GUIDE_ITEMS : GUIDE_ITEMS.filter(i => i.category === filter);
    const displayedGuide = isGuideExpanded ? filteredGuide : filteredGuide.slice(0, 9);
    const openDetail = (item, type) => { setSelectedItem(item); setSelectedType(type); };

    const [adminNote, setAdminNote] = useState(localStorage.getItem(`${TRIP_ID}_admin_note`) || "歡迎大家！");
    const [personalNote, setPersonalNote] = useState(localStorage.getItem(`${TRIP_ID}_note_${user.id}`) || "");
    const [saveStatus, setSaveStatus] = useState("已同步");
    const savePersonalNote = (val) => { localStorage.setItem(`${TRIP_ID}_note_${user.id}`, val); setSaveStatus("儲存成功！"); setTimeout(() => setSaveStatus("已同步"), 2000); };
    const saveAdmin = (val) => { localStorage.setItem(`${TRIP_ID}_admin_note`, val); };
    const [isNoteEditing, setIsNoteEditing] = useState(false);

    const handleSwitchUser = (newUser) => {
        setUser(newUser);
        localStorage.setItem(`${TRIP_ID}_user`, JSON.stringify(newUser));
    };

    return (
        <div className="min-h-screen bg-bg relative animate-fade-in pl-0 pb-24">
            <AvatarButton user={user} onClick={() => setIdentityOpen(true)} />
            {identityOpen && <IdentitySheet user={user} onSelect={handleSwitchUser} onClose={() => setIdentityOpen(false)} />}
            <HeroHeader />

            <LiveInfoBar />

            <FloatingTopNav activeDay={activeDay} scrollTo={scrollTo} />

            <div id="timeline" className="px-4 pb-12 space-y-4 relative mt-4 pl-20">
                <div className="timeline-line"></div>
                {ITINERARY.map((day, index) => (
                    <div key={index} id={day.id} className="scroll-mt-48 relative">
                        <div className="timeline-circle" onClick={() => toggleDay(day.id)}><span>{day.date}</span></div>
                        <div className="itinerary-header" onClick={() => toggleDay(day.id)}><div><h2 className="text-lg font-bold text-dark font-serif">{day.theme}</h2><p className="text-xs text-gray-400">{day.highlights}</p></div><Icon name={expandedDay === day.id ? "chevron-up" : "chevron-down"} size={16} className="text-gray-400" /></div>
                        {expandedDay === day.id && (
                            <div className="space-y-3 pl-4 animate-slide-up pb-4">
                                {day.details.length === 0 && <div className="text-xs text-gray-400 py-2">行程待規劃，敬請期待</div>}
                                {day.details.map((item, i) => (
                                    <div key={i} onClick={() => openDetail(item, 'event')} className="event-card">
                                        <div className="flex gap-4 items-center">
                                            <div className="flex flex-col items-center min-w-[45px] text-sm font-bold text-primary bg-primary/10 px-2 py-1 rounded-lg z-10">{item.time}</div>
                                            <div className="flex-1 border-l-2 border-gray-100 pl-4 py-1"><div className="font-bold text-dark text-base mb-0.5 truncate">{item.title}</div><div className="text-xs text-gray-400 line-clamp-1">{item.desc}</div></div>
                                            <div className="text-gray-300"><Icon name="chevron-right" size={16} /></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div id="guide" className="px-4 pb-12 pt-8 bg-white/50 rounded-t-[2.5rem]">
                <h2 className="font-serif text-2xl text-dark mb-6 px-2 flex items-center gap-2"><Icon name="compass" className="text-accent" /> 旅遊指南</h2>
                {GUIDE_ITEMS.length === 0 ? (
                    <div className="text-center text-sm text-gray-400 py-8">景點/美食資料尚未整理，敬請期待</div>
                ) : (
                    <>
                        <div className="flex justify-center gap-2 overflow-x-auto no-scrollbar mb-4">{categories.map(c => (<button key={c} onClick={() => setFilter(c)} className={`pill-btn ${filter === c ? 'active' : ''}`}>{c}</button>))}</div>
                        <div className="grid grid-cols-3 gap-3">
                            {displayedGuide.map((item) => (
                                <div key={item.id} className="bg-white rounded-xl overflow-hidden shadow-soft btn-press cursor-pointer relative group aspect-square hover:shadow-lg transition-shadow" onClick={() => openDetail(item, 'guide')}><div className="relative h-full"><img src={item.cover || item.img} className="w-full h-full object-cover" /><div className="absolute top-1 right-1 bg-white/90 backdrop-blur px-1.5 py-0.5 rounded text-[12px] font-bold text-dark shadow-sm z-10">{item.tag || item.type}</div></div></div>
                            ))}
                        </div>
                        {!isGuideExpanded && filteredGuide.length > 9 && <button onClick={() => setIsGuideExpanded(true)} className="w-full mt-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-400 text-xs font-bold flex items-center justify-center gap-1 hover:bg-gray-50">查看更多 <Icon name="chevron-down" size={14} /></button>}
                        {isGuideExpanded && <button onClick={() => setIsGuideExpanded(false)} className="w-full mt-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-400 text-xs font-bold flex items-center justify-center gap-1 hover:bg-gray-50">收起 <Icon name="chevron-up" size={14} /></button>}
                    </>
                )}
            </div>

            <ExpenseModule user={user} />
            <VoteModule user={user} />

            <div id="tools" className="px-4 pb-12 pt-8 bg-white/50 rounded-t-[2.5rem]">
                <h2 className="font-serif text-3xl text-dark mb-6 px-2 flex items-center gap-2"><Icon name="wrench" className="text-accent" size={28} /> 實用工具</h2>
                <div className="grid grid-cols-2 gap-4">
                    <div id="board" className="bg-[#F2E6E1] p-4 rounded-3xl shadow-sm flex flex-col aspect-square"><div className="flex justify-between items-center mb-1"><h3 className="font-bold text-accent text-lg flex items-center gap-1"><Icon name="megaphone" size={24} /> 公告</h3><button onClick={() => setIsNoteEditing(!isNoteEditing)} className="text-[13px] bg-white px-2 py-1 rounded text-accent font-bold">Edit</button></div><div className="text-sm text-dark leading-relaxed overflow-y-auto flex-1 font-medium p-1">{isNoteEditing ? <textarea value={adminNote} onChange={e => { setAdminNote(e.target.value); saveAdmin(e.target.value); }} className="w-full h-full bg-white/50 p-1 rounded" /> : adminNote}</div></div>
                    <div id="memo" className="bg-[#EAEAEA] p-4 rounded-3xl shadow-sm flex flex-col aspect-square"><h3 className="font-bold text-dark mb-1 text-lg flex items-center gap-1"><Icon name="edit-3" className="text-gray-500" size={24} /> 筆記</h3><textarea value={personalNote} onChange={e => { setPersonalNote(e.target.value); savePersonalNote(e.target.value); }} className="flex-1 bg-white p-2 rounded-xl text-sm outline-none resize-none mb-1" placeholder="寫點什麼..."></textarea></div>
                    <div className="bg-white p-4 rounded-3xl shadow-sm col-span-2 aspect-auto border border-gray-100"><h3 className="font-bold text-dark text-lg mb-2">旅伴守則</h3><ul className="space-y-1 text-sm text-gray-500 font-medium"><li>1. 嘈交罰錢 $500</li><li>2. 拒絕求其</li><li>3. 離隊報備</li><li>4. 情緒價值</li></ul>
                        <div className="grid grid-cols-2 gap-2 mt-4">{TRIP_EMERGENCY.map((e, i) => (<a key={i} href={`tel:${e.phone}`} className={`rounded-xl p-2 flex items-center justify-center border gap-1 text-sm font-bold ${i === 0 ? 'bg-red-50 text-red-500 border-red-100' : 'bg-gray-50 text-gray-500 border-gray-100'}`}><Icon name={i === 0 ? 'phone' : 'ambulance'} size={14} /> {e.label} {e.phone}</a>))}</div>
                    </div>
                </div>
            </div>

            <div id="memory" className="px-4 pb-32 pt-8 text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 text-primary animate-bounce mx-auto"><Icon name="image" size={24} /></div>
                <h2 className="text-lg font-bold text-dark mb-2">這次的回憶</h2>
                <button onClick={() => window.open(PHOTOS_URL, '_blank')} className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold btn-press shadow-lg shadow-primary/30 flex items-center gap-2 text-xs mx-auto mb-6"><Icon name="external-link" size={14} /> 上傳這次的照片/影片</button>
                <MemoryNotes user={user} />
            </div>

            {selectedItem && <UniversalDetailSheet item={selectedItem} type={selectedType} onClose={() => setSelectedItem(null)} />}
            <BottomNav scrollTo={scrollTo} />
        </div>
    );
};

const App = () => {
    const [user, setUser] = useState(null);
    const [booted, setBooted] = useState(false);

    useEffect(() => {
        const loader = document.getElementById('loading');
        if (loader) loader.style.display = 'none';
        const saved = localStorage.getItem(`${TRIP_ID}_user`);
        if (saved) setUser(JSON.parse(saved));
        setBooted(true);
    }, []);

    const handleSelect = (m) => {
        localStorage.setItem(`${TRIP_ID}_user`, JSON.stringify(m));
        setUser(m);
    };

    if (!booted) return null;
    if (!user) return <WelcomeView onSelect={handleSelect} />;
    return <MainApp user={user} setUser={setUser} />;
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
