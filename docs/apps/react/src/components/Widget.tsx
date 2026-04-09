import { faker } from '@faker-js/faker';
import { useMemo, useRef } from 'react';
import { VirtList, type VirtListRef } from '@virt-list/react';

interface DemoItem {
  id: number;
  content: string;
}

function VirtListDemo() {
  const virtListRef = useRef<VirtListRef<DemoItem>>(null);

  const list = useMemo<DemoItem[]>(() => {
    return Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      content: faker.lorem.paragraph(),
    }));
  }, []);

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 20 }}>
      <div
        style={{
          display: 'flex',
          gap: 10,
          justifyContent: 'center',
          flexWrap: 'wrap',
          marginBottom: 20,
        }}
      >
        <button onClick={() => virtListRef.current?.scrollToTop()}>
          滚动到顶部
        </button>
        <button onClick={() => virtListRef.current?.scrollToBottom()}>
          滚动到底部
        </button>
        <button onClick={() => virtListRef.current?.scrollToIndex(500)}>
          滚动到第500项
        </button>
        <button onClick={() => virtListRef.current?.scrollToIndex(Math.floor(Math.random() * 1000))}>
          随机滚动
        </button>
      </div>

      <div
        style={{
          width: 400,
          height: 600,
          border: '1px solid #000',
          margin: '0 auto',
        }}
      >
        <VirtList
          ref={virtListRef}
          list={list}
          itemKey="id"
          itemPreSize={50}
          buffer={4}
          renderItem={(item, index) => (
            <div style={{ padding: 4 }}>
              <div style={{ fontWeight: 'bold' }}>Item {item.id}</div>
              <div style={{ color: '#666', fontSize: 12 }}>{item.content}</div>
              <div style={{ color: '#999', fontSize: 10 }}>
                Index: {index} (@virt-list/react VirtList)
              </div>
            </div>
          )}
          renderStickyHeader={() => (
            <div
              style={{
                background: 'cyan',
                padding: 10,
                textAlign: 'center',
                fontWeight: 'bold',
              }}
            >
              Sticky Header
            </div>
          )}
          renderStickyFooter={() => (
            <div
              style={{
                background: 'cyan',
                padding: 10,
                textAlign: 'center',
                fontWeight: 'bold',
              }}
            >
              Sticky Footer
            </div>
          )}
          onToTop={(item) => console.log('到达顶部', item)}
          onToBottom={(item) => console.log('到达底部', item)}
        />
      </div>
    </div>
  );
}

export default VirtListDemo;
