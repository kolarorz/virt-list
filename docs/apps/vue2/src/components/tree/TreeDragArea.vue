<template>
  <div class="tree-demo">
    <div class="virt-tree-wrapper">
      <VirtTree
        :list="treeData"
        :field-names="{ key: 'id' }"
        draggable
        :cross-level-draggable="false"
        show-line
        expand-on-click-node
        default-expand-all
        :item-gap="4"
        :indent="16"
        :icon-size="14"
        @dragstart="onDragStart"
        @dragend="onDragEnd"
      >
        <template #empty>
          <TreeEmpty />
        </template>
      </VirtTree>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { VirtTree } from '@virt-list/vue2';
import type { TreeNode } from '@virt-list/vue2';
import TreeEmpty from './items/TreeEmpty.vue';
import '../../demo.css';

const treeData = ref([
  {
    id: 'role',
    title: '角色',
    children: [
      { id: 'role-1', title: '怪物' },
      { id: 'role-2', title: '小动物' },
      { id: 'role-3', title: '路人' },
      { id: 'role-4', title: '武器' },
    ],
  },
  {
    id: 'scene',
    title: '场景',
    children: [
      { id: 'scene-1', title: '场景地域' },
      { id: 'scene-2', title: '室内区域' },
      { id: 'scene-3', title: '室外区域' },
      { id: 'scene-4', title: '特色区域' },
    ],
  },
  {
    id: 'origin',
    title: '原始',
    children: [
      { id: 'origin-1', title: '原始' },
      { id: 'origin-2', title: '3D' },
      { id: 'origin-3', title: 'NPC' },
      { id: 'origin-4', title: '手枪' },
    ],
  },
  { id: 'drag-1', title: '角色环节', children: [] },
  { id: 'drag-2', title: '场景环节', children: [] },
  { id: 'drag-3', title: '测试', children: [] },
]);

function onDragStart(data: { sourceNode: TreeNode }) {
  console.log('dragstart', data);
}

function onDragEnd(data: unknown) {
  console.log('dragend', data);
}
</script>
