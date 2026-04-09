import { VirtListDOM } from '@virt-list/dom';

function generateUsers(count) {
  const departments = ['工程部', '设计部', '产品部', '市场部', '运营部'];
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    name: `用户_${i}`,
    email: `user${i}@example.com`,
    department: departments[i % departments.length],
    joinDate: new Date(2020, i % 12, (i % 28) + 1).toLocaleDateString(),
  }));
}

function generateProducts(count) {
  const categories = ['电子产品', '家居用品', '食品饮料', '运动户外', '图书文具'];
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    name: `商品_${i}`,
    description: `这是商品 ${i} 的描述信息`,
    price: (Math.random() * 1000).toFixed(2),
    category: categories[i % categories.length],
    stock: Math.floor(Math.random() * 500),
  }));
}

function createUserItem(user) {
  const el = document.createElement('div');
  el.className = 'demo-ka-card';
  el.innerHTML = `
    <div class="demo-ka-avatar">${user.name.charAt(0)}</div>
    <div class="demo-ka-info">
      <div style="font-weight:bold;">${user.name}</div>
      <div style="font-size:11px;color:#888;">${user.email} | ${user.department}</div>
      <div style="font-size:11px;color:#aaa;">入职: ${user.joinDate}</div>
    </div>
  `;
  return el;
}

function createProductItem(product) {
  const el = document.createElement('div');
  el.className = 'demo-ka-card';
  el.innerHTML = `
    <div class="demo-ka-avatar" style="background:#f0ad4e;">${product.name.charAt(0)}</div>
    <div class="demo-ka-info">
      <div style="font-weight:bold;">${product.name} <span style="color:#e74c3c;font-size:12px;">¥${product.price}</span></div>
      <div style="font-size:11px;color:#888;">${product.category} | 库存: ${product.stock}</div>
      <div style="font-size:11px;color:#aaa;">${product.description}</div>
    </div>
  `;
  return el;
}

const template = `
  <div class="demo-panel">
    <div class="demo-ka-tabs">
      <button class="demo-ka-tab is-active" data-tab="users">用户列表</button>
      <button class="demo-ka-tab" data-tab="products">商品列表</button>
    </div>
    <div class="demo-ka-toolbar" id="toolbar"></div>
    <div class="demo-list-container" id="listContainer" style="height:500px;"></div>
  </div>
`;

export function bootstrapKeepAlive(root) {
  root.innerHTML = template;

  const container = root.querySelector('#listContainer');
  const toolbar = root.querySelector('#toolbar');
  const tabs = root.querySelectorAll('.demo-ka-tab');

  let users = generateUsers(2000);
  let products = generateProducts(2000);

  let activeTab = 'users';
  let userScrollOffset = 0;
  let productScrollOffset = 0;
  let currentVirtList = null;

  function renderTab(tab) {
    if (currentVirtList) {
      const scrollTop = currentVirtList.clientEl?.scrollTop ?? 0;
      if (activeTab === 'users') userScrollOffset = scrollTop;
      else productScrollOffset = scrollTop;
      currentVirtList.destroy();
      currentVirtList = null;
    }

    activeTab = tab;
    tabs.forEach((t) => t.classList.toggle('is-active', t.dataset.tab === tab));

    if (tab === 'users') {
      toolbar.innerHTML = `
        <button class="virt-list-btn virt-list-btn-primary" id="btnAddUser">添加5个用户</button>
        <button class="virt-list-btn virt-list-btn-warning" id="btnClearUser">清空列表</button>
        <button class="virt-list-btn virt-list-btn-success" id="btnTopUser">回到顶部</button>
        <button class="virt-list-btn virt-list-btn-secondary" id="btnBottomUser">滚动到底部</button>
        <span style="font-size:12px;color:#888;margin-left:8px;">总数: ${users.length}</span>
      `;
      currentVirtList = new VirtListDOM(container, {
        list: users,
        itemKey: 'id',
        itemPreSize: 70,
        buffer: 5,
        renderItem: (item) => createUserItem(item),
      });

      if (userScrollOffset > 0) {
        currentVirtList.scrollToOffset(userScrollOffset);
      }

      toolbar.querySelector('#btnAddUser').addEventListener('click', () => {
        const newUsers = generateUsers(5).map((u, i) => ({
          ...u,
          id: users.length + i,
          name: `新用户_${users.length + i}`,
        }));
        users = users.concat(newUsers);
        currentVirtList.setList(users);
        currentVirtList.forceUpdate();
        toolbar.querySelector('span').textContent = `总数: ${users.length}`;
      });
      toolbar.querySelector('#btnClearUser').addEventListener('click', () => {
        users = [];
        currentVirtList.setList(users);
        currentVirtList.forceUpdate();
        toolbar.querySelector('span').textContent = `总数: 0`;
      });
      toolbar.querySelector('#btnTopUser').addEventListener('click', () => {
        currentVirtList.scrollToTop();
      });
      toolbar.querySelector('#btnBottomUser').addEventListener('click', () => {
        currentVirtList.scrollToBottom();
      });
    } else {
      toolbar.innerHTML = `
        <button class="virt-list-btn virt-list-btn-primary" id="btnAddProd">添加5个商品</button>
        <button class="virt-list-btn virt-list-btn-warning" id="btnClearProd">清空列表</button>
        <button class="virt-list-btn virt-list-btn-success" id="btnTopProd">回到顶部</button>
        <button class="virt-list-btn virt-list-btn-secondary" id="btnBottomProd">滚动到底部</button>
        <span style="font-size:12px;color:#888;margin-left:8px;">总数: ${products.length}</span>
      `;
      currentVirtList = new VirtListDOM(container, {
        list: products,
        itemKey: 'id',
        itemPreSize: 70,
        buffer: 5,
        renderItem: (item) => createProductItem(item),
      });

      if (productScrollOffset > 0) {
        currentVirtList.scrollToOffset(productScrollOffset);
      }

      toolbar.querySelector('#btnAddProd').addEventListener('click', () => {
        const newProds = generateProducts(5).map((p, i) => ({
          ...p,
          id: products.length + i,
          name: `新商品_${products.length + i}`,
        }));
        products = products.concat(newProds);
        currentVirtList.setList(products);
        currentVirtList.forceUpdate();
        toolbar.querySelector('span').textContent = `总数: ${products.length}`;
      });
      toolbar.querySelector('#btnClearProd').addEventListener('click', () => {
        products = [];
        currentVirtList.setList(products);
        currentVirtList.forceUpdate();
        toolbar.querySelector('span').textContent = `总数: 0`;
      });
      toolbar.querySelector('#btnTopProd').addEventListener('click', () => {
        currentVirtList.scrollToTop();
      });
      toolbar.querySelector('#btnBottomProd').addEventListener('click', () => {
        currentVirtList.scrollToBottom();
      });
    }
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => renderTab(tab.dataset.tab));
  });

  renderTab('users');

  return () => {
    if (currentVirtList) currentVirtList.destroy();
    root.innerHTML = '';
  };
}
