import { api } from '../services/api-client.js';
import { el } from '../core/render.js';
import { $, say, bootCustomerPage } from '../features/customer-kit.js';

async function renderScreen(user) {
  const list = $('#screen-list');
  if (!list) return;
  const { items } = await api.entities.Pitch.filter({ status: 'active' }, { limit: 3 });
  list.replaceChildren(...items.map(p => el('p', p.name)));
  if (!user) say('');
}

bootCustomerPage(renderScreen);
