import './App.css';
import React, { useEffect, useMemo, useState } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import {
  getFirestore,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc
} from 'firebase/firestore';
import {
  CheckCircle2,
  ChevronDown,
  Coffee,
  Copy,
  Plus,
  Search,
  Share2,
  Trash2,
  User,
  Users,
  Wifi,
  WifiOff,
  Zap
} from 'lucide-react';

const firebaseConfig = (() => {
  try {
    if (import.meta.env.VITE_FIREBASE_CONFIG) {
      return JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG);
    }
  } catch (error) {
    console.error('VITE_FIREBASE_CONFIG JSON parsing failed:', error);
  }

  return {
    apiKey: 'YOUR_API_KEY',
    authDomain: 'YOUR_PROJECT.firebaseapp.com',
    projectId: 'YOUR_PROJECT',
    storageBucket: 'YOUR_PROJECT.appspot.com',
    messagingSenderId: 'YOUR_ID',
    appId: 'YOUR_APP_ID'
  };
})();

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const appId = 'mega-coffee-team-order-system';
const dataRoot = ['artifacts', appId, 'public', 'data'];

const BASE_MENU_DATA = [
  { id: 1, name: '아메리카노(ICE)', price: 2000, category: '커피', source: 'base' },
  { id: 2, name: '아메리카노(HOT)', price: 1500, category: '커피', source: 'base' },
  { id: 3, name: '메가리카노(ICE/32oz)', price: 3000, category: '커피', source: 'base' },
  { id: 4, name: '카페라떼(ICE)', price: 2900, category: '커피', source: 'base' },
  { id: 19, name: '카페라떼(HOT)', price: 2900, category: '커피', source: 'base' },
  { id: 5, name: '바닐라라떼(ICE)', price: 3400, category: '커피', source: 'base' },
  { id: 20, name: '바닐라라떼(HOT)', price: 3400, category: '커피', source: 'base' },
  { id: 6, name: '헤이즐넛라떼(ICE)', price: 3400, category: '커피', source: 'base' },
  { id: 21, name: '헤이즐넛라떼(HOT)', price: 3400, category: '커피', source: 'base' },
  { id: 17, name: '카라멜마끼아또(ICE)', price: 3700, category: '커피', source: 'base' },
  { id: 18, name: '카라멜마끼아또(HOT)', price: 3700, category: '커피', source: 'base' },
  { id: 7, name: '큐브라떼(ICE)', price: 4200, category: '커피', source: 'base' },
  { id: 8, name: '할메가커피(ICE)', price: 2100, category: '커피', source: 'base' },
  { id: 9, name: '딸기라떼(ICE)', price: 3700, category: '라떼/티', source: 'base' },
  { id: 10, name: '초코라떼(ICE)', price: 3500, category: '라떼/티', source: 'base' },
  { id: 22, name: '초코라떼(HOT)', price: 3500, category: '라떼/티', source: 'base' },
  { id: 16, name: '허니자몽블랙티(ICE)', price: 3700, category: '라떼/티', source: 'base' },
  { id: 23, name: '허니자몽블랙티(HOT)', price: 3700, category: '라떼/티', source: 'base' },
  { id: 11, name: '메가에이드(ICE)', price: 3900, category: '에이드/주스', source: 'base' },
  { id: 12, name: '청포도에이드(ICE)', price: 3500, category: '에이드/주스', source: 'base' },
  { id: 13, name: '퐁크러쉬(플레인)', price: 3900, category: '스무디/프라페', source: 'base' },
  { id: 14, name: '쿠키프라페', price: 3900, category: '스무디/프라페', source: 'base' },
  { id: 15, name: '민트프라페', price: 3900, category: '스무디/프라페', source: 'base' },
  { id: 24, name: '애플 머스캣 요거트 스무디', price: 3900, category: '스무디/프라페', source: 'base' }
];

const USER_LIST = ['최승용', '조석희', '황승순', '최진영', '김희수', '박범준'];
const CATEGORIES = ['전체', '커피', '라떼/티', '에이드/주스', '스무디/프라페', '기타'];

function safeDocId(value) {
  return encodeURIComponent(String(value || '').trim())
    .replace(/\./g, '%2E')
    .replace(/\//g, '%2F');
}

function formatWon(value) {
  return `${Number(value || 0).toLocaleString()}원`;
}

function makeLocalOrder(userName, menuId) {
  return {
    id: safeDocId(userName || 'local'),
    userName,
    menuId: menuId ? String(menuId) : '',
    qty: menuId ? 1 : 0,
    updatedAt: Date.now(),
    localOnly: true
  };
}

export default function App() {
  const [authUser, setAuthUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState('연결 준비 중');

  const [userName, setUserName] = useState(localStorage.getItem('mgc_user_name') || '');
  const [isEditingName, setIsEditingName] = useState(!localStorage.getItem('mgc_user_name'));

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('전체');

  const [selectedMenuId, setSelectedMenuId] = useState(localStorage.getItem('mgc_selected_menu_id') || '');

  const [remoteOrders, setRemoteOrders] = useState([]);
  const [customMenus, setCustomMenus] = useState([]);
  const [deletedMenuIds, setDeletedMenuIds] = useState([]);

  const [newMenuName, setNewMenuName] = useState('');
  const [newMenuPrice, setNewMenuPrice] = useState('');
  const [newMenuCategory, setNewMenuCategory] = useState('스무디/프라페');

  const [toast, setToast] = useState('');

  const toastMessage = (message) => {
    setToast(message);
    window.clearTimeout(window.__mgc_toast_timer);
    window.__mgc_toast_timer = window.setTimeout(() => setToast(''), 1800);
  };

  useEffect(() => {
    const init = async () => {
      try {
        await signInAnonymously(auth);
      } catch (error) {
        console.error('Anonymous auth failed:', error);
        setSyncStatus('Firebase 로그인 실패');
      }
    };

    init();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setAuthUser(currentUser);
      setAuthReady(true);
      if (currentUser) setSyncStatus('실시간 동기화 중');
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!authReady) return;

    const unsubOrders = onSnapshot(
      collection(db, ...dataRoot, 'userOrders'),
      (snapshot) => {
        const next = [];
        snapshot.forEach((snap) => {
          const data = snap.data();
          if (!data || !data.userName) return;
          next.push({
            id: snap.id,
            userName: data.userName,
            menuId: data.menuId ? String(data.menuId) : '',
            qty: Number(data.qty || 0),
            updatedAt: Number(data.updatedAt || 0)
          });
        });
        next.sort((a, b) => (a.updatedAt || 0) - (b.updatedAt || 0));
        setRemoteOrders(next);
        setSyncStatus('실시간 동기화 중');
      },
      (error) => {
        console.error('Order snapshot failed:', error);
        setSyncStatus('주문 동기화 오류');
      }
    );

    const unsubCustomMenus = onSnapshot(
      collection(db, ...dataRoot, 'customMenus'),
      (snapshot) => {
        const next = [];
        snapshot.forEach((snap) => {
          const data = snap.data();
          if (!data || !data.name || !data.price) return;
          next.push({
            id: snap.id,
            name: data.name,
            price: Number(data.price || 0),
            category: data.category || '기타',
            source: 'custom',
            updatedAt: Number(data.updatedAt || 0)
          });
        });
        next.sort((a, b) => (a.updatedAt || 0) - (b.updatedAt || 0));
        setCustomMenus(next);
      },
      (error) => {
        console.error('Custom menu snapshot failed:', error);
      }
    );

    const unsubDeletedMenus = onSnapshot(
      collection(db, ...dataRoot, 'deletedMenus'),
      (snapshot) => {
        const ids = [];
        snapshot.forEach((snap) => ids.push(String(snap.id)));
        setDeletedMenuIds(ids);
      },
      (error) => {
        console.error('Deleted menu snapshot failed:', error);
      }
    );

    return () => {
      unsubOrders();
      unsubCustomMenus();
      unsubDeletedMenus();
    };
  }, [authReady]);

  const allMenus = useMemo(() => {
    const deletedSet = new Set(deletedMenuIds.map(String));
    return [...BASE_MENU_DATA, ...customMenus]
      .filter((menu) => !deletedSet.has(String(menu.id)))
      .sort((a, b) => {
        const aBase = a.source === 'base' ? 0 : 1;
        const bBase = b.source === 'base' ? 0 : 1;
        if (aBase !== bBase) return aBase - bBase;
        return Number(a.id) > Number(b.id) ? 1 : -1;
      });
  }, [customMenus, deletedMenuIds]);

  const menuById = useMemo(() => {
    const map = new Map();
    allMenus.forEach((menu) => map.set(String(menu.id), menu));
    return map;
  }, [allMenus]);

  const liveOrders = useMemo(() => {
    const byName = new Map();

    remoteOrders.forEach((order) => {
      if (!order.userName || !order.menuId || !menuById.has(String(order.menuId))) return;
      byName.set(order.userName, { ...order, localOnly: false });
    });

    if (userName && selectedMenuId && menuById.has(String(selectedMenuId))) {
      const remoteForMe = byName.get(userName);
      const remoteIsSame = remoteForMe && String(remoteForMe.menuId) === String(selectedMenuId);
      if (!remoteIsSame) {
        byName.set(userName, makeLocalOrder(userName, selectedMenuId));
      }
    }

    return Array.from(byName.values()).sort((a, b) => {
      if (a.localOnly && !b.localOnly) return 1;
      if (!a.localOnly && b.localOnly) return -1;
      return (a.updatedAt || 0) - (b.updatedAt || 0);
    });
  }, [remoteOrders, userName, selectedMenuId, menuById]);

  const aggregatedData = useMemo(() => {
    const byMenu = new Map();
    let totalCount = 0;
    let totalPrice = 0;

    liveOrders.forEach((order) => {
      const menu = menuById.get(String(order.menuId));
      if (!menu) return;

      const qty = Number(order.qty || 1);
      if (!byMenu.has(String(menu.id))) {
        byMenu.set(String(menu.id), {
          menu,
          total: 0,
          customers: [],
          subtotal: 0
        });
      }

      const row = byMenu.get(String(menu.id));
      row.total += qty;
      row.subtotal += menu.price * qty;
      row.customers.push({
        name: order.userName,
        qty,
        localOnly: Boolean(order.localOnly)
      });

      totalCount += qty;
      totalPrice += menu.price * qty;
    });

    return {
      byMenu: Array.from(byMenu.values()),
      totalPeople: liveOrders.length,
      totalCount,
      totalPrice
    };
  }, [liveOrders, menuById]);

  useEffect(() => {
    if (!userName || !selectedMenuId || !authReady || !authUser) return;
    syncMyOrder(selectedMenuId, userName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, authUser, userName]);

  const syncMyOrder = async (menuId, name = userName) => {
    const trimmedName = String(name || '').trim();
    if (!trimmedName) return;

    localStorage.setItem('mgc_user_name', trimmedName);

    if (menuId) {
      localStorage.setItem('mgc_selected_menu_id', String(menuId));
    } else {
      localStorage.removeItem('mgc_selected_menu_id');
    }

    if (!authUser) {
      setSyncStatus('로그인 대기 중');
      return;
    }

    const orderId = safeDocId(trimmedName);
    const orderRef = doc(db, ...dataRoot, 'userOrders', orderId);

    try {
      if (!menuId) {
        await deleteDoc(orderRef);
      } else {
        await setDoc(orderRef, {
          userName: trimmedName,
          menuId: String(menuId),
          qty: 1,
          updatedAt: Date.now()
        }, { merge: true });
      }
      setSyncStatus('실시간 동기화 중');
    } catch (error) {
      console.error('Order sync failed:', error);
      setSyncStatus('주문 저장 오류');
      toastMessage('주문 저장 권한 또는 Firebase 설정을 확인해주세요.');
    }
  };

  const handleNameSelect = async (event) => {
    const name = event.target.value;
    if (!name) return;

    setUserName(name);
    setIsEditingName(false);
    localStorage.setItem('mgc_user_name', name);

    if (selectedMenuId) {
      await syncMyOrder(selectedMenuId, name);
    }

    toastMessage(`${name}님으로 설정되었습니다.`);
  };

  const handleSelect = async (menuId) => {
    if (!userName) {
      setIsEditingName(true);
      toastMessage('먼저 이름을 선택해주세요.');
      return;
    }

    setSelectedMenuId(String(menuId));
    await syncMyOrder(String(menuId), userName);
    toastMessage('주문이 반영되었습니다.');
  };

  const handleCancel = async (event) => {
    if (event) event.stopPropagation();
    setSelectedMenuId('');
    await syncMyOrder('', userName);
    toastMessage('주문이 취소되었습니다.');
  };

  const filteredMenu = useMemo(() => {
    return allMenus.filter((item) => {
      const matchKeyword = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategory = selectedCategory === '전체' || item.category === selectedCategory;
      return matchKeyword && matchCategory;
    });
  }, [allMenus, searchTerm, selectedCategory]);

  const copyToClipboard = async () => {
    if (aggregatedData.totalCount === 0) {
      toastMessage('복사할 주문이 없습니다.');
      return;
    }

    const lines = aggregatedData.byMenu.map(({ menu, total, customers, subtotal }) => {
      const names = customers.map((customer) => customer.name).join(', ');
      return `${menu.name} x${total} (${names}) - ${formatWon(subtotal)}`;
    });

    const text = [
      '[메가커피 주문 리스트]',
      '',
      ...lines,
      '',
      `주문자: ${aggregatedData.totalPeople}명`,
      `합계: ${aggregatedData.totalCount}잔 / ${formatWon(aggregatedData.totalPrice)}`
    ].join('\n');

    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }

    toastMessage('주문 현황이 복사되었습니다.');
  };

  const handleAddMenu = async (event) => {
    event.preventDefault();

    const name = newMenuName.trim();
    const price = Number(String(newMenuPrice).replace(/[^0-9]/g, ''));

    if (!name || !price) {
      toastMessage('메뉴명과 가격을 입력해주세요.');
      return;
    }

    const id = `custom-${Date.now()}`;
    const menuRef = doc(db, ...dataRoot, 'customMenus', id);

    try {
      await setDoc(menuRef, {
        name,
        price,
        category: newMenuCategory,
        updatedAt: Date.now()
      });
      setNewMenuName('');
      setNewMenuPrice('');
      setNewMenuCategory('스무디/프라페');
      toastMessage('메뉴가 추가되었습니다.');
    } catch (error) {
      console.error('Add menu failed:', error);
      setCustomMenus((prev) => [
        ...prev,
        { id, name, price, category: newMenuCategory, source: 'custom', updatedAt: Date.now() }
      ]);
      toastMessage('화면에는 추가되었습니다. Firebase 권한을 확인해주세요.');
    }
  };

  const handleDeleteMenu = async (menu) => {
    const menuId = String(menu.id);

    if (String(selectedMenuId) === menuId) {
      setSelectedMenuId('');
      await syncMyOrder('', userName);
    }

    try {
      if (menu.source === 'custom') {
        await deleteDoc(doc(db, ...dataRoot, 'customMenus', menuId));
      } else {
        await setDoc(doc(db, ...dataRoot, 'deletedMenus', menuId), {
          deletedAt: Date.now(),
          menuName: menu.name
        });
      }

      const affectedOrders = remoteOrders.filter((order) => String(order.menuId) === menuId);
      await Promise.all(
        affectedOrders.map((order) => deleteDoc(doc(db, ...dataRoot, 'userOrders', safeDocId(order.userName))))
      );

      toastMessage('메뉴가 삭제되었습니다.');
    } catch (error) {
      console.error('Delete menu failed:', error);
      toastMessage('메뉴 삭제 권한 또는 Firebase 설정을 확인해주세요.');
    }
  };

  return (
    <div className="app-shell">
      <header className="hero">
        <div className="hero-inner">
          <div className="title-row">
            <h1><Zap className="bolt" size={31} /> MGC LIVE</h1>
            <button className="round-button" onClick={() => toastMessage('같은 주소를 공유하면 함께 주문할 수 있습니다.')}>
              <Share2 size={22} />
            </button>
          </div>

          <div className="member-box">
            <div className="member-icon"><User size={25} /></div>
            {isEditingName ? (
              <div className="select-wrap">
                <select value={userName} onChange={handleNameSelect}>
                  <option value="" disabled>이름을 선택하세요</option>
                  {USER_LIST.map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
                <ChevronDown size={18} />
              </div>
            ) : (
              <div className="member-static">
                <span className="member-label">MEMBER</span>
                <strong>{userName}</strong>
                <button onClick={() => setIsEditingName(true)}>변경</button>
              </div>
            )}
          </div>

          <div className="search-box">
            <Search size={21} />
            <input
              type="text"
              placeholder="음료 검색"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>

          <section className="summary-card">
            <div className="summary-head">
              <div>
                <h2><Users size={22} /> 실시간 주문 현황</h2>
                <p className="sync-line">
                  {syncStatus === '실시간 동기화 중' ? <Wifi size={14} /> : <WifiOff size={14} />}
                  {syncStatus}
                </p>
              </div>
              <div className="summary-badges">
                <span>{aggregatedData.totalPeople}명</span>
                <strong>{formatWon(aggregatedData.totalPrice)}</strong>
              </div>
            </div>

            <div className="summary-list">
              {aggregatedData.totalCount === 0 ? (
                <div className="empty-summary">아직 누적된 주문이 없습니다.</div>
              ) : (
                aggregatedData.byMenu.map(({ menu, total, customers, subtotal }) => (
                  <div className="summary-item" key={menu.id}>
                    <div className="summary-menu-line">
                      <strong>{menu.name}</strong>
                      <span>x{total} · {formatWon(subtotal)}</span>
                    </div>
                    <div className="customer-chips">
                      {customers.map((customer) => (
                        <span key={`${menu.id}-${customer.name}`} className={customer.localOnly ? 'local chip' : 'chip'}>
                          {customer.name}{customer.localOnly ? ' · 반영 중' : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="summary-foot">
              <strong>총 {aggregatedData.totalCount}잔 · {formatWon(aggregatedData.totalPrice)}</strong>
              <button onClick={copyToClipboard}><Copy size={18} /> 복사</button>
            </div>
          </section>
        </div>
      </header>

      <nav className="category-row no-scrollbar">
        {CATEGORIES.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={selectedCategory === category ? 'active' : ''}
          >
            {category}
          </button>
        ))}
      </nav>

      <main className="menu-list">
        {filteredMenu.map((item) => {
          const isSelected = String(selectedMenuId) === String(item.id);

          return (
            <article key={item.id} className={`menu-card ${isSelected ? 'selected' : ''}`}>
              <div className={`drink-icon ${isSelected ? 'selected' : ''}`}>
                <Coffee size={28} />
              </div>

              <div className="menu-info">
                <h3>{item.name}</h3>
                <p>{formatWon(item.price)}</p>
                {item.source === 'custom' && <span className="custom-label">추가 메뉴</span>}
              </div>

              <div className="menu-actions">
                {isSelected ? (
                  <>
                    <div className="selected-pill"><CheckCircle2 size={14} /> 선택됨</div>
                    <button className="cancel-button" onClick={handleCancel}>취소</button>
                  </>
                ) : (
                  <button className="select-button" onClick={() => handleSelect(item.id)}>선택</button>
                )}
                <button className="delete-button" onClick={() => handleDeleteMenu(item)} title="메뉴 삭제">
                  <Trash2 size={15} /> 삭제
                </button>
              </div>
            </article>
          );
        })}
      </main>

      <section className="add-menu-section">
        <h2><Plus size={20} /> 메뉴 직접 추가</h2>
        <form onSubmit={handleAddMenu}>
          <input
            type="text"
            value={newMenuName}
            onChange={(event) => setNewMenuName(event.target.value)}
            placeholder="메뉴명"
          />
          <input
            type="text"
            inputMode="numeric"
            value={newMenuPrice}
            onChange={(event) => setNewMenuPrice(event.target.value)}
            placeholder="가격"
          />
          <select value={newMenuCategory} onChange={(event) => setNewMenuCategory(event.target.value)}>
            {CATEGORIES.filter((category) => category !== '전체').map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          <button type="submit">메뉴 추가</button>
        </form>
      </section>

      {toast && (
        <div className="toast">
          <CheckCircle2 size={18} />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
