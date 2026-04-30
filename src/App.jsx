import React, { useEffect, useMemo, useState } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { collection, doc, getFirestore, onSnapshot, setDoc } from 'firebase/firestore';
import { CheckCircle2, ChevronDown, Coffee, Copy, Search, Share2, User, Users, Zap } from 'lucide-react';

const fallbackFirebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT.firebaseapp.com',
  projectId: 'YOUR_PROJECT',
  storageBucket: 'YOUR_PROJECT.appspot.com',
  messagingSenderId: 'YOUR_ID',
  appId: 'YOUR_APP_ID'
};

const parseFirebaseConfig = () => {
  const rawConfig = import.meta.env.VITE_FIREBASE_CONFIG;
  if (!rawConfig) return fallbackFirebaseConfig;

  try {
    return JSON.parse(rawConfig);
  } catch (error) {
    console.error('VITE_FIREBASE_CONFIG JSON 파싱 오류:', error);
    return fallbackFirebaseConfig;
  }
};

const firebaseConfig = parseFirebaseConfig();
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'mega-coffee-team-order-system';

const MENU_DATA = [
  { id: 1, name: '아메리카노(ICE)', price: 2000, category: '커피' },
  { id: 2, name: '아메리카노(HOT)', price: 1500, category: '커피' },
  { id: 3, name: '메가리카노(ICE/32oz)', price: 3000, category: '커피' },
  { id: 4, name: '카페라떼(ICE)', price: 2900, category: '커피' },
  { id: 19, name: '카페라떼(HOT)', price: 2900, category: '커피' },
  { id: 5, name: '바닐라라떼(ICE)', price: 3400, category: '커피' },
  { id: 20, name: '바닐라라떼(HOT)', price: 3400, category: '커피' },
  { id: 6, name: '헤이즐넛라떼(ICE)', price: 3400, category: '커피' },
  { id: 21, name: '헤이즐넛라떼(HOT)', price: 3400, category: '커피' },
  { id: 17, name: '카라멜마끼아또(ICE)', price: 3700, category: '커피' },
  { id: 18, name: '카라멜마끼아또(HOT)', price: 3700, category: '커피' },
  { id: 7, name: '큐브라떼(ICE)', price: 4200, category: '커피' },
  { id: 8, name: '할메가커피(ICE)', price: 2100, category: '커피' },
  { id: 9, name: '딸기라떼(ICE)', price: 3700, category: '라떼/티' },
  { id: 10, name: '초코라떼(ICE)', price: 3500, category: '라떼/티' },
  { id: 22, name: '초코라떼(HOT)', price: 3500, category: '라떼/티' },
  { id: 16, name: '허니자몽블랙티(ICE)', price: 3700, category: '라떼/티' },
  { id: 23, name: '허니자몽블랙티(HOT)', price: 3700, category: '라떼/티' },
  { id: 11, name: '메가에이드(ICE)', price: 3900, category: '에이드/주스' },
  { id: 12, name: '청포도에이드(ICE)', price: 3500, category: '에이드/주스' },
  { id: 13, name: '퐁크러쉬(플레인)', price: 3900, category: '스무디/프라페' },
  { id: 14, name: '쿠키프라페', price: 3900, category: '스무디/프라페' },
  { id: 15, name: '민트프라페', price: 3900, category: '스무디/프라페' }
];

const USER_LIST = ['최승용', '조석희', '황승순', '최진영', '김희수', '박범준'];
const CATEGORIES = ['전체', '커피', '라떼/티', '에이드/주스', '스무디/프라페'];

export default function App() {
  const [user, setUser] = useState(null);
  const [userName, setUserName] = useState(localStorage.getItem('mgc_user_name') || '');
  const [isEditingName, setIsEditingName] = useState(!userName);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [allOrders, setAllOrders] = useState([]);
  const [selectedMenuId, setSelectedMenuId] = useState(null);
  const [showToast, setShowToast] = useState('');
  const [optimisticOrder, setOptimisticOrder] = useState(null);

  const [localClientId] = useState(() => {
    const savedId = localStorage.getItem('mgc_local_client_id');
    if (savedId) return savedId;
    const newId = "local-" + Date.now() + "-" + Math.random().toString(36).slice(2);
    localStorage.setItem('mgc_local_client_id', newId);
    return newId;
  });

  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (error) {
        console.error('익명 로그인 오류:', error);
      }
    };

    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return undefined;

    const ordersCol = collection(db, 'artifacts', appId, 'public', 'data', 'userOrders');
    const unsubscribe = onSnapshot(ordersCol, (snapshot) => {
      const orders = [];
      snapshot.forEach((orderDoc) => orders.push({ uid: orderDoc.id, ...orderDoc.data() }));
      setAllOrders(orders);

      const myOrder = orders.find((order) => order.uid === user.uid);
      if (myOrder?.choices && Object.keys(myOrder.choices).length > 0) {
        const firstId = Object.keys(myOrder.choices)[0];
        setSelectedMenuId(firstId ? Number(firstId) : null);
      }
    });

    return () => unsubscribe();
  }, [user]);

  const triggerToast = (message) => {
    setShowToast(message);
    window.setTimeout(() => setShowToast(''), 2000);
  };

  const syncMyOrder = async (menuId, overrideName = null) => {
    const nameToUse = overrideName || userName;
    if (!nameToUse) return;

    const uid = user?.uid || localClientId;
    const choices = menuId ? { [String(menuId)]: 1 } : {};
    const nextOrder = { uid, userName: nameToUse, choices, updatedAt: Date.now() };

    // Firestore 응답을 기다리지 않고 화면 상단 주문 현황을 즉시 갱신합니다.
    setOptimisticOrder(nextOrder);

    if (!user) return;

    try {
      const myDoc = doc(db, 'artifacts', appId, 'public', 'data', 'userOrders', user.uid);
      await setDoc(myDoc, { userName: nameToUse, choices, updatedAt: Date.now() }, { merge: true });
    } catch (error) {
      console.error('주문 저장 오류:', error);
      triggerToast('화면에는 반영되었습니다. 저장 설정을 확인해주세요.');
    }
  };

  useEffect(() => {
    if (!user || !userName || selectedMenuId === null) return;
    const hasRemoteMyOrder = allOrders.some((order) => order.uid === user.uid && Object.keys(order.choices || {}).length > 0);
    if (!hasRemoteMyOrder) syncMyOrder(selectedMenuId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const handleNameSelect = (event) => {
    const name = event.target.value;
    if (!name) return;

    setUserName(name);
    localStorage.setItem('mgc_user_name', name);
    setIsEditingName(false);
    if (user) syncMyOrder(selectedMenuId, name);
    triggerToast(`${name}님, 환영합니다!`);
  };

  const handleSelect = (id) => {
    if (!userName) {
      triggerToast('이름을 선택해주세요!');
      setIsEditingName(true);
      return;
    }

    setSelectedMenuId(id);
    syncMyOrder(id);
    triggerToast('선택 완료!');
  };

  const handleCancel = (event) => {
    if (event) event.stopPropagation();
    setSelectedMenuId(null);
    syncMyOrder(null);
    triggerToast('취소되었습니다.');
  };

  const displayOrders = useMemo(() => {
    if (!optimisticOrder) return allOrders;
    const optimisticUidSet = new Set([optimisticOrder.uid]);
    if (user?.uid) optimisticUidSet.add(user.uid);
    return [
      ...allOrders.filter((order) => !optimisticUidSet.has(order.uid)),
      optimisticOrder
    ];
  }, [allOrders, optimisticOrder, user?.uid]);

  const aggregatedData = useMemo(() => {
    const menuInfo = {};
    let totalCount = 0;
    let totalPrice = 0;

    displayOrders.forEach((order) => {
      Object.entries(order.choices || {}).forEach(([menuId, quantity]) => {
        const item = MENU_DATA.find((menu) => menu.id === Number(menuId));
        if (item && quantity > 0) {
          if (!menuInfo[menuId]) menuInfo[menuId] = { total: 0, customers: [] };
          menuInfo[menuId].total += quantity;
          menuInfo[menuId].customers.push({ name: order.userName, quantity });
          totalCount += quantity;
          totalPrice += item.price * quantity;
        }
      });
    });

    return { menuInfo, totalCount, totalPrice };
  }, [displayOrders]);

  const orderEntries = useMemo(() => {
    return Object.entries(aggregatedData.menuInfo)
      .map(([id, info]) => {
        const item = MENU_DATA.find((menu) => menu.id === Number(id));
        return {
          id,
          item,
          total: info.total,
          customers: info.customers,
          subtotal: item ? item.price * info.total : 0
        };
      })
      .filter((entry) => entry.item)
      .sort((a, b) => a.item.name.localeCompare(b.item.name, 'ko'));
  }, [aggregatedData.menuInfo]);

  const filteredMenu = useMemo(() => {
    return MENU_DATA.filter((item) => {
      return (
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (selectedCategory === '전체' || item.category === selectedCategory)
      );
    });
  }, [searchTerm, selectedCategory]);

  const copyToClipboard = async () => {
    if (aggregatedData.totalCount === 0) return;

    const summary = orderEntries
      .map((entry) => {
        const names = entry.customers.map((customer) => customer.name).join(', ');
        return `${entry.item.name} x${entry.total} (${names}) - ${entry.subtotal.toLocaleString()}원`;
      })
      .join('\n');

    const text = `[메가커피 주문 리스트]\n\n${summary}\n\n합계: ${aggregatedData.totalCount}잔 / ${aggregatedData.totalPrice.toLocaleString()}원`;

    try {
      await navigator.clipboard.writeText(text);
      triggerToast('복사 완료!');
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      triggerToast('복사 완료!');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center pb-40 font-sans tracking-tight">
      <header className="w-full bg-[#FFD500] py-5 px-4 shadow-md sticky top-0 z-40">
        <div className="max-w-md mx-auto flex flex-col gap-3">
          <div className="flex justify-between items-center text-[#1F1F1F]">
            <h1 className="text-xl font-black italic flex items-center gap-2">
              <Zap className="fill-black" size={24} /> MGC LIVE
            </h1>
            <button type="button" onClick={() => triggerToast('링크를 공유해 팀원들을 초대하세요!')} className="p-2 bg-black/10 rounded-full" aria-label="공유 안내">
              <Share2 size={18} />
            </button>
          </div>

          <div className="bg-white/50 p-2 rounded-2xl flex items-center gap-3 border border-white/40 backdrop-blur-md shadow-sm">
            <div className="bg-white p-2.5 rounded-xl shadow-sm"><User size={18} /></div>
            {isEditingName ? (
              <div className="flex-1 relative">
                <select value={userName} onChange={handleNameSelect} className="w-full bg-white border-none rounded-xl pl-4 pr-10 py-3 text-sm appearance-none focus:ring-2 focus:ring-black font-black">
                  <option value="" disabled>이름을 선택하세요</option>
                  {USER_LIST.map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
                <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            ) : (
              <div className="flex flex-1 justify-between items-center pr-2">
                <span className="font-extrabold text-sm truncate">
                  <span className="opacity-40 mr-2 font-normal text-xs uppercase">Member</span> {userName}
                </span>
                <button type="button" onClick={() => setIsEditingName(true)} className="text-[10px] bg-[#1F1F1F] text-[#FFD500] px-3 py-2 rounded-xl font-black">
                  변경
                </button>
              </div>
            )}
          </div>

          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input type="text" placeholder="음료 검색" className="w-full pl-10 pr-4 py-2.5 rounded-2xl border-none text-sm focus:ring-2 focus:ring-black bg-white/80 shadow-inner" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
          </div>

          <section className="bg-[#1F1F1F] text-white rounded-3xl p-4 shadow-xl border border-black/10" aria-label="실시간 주문 현황">
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/10">
              <div className="flex items-center gap-2 text-[#FFD500]">
                <Users size={17} />
                <h2 className="text-sm font-black tracking-tight">실시간 주문 현황</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-[#FFD500] text-black px-2.5 py-1 rounded-full font-black">{aggregatedData.totalCount}잔</span>
                <span className="text-sm font-black text-[#FFD500]">{aggregatedData.totalPrice.toLocaleString()}원</span>
              </div>
            </div>

            {aggregatedData.totalCount === 0 ? (
              <div className="py-4 text-center text-xs text-gray-400 font-bold">아직 누적된 주문이 없습니다.</div>
            ) : (
              <div className="mt-3 max-h-44 overflow-y-auto no-scrollbar space-y-2 pr-1">
                {orderEntries.map((entry) => (
                  <div key={entry.id} className="bg-white/5 border border-white/10 rounded-2xl p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-black text-white truncate">{entry.item.name}</div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {entry.customers.map((customer, index) => (
                            <span key={`${entry.id}-${customer.name}-${index}`} className="text-[10px] bg-[#FFD500]/15 text-[#FFD500] px-2 py-1 rounded-lg font-black">
                              {customer.name}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs font-black text-[#FFD500]">x{entry.total}</div>
                        <div className="text-[11px] font-bold text-gray-300 mt-1">{entry.subtotal.toLocaleString()}원</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
              <span className="text-[11px] text-gray-300 font-bold">총 {aggregatedData.totalCount}잔 · {aggregatedData.totalPrice.toLocaleString()}원</span>
              <button type="button" onClick={copyToClipboard} disabled={aggregatedData.totalCount === 0} className="bg-[#FFD500] disabled:bg-white/10 disabled:text-gray-500 text-black px-4 py-2 rounded-xl font-black text-xs flex items-center gap-1.5 active:scale-95 shadow-lg">
                <Copy size={14} /> 복사
              </button>
            </div>
          </section>
        </div>
      </header>

      <div className="w-full max-w-md px-2 py-4 flex overflow-x-auto no-scrollbar gap-2 bg-gray-50/95 backdrop-blur-md">
        {CATEGORIES.map((category) => (
          <button key={category} type="button" onClick={() => setSelectedCategory(category)} className={`px-5 py-2.5 rounded-full text-xs font-black border transition-all ${selectedCategory === category ? 'bg-[#1F1F1F] text-[#FFD500] border-[#1F1F1F] shadow-lg scale-105' : 'bg-white text-gray-400 border-gray-200'}`}>
            {category}
          </button>
        ))}
      </div>

      <main className="w-full max-w-md p-4 flex flex-col gap-4">
        {filteredMenu.map((item) => {
          const isSelected = selectedMenuId === item.id;
          return (
            <div key={item.id} className={`bg-white p-5 rounded-3xl shadow-sm border-2 transition-all flex justify-between items-center ${isSelected ? 'border-[#FFD500] bg-[#FFD500]/5 ring-4 ring-[#FFD500]/10 scale-[1.02]' : 'border-transparent hover:border-gray-200'}`}>
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${isSelected ? 'bg-[#FFD500] text-black rotate-2 shadow-lg shadow-[#FFD500]/20' : 'bg-gray-100 text-gray-400'}`}>
                  <Coffee size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-sm leading-tight">{item.name}</h3>
                  <p className="text-[11px] text-gray-400 font-black mt-1.5 tracking-wide">{item.price.toLocaleString()}원</p>
                </div>
              </div>

              <div className="flex flex-col gap-2 min-w-[90px]">
                {isSelected ? (
                  <>
                    <div className="flex items-center justify-center gap-1 py-1 px-2 bg-[#FFD500]/20 rounded-lg border border-[#FFD500]/30 animate-pulse">
                      <CheckCircle2 size={12} className="text-[#FFD500]" /><span className="text-[10px] font-black text-gray-700">선택됨</span>
                    </div>
                    <button type="button" onClick={handleCancel} className="w-full py-2 px-3 bg-red-50 text-red-500 rounded-xl text-[10px] font-black hover:bg-red-100 transition-colors">
                      취소
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={() => handleSelect(item.id)} className="w-full py-2.5 px-4 bg-[#1F1F1F] text-[#FFD500] rounded-xl text-xs font-black active:scale-95 transition-all shadow-md">
                    선택
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </main>

      {!isEditingName && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[340px] z-50 animate-in duration-500">
          <div className="bg-[#1F1F1F] text-white px-6 py-4 rounded-[28px] shadow-2xl flex items-center justify-between border border-white/10 backdrop-blur-lg">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full flex-shrink-0 ${selectedMenuId ? 'bg-[#FFD500] animate-pulse shadow-[0_0_10px_#FFD500]' : 'bg-gray-600'}`} />
              <div className="flex flex-col overflow-hidden">
                <span className="text-[9px] text-[#FFD500] font-black uppercase tracking-widest">{userName}&apos;s PICK</span>
                <span className="text-[12px] font-black truncate max-w-[150px] text-gray-100">
                  {selectedMenuId ? MENU_DATA.find((menu) => menu.id === selectedMenuId)?.name : '메뉴 선택 대기'}
                </span>
              </div>
            </div>
            {selectedMenuId ? (
              <button type="button" onClick={handleCancel} className="bg-white/10 hover:bg-red-500/20 px-3 py-2 rounded-xl text-[11px] font-black text-gray-400 transition-all border border-white/5 active:scale-90">
                주문취소
              </button>
            ) : (
              <div className="text-[10px] text-gray-500 italic">Waiting...</div>
            )}
          </div>
        </div>
      )}

      {showToast && (
        <div className="fixed top-28 left-1/2 -translate-x-1/2 z-[60] animate-in duration-300 pointer-events-none">
          <div className="bg-black/95 backdrop-blur-md text-white px-6 py-3 rounded-2xl flex items-center gap-2 shadow-2xl border border-white/10">
            <CheckCircle2 className="text-[#FFD500]" size={18} /><span className="font-bold text-sm tracking-tight">{showToast}</span>
          </div>
        </div>
      )}
    </div>
  );
}
