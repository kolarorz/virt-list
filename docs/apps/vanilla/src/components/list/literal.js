import { faker } from '@faker-js/faker';
import { VirtList } from '@virt-list/vanilla';

const template = `
  <div class="virt-list-container" id="virtListContainer"></div>
`;

function generateData() {
  return Array.from({ length: 100 }, (_, i) => ({
    id: i,
    content: faker.lorem.paragraph(),
  }));
}

export function bootstrapLiteral(root) {
  root.innerHTML = template;

  const container = root.querySelector('#virtListContainer');
  const virtList = new VirtList(container, {
    list: generateData(),
    itemKey: 'id',
    itemPreSize: 72,
    buffer: 3,
    renderItem: (item) => {
      const row = document.createElement('div');
      row.style.padding = '4px';
      row.innerHTML = `
        <div style="font-weight:bold;">Item ${item.id}</div>
        <div style="color:#666;font-size:12px;">${item.content}</div>
        <div style="color:#999;font-size:10px;">Key: ${item.id} (DOM)</div>
      `;
      return row;
    },
  });

  return () => {
    virtList.destroy();
    root.innerHTML = '';
  };
}
