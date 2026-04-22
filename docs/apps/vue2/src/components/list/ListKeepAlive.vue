<template>
  <div class="demo-panel">
    <div class="demo-ka-tabs">
      <button
        type="button"
        class="demo-ka-tab"
        :class="{ 'is-active': activeTab === 'users' }"
        @click="activeTab = 'users'"
      >
        用户列表
      </button>
      <button
        type="button"
        class="demo-ka-tab"
        :class="{ 'is-active': activeTab === 'products' }"
        @click="activeTab = 'products'"
      >
        商品列表
      </button>
    </div>
    <div class="demo-ka-toolbar">
      <template v-if="activeTab === 'users'">
        <button type="button" class="virt-list-btn virt-list-btn-primary" @click="addUsers">添加5个用户</button>
        <button type="button" class="virt-list-btn virt-list-btn-warning" @click="clearUsers">清空列表</button>
        <button type="button" class="virt-list-btn virt-list-btn-success" @click="userListRef?.scrollToTop()">
          回到顶部
        </button>
        <button type="button" class="virt-list-btn virt-list-btn-secondary" @click="userListRef?.scrollToBottom()">
          滚动到底部
        </button>
        <span style="font-size: 12px; color: #888; margin-left: 8px">总数: {{ users.length }}</span>
      </template>
      <template v-else>
        <button type="button" class="virt-list-btn virt-list-btn-primary" @click="addProducts">添加5个商品</button>
        <button type="button" class="virt-list-btn virt-list-btn-warning" @click="clearProducts">清空列表</button>
        <button type="button" class="virt-list-btn virt-list-btn-success" @click="productListRef?.scrollToTop()">
          回到顶部
        </button>
        <button type="button" class="virt-list-btn virt-list-btn-secondary" @click="productListRef?.scrollToBottom()">
          滚动到底部
        </button>
        <span style="font-size: 12px; color: #888; margin-left: 8px">总数: {{ products.length }}</span>
      </template>
    </div>
    <div class="demo-list-container" style="height: 500px; position: relative">
      <div
        v-show="activeTab === 'users'"
        style="position: absolute; inset: 0; width: 100%; height: 100%"
      >
        <VirtList
          ref="userListRef"
          :list="users"
          item-key="id"
          :item-pre-size="70"
        >
          <template #default="{ itemData }">
            <div class="demo-ka-card">
              <div class="demo-ka-avatar">{{ itemData.name.charAt(0) }}</div>
              <div class="demo-ka-info">
                <div style="font-weight: bold">{{ itemData.name }}</div>
                <div style="font-size: 11px; color: #888">{{ itemData.email }} | {{ itemData.department }}</div>
                <div style="font-size: 11px; color: #aaa">入职: {{ itemData.joinDate }}</div>
              </div>
            </div>
          </template>
        </VirtList>
      </div>
      <div
        v-show="activeTab === 'products'"
        style="position: absolute; inset: 0; width: 100%; height: 100%"
      >
        <VirtList
          ref="productListRef"
          :list="products"
          item-key="id"
          :item-pre-size="70"
        >
          <template #default="{ itemData }">
            <div class="demo-ka-card">
              <div class="demo-ka-avatar" style="background: #f0ad4e">{{ itemData.name.charAt(0) }}</div>
              <div class="demo-ka-info">
                <div style="font-weight: bold">
                  {{ itemData.name }}
                  <span style="color: #e74c3c; font-size: 12px">¥{{ itemData.price }}</span>
                </div>
                <div style="font-size: 11px; color: #888">{{ itemData.category }} | 库存: {{ itemData.stock }}</div>
                <div style="font-size: 11px; color: #aaa">{{ itemData.description }}</div>
              </div>
            </div>
          </template>
        </VirtList>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { VirtList } from '@virt-list/vue2';
import '../../demo.css';

function generateUsers(count: number) {
  const departments = ['工程部', '设计部', '产品部', '市场部', '运营部'];
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    name: `用户_${i}`,
    email: `user${i}@example.com`,
    department: departments[i % departments.length],
    joinDate: new Date(2020, i % 12, (i % 28) + 1).toLocaleDateString(),
  }));
}

function generateProducts(count: number) {
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

type User = ReturnType<typeof generateUsers>[number];
type Product = ReturnType<typeof generateProducts>[number];

const userListRef = ref<typeof VirtList | null>(null);
const productListRef = ref<typeof VirtList | null>(null);
const activeTab = ref<'users' | 'products'>('users');
const users = ref<User[]>(generateUsers(2000));
const products = ref<Product[]>(generateProducts(2000));

function addUsers() {
  const newUsers = generateUsers(5).map((u, i) => ({
    ...u,
    id: users.value.length + i,
    name: `新用户_${users.value.length + i}`,
  }));
  users.value = users.value.concat(newUsers);
  userListRef.value?.forceUpdate();
}

function clearUsers() {
  users.value = [];
  userListRef.value?.forceUpdate();
}

function addProducts() {
  const newProds = generateProducts(5).map((p, i) => ({
    ...p,
    id: products.value.length + i,
    name: `新商品_${products.value.length + i}`,
  }));
  products.value = products.value.concat(newProds);
  productListRef.value?.forceUpdate();
}

function clearProducts() {
  products.value = [];
  productListRef.value?.forceUpdate();
}
</script>
