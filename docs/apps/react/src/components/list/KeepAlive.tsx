import { useRef, useState, useLayoutEffect } from 'react';
import { VirtList, type VirtListRef } from '@virt-list/react';
import '../../demo.css';

interface User {
  id: number;
  name: string;
  email: string;
  department: string;
  joinDate: string;
}

interface Product {
  id: number;
  name: string;
  description: string;
  price: string;
  category: string;
  stock: number;
}

function generateUsers(count: number): User[] {
  const departments = ['工程部', '设计部', '产品部', '市场部', '运营部'];
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    name: `用户_${i}`,
    email: `user${i}@example.com`,
    department: departments[i % departments.length]!,
    joinDate: new Date(2020, i % 12, (i % 28) + 1).toLocaleDateString(),
  }));
}

function generateProducts(count: number): Product[] {
  const categories = ['电子产品', '家居用品', '食品饮料', '运动户外', '图书文具'];
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    name: `商品_${i}`,
    description: `这是商品 ${i} 的描述信息`,
    price: (Math.random() * 1000).toFixed(2),
    category: categories[i % categories.length]!,
    stock: Math.floor(Math.random() * 500),
  }));
}

type Tab = 'users' | 'products';

export default function KeepAlive() {
  const userListRef = useRef<VirtListRef<User>>(null);
  const productListRef = useRef<VirtListRef<Product>>(null);
  const [users, setUsers] = useState(() => generateUsers(2000));
  const [products, setProducts] = useState(() => generateProducts(2000));
  const [activeTab, setActiveTab] = useState<Tab>('users');
  const userScrollRef = useRef(0);
  const productScrollRef = useRef(0);

  const switchTab = (tab: Tab) => {
    if (tab === activeTab) return;
    if (activeTab === 'users') {
      userScrollRef.current = userListRef.current?.getOffset() ?? 0;
    } else {
      productScrollRef.current = productListRef.current?.getOffset() ?? 0;
    }
    setActiveTab(tab);
  };

  useLayoutEffect(() => {
    if (activeTab === 'users' && userScrollRef.current > 0) {
      userListRef.current?.scrollToOffset(userScrollRef.current);
    } else if (activeTab === 'products' && productScrollRef.current > 0) {
      productListRef.current?.scrollToOffset(productScrollRef.current);
    }
  }, [activeTab]);

  return (
    <div className="demo-panel">
      <div className="demo-ka-tabs">
        <button
          type="button"
          className={`demo-ka-tab${activeTab === 'users' ? ' is-active' : ''}`}
          onClick={() => switchTab('users')}
        >
          用户列表
        </button>
        <button
          type="button"
          className={`demo-ka-tab${activeTab === 'products' ? ' is-active' : ''}`}
          onClick={() => switchTab('products')}
        >
          商品列表
        </button>
      </div>
      <div className="demo-ka-toolbar">
        {activeTab === 'users' ? (
          <>
            <button type="button" className="virt-list-btn virt-list-btn-primary" onClick={() => {
              const newUsers = generateUsers(5).map((u, i) => ({ ...u, id: users.length + i, name: `新用户_${users.length + i}` }));
              setUsers((prev) => [...prev, ...newUsers]);
            }}>添加5个用户</button>
            <button type="button" className="virt-list-btn virt-list-btn-warning" onClick={() => setUsers([])}>清空列表</button>
            <button type="button" className="virt-list-btn virt-list-btn-success" onClick={() => userListRef.current?.scrollToTop()}>回到顶部</button>
            <button type="button" className="virt-list-btn virt-list-btn-secondary" onClick={() => userListRef.current?.scrollToBottom()}>滚动到底部</button>
            <span style={{ fontSize: 12, color: '#888', marginLeft: 8 }}>总数: {users.length}</span>
          </>
        ) : (
          <>
            <button type="button" className="virt-list-btn virt-list-btn-primary" onClick={() => {
              const newProds = generateProducts(5).map((p, i) => ({ ...p, id: products.length + i, name: `新商品_${products.length + i}` }));
              setProducts((prev) => [...prev, ...newProds]);
            }}>添加5个商品</button>
            <button type="button" className="virt-list-btn virt-list-btn-warning" onClick={() => setProducts([])}>清空列表</button>
            <button type="button" className="virt-list-btn virt-list-btn-success" onClick={() => productListRef.current?.scrollToTop()}>回到顶部</button>
            <button type="button" className="virt-list-btn virt-list-btn-secondary" onClick={() => productListRef.current?.scrollToBottom()}>滚动到底部</button>
            <span style={{ fontSize: 12, color: '#888', marginLeft: 8 }}>总数: {products.length}</span>
          </>
        )}
      </div>
      <div className="demo-list-container" style={{ height: 500 }}>
        {activeTab === 'users' ? (
          <VirtList
            ref={userListRef}
            list={users}
            itemKey="id"
            itemPreSize={70}
            buffer={5}
            renderItem={(user) => (
              <div className="demo-ka-card">
                <div className="demo-ka-avatar">{user.name.charAt(0)}</div>
                <div className="demo-ka-info">
                  <div style={{ fontWeight: 'bold' }}>{user.name}</div>
                  <div style={{ fontSize: 11, color: '#888' }}>{user.email} | {user.department}</div>
                  <div style={{ fontSize: 11, color: '#aaa' }}>入职: {user.joinDate}</div>
                </div>
              </div>
            )}
          />
        ) : (
          <VirtList
            ref={productListRef}
            list={products}
            itemKey="id"
            itemPreSize={70}
            buffer={5}
            renderItem={(product) => (
              <div className="demo-ka-card">
                <div className="demo-ka-avatar" style={{ background: '#f0ad4e' }}>{product.name.charAt(0)}</div>
                <div className="demo-ka-info">
                  <div style={{ fontWeight: 'bold' }}>{product.name} <span style={{ color: '#e74c3c', fontSize: 12 }}>¥{product.price}</span></div>
                  <div style={{ fontSize: 11, color: '#888' }}>{product.category} | 库存: {product.stock}</div>
                  <div style={{ fontSize: 11, color: '#aaa' }}>{product.description}</div>
                </div>
              </div>
            )}
          />
        )}
      </div>
    </div>
  );
}
