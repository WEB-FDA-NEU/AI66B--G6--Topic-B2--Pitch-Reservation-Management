import '../components/site-header.js';
import '../components/site-footer.js';

const list = document.getElementById('screen-list');
const itemTemplate = document.getElementById('tpl-screen-item');
const emptyStateTemplate = document.getElementById('tpl-empty-state');

function createItem(item) {
  const node = itemTemplate.content.cloneNode(true);
  node.querySelector('.screen-item__title').textContent = item.title;
  node.querySelector('.screen-item__meta').textContent = item.meta;
  return node;
}

function renderItems(items) {
  if (!items.length) {
    list.replaceChildren(emptyStateTemplate.content.cloneNode(true));
    return;
  }

  list.replaceChildren(...items.map(createItem));
}

renderItems([]);
