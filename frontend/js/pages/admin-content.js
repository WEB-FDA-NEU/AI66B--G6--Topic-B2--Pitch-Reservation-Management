import '../components/admin-sidebar.js';
import { mockBanners, mockAnnouncements } from '../data/admin.js';

let currentTab = 'banners'; // 'banners' or 'announcements'
let bannersData = [...mockBanners];
let announcementsData = [...mockAnnouncements];

const itemsPerPage = 10;
let currentBannerPage = 1;
let currentAnnPage = 1;

// DOM Elements
const tabBanners = document.getElementById('tab-banners');
const tabAnnouncements = document.getElementById('tab-announcements');
const viewBanners = document.getElementById('view-banners');
const viewAnnouncements = document.getElementById('view-announcements');
const btnCreate = document.getElementById('btn-create-content');

const tbodyBanners = document.getElementById('banners-tbody');
const tbodyAnnouncements = document.getElementById('announcements-tbody');

const tplBanner = document.getElementById('tpl-banner-row');
const tplAnn = document.getElementById('tpl-ann-row');

// Modals
const bannerModal = document.getElementById('banner-modal');
const annModal = document.getElementById('announcement-modal');

// Init
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('banners-count').textContent = `(${bannersData.length})`;
  document.getElementById('announcements-count').textContent = `(${announcementsData.length})`;
  
  renderBanners();
  renderAnnouncements();
  updatePagination();

  // Tab switching
  tabBanners.addEventListener('click', () => switchTab('banners'));
  tabAnnouncements.addEventListener('click', () => switchTab('announcements'));

  // Create button
  btnCreate.addEventListener('click', () => {
    if (currentTab === 'banners') {
      openBannerModal(); // Create mode
    } else {
      openAnnModal(); // Create mode
    }
  });

  // Modal close handlers
  document.getElementById('banner-modal-close')?.addEventListener('click', closeBannerModal);
  document.getElementById('banner-modal-cancel')?.addEventListener('click', closeBannerModal);
  bannerModal.addEventListener('click', (e) => { if (e.target === bannerModal) closeBannerModal(); });
  
  document.getElementById('ann-modal-close')?.addEventListener('click', closeAnnModal);
  document.getElementById('ann-modal-cancel')?.addEventListener('click', closeAnnModal);
  annModal.addEventListener('click', (e) => { if (e.target === annModal) closeAnnModal(); });
});

function switchTab(tab) {
  currentTab = tab;
  if (tab === 'banners') {
    tabBanners.classList.add('active');
    tabAnnouncements.classList.remove('active');
    viewBanners.hidden = false;
    viewAnnouncements.hidden = true;
    btnCreate.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;margin-right:8px;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> Create banner`;
  } else {
    tabBanners.classList.remove('active');
    tabAnnouncements.classList.add('active');
    viewBanners.hidden = true;
    viewAnnouncements.hidden = false;
    btnCreate.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;margin-right:8px;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> Create announcement`;
  }
  updatePagination();
}

function renderBanners() {
  tbodyBanners.innerHTML = '';
  
  const totalPages = Math.ceil(bannersData.length / itemsPerPage);
  if (currentBannerPage > totalPages) currentBannerPage = totalPages;
  if (currentBannerPage < 1) currentBannerPage = 1;
  
  const start = (currentBannerPage - 1) * itemsPerPage;
  const pageData = bannersData.slice(start, start + itemsPerPage);

  pageData.forEach(banner => {
    const clone = tplBanner.content.cloneNode(true);
    
    clone.querySelector('.td-title').textContent = banner.title;
    clone.querySelector('.td-desc').textContent = banner.description.length > 50 ? banner.description.substring(0, 50) + '...' : banner.description;
    clone.querySelector('.td-position').textContent = banner.position;
    
    const badge = clone.querySelector('.td-status');
    badge.textContent = banner.status;
    badge.className = `badge ${banner.statusClass}`;
    
    clone.querySelector('.td-date').textContent = `${banner.startDate} — ${banner.endDate}`;
    
    const tr = clone.querySelector('tr');
    tr.addEventListener('click', () => openBannerModal(banner));
    
    tbodyBanners.appendChild(clone);
  });
}

function renderAnnouncements() {
  tbodyAnnouncements.innerHTML = '';
  
  const totalPages = Math.ceil(announcementsData.length / itemsPerPage);
  if (currentAnnPage > totalPages) currentAnnPage = totalPages;
  if (currentAnnPage < 1) currentAnnPage = 1;
  
  const start = (currentAnnPage - 1) * itemsPerPage;
  const pageData = announcementsData.slice(start, start + itemsPerPage);

  pageData.forEach(ann => {
    const clone = tplAnn.content.cloneNode(true);
    
    clone.querySelector('.td-title').textContent = ann.title;
    clone.querySelector('.td-desc').textContent = ann.content.length > 50 ? ann.content.substring(0, 50) + '...' : ann.content;
    clone.querySelector('.td-audience').textContent = ann.audience;
    
    const badge = clone.querySelector('.td-status');
    badge.textContent = ann.status;
    badge.className = `badge ${ann.statusClass}`;
    
    clone.querySelector('.td-date').textContent = ann.publishedDate;
    
    const tr = clone.querySelector('tr');
    tr.addEventListener('click', () => openAnnModal(ann));
    
    tbodyAnnouncements.appendChild(clone);
  });
}

function updatePagination() {
  const info = document.querySelector('.admin-pagination__info');
  const btnPrev = document.querySelector('.btn-prev');
  const btnNext = document.querySelector('.btn-next');
  if (!info || !btnPrev || !btnNext) return;

  const dataLen = currentTab === 'banners' ? bannersData.length : announcementsData.length;
  const curPage = currentTab === 'banners' ? currentBannerPage : currentAnnPage;
  const totalPages = Math.ceil(dataLen / itemsPerPage) || 1;

  info.textContent = `Page ${curPage} of ${totalPages}`;
  btnPrev.disabled = curPage === 1;
  btnNext.disabled = curPage === totalPages;
  
  // Quick unbind and bind trick
  const newPrev = btnPrev.cloneNode(true);
  const newNext = btnNext.cloneNode(true);
  btnPrev.replaceWith(newPrev);
  btnNext.replaceWith(newNext);

  newPrev.addEventListener('click', () => {
    if (currentTab === 'banners' && currentBannerPage > 1) {
      currentBannerPage--;
      renderBanners();
      updatePagination();
    } else if (currentTab === 'announcements' && currentAnnPage > 1) {
      currentAnnPage--;
      renderAnnouncements();
      updatePagination();
    }
  });

  newNext.addEventListener('click', () => {
    if (currentTab === 'banners' && currentBannerPage < totalPages) {
      currentBannerPage++;
      renderBanners();
      updatePagination();
    } else if (currentTab === 'announcements' && currentAnnPage < totalPages) {
      currentAnnPage++;
      renderAnnouncements();
      updatePagination();
    }
  });
}

// Banner Modal Logic
function openBannerModal(banner = null) {
  const form = document.getElementById('banner-form');
  const title = document.getElementById('banner-modal-title');
  const saveBtn = document.getElementById('banner-modal-save');
  
  if (banner) {
    title.textContent = 'Edit banner';
    saveBtn.textContent = 'Save changes';
    document.getElementById('banner-title').value = banner.title;
    document.getElementById('banner-desc').value = banner.description;
    document.getElementById('banner-img').value = banner.imageUrl || '';
    document.getElementById('banner-link').value = banner.link;
    document.getElementById('banner-position').value = banner.position;
    // Mocking date format parsing (dd MMM yyyy -> yyyy-mm-dd) is skipped for static mock
    document.getElementById('banner-start').value = '2026-09-01';
    document.getElementById('banner-end').value = '2026-10-31';
  } else {
    title.textContent = 'Create banner';
    saveBtn.textContent = 'Save banner';
    form.reset();
  }
  
  bannerModal.showModal();
}

function closeBannerModal() {
  bannerModal.close();
}

// Announcement Modal Logic
function openAnnModal(ann = null) {
  const form = document.getElementById('ann-form');
  const title = document.getElementById('ann-modal-title');
  const saveBtn = document.getElementById('ann-modal-save');
  
  if (ann) {
    title.textContent = 'Edit announcement';
    saveBtn.textContent = 'Save changes';
    document.getElementById('ann-title').value = ann.title;
    document.getElementById('ann-content').value = ann.content;
    document.getElementById('ann-audience').value = ann.audience;
    document.getElementById('ann-pub-date').value = '2026-09-25';
    document.getElementById('ann-exp-date').value = '2026-09-29';
  } else {
    title.textContent = 'Create announcement';
    saveBtn.textContent = 'Save announcement';
    form.reset();
  }
  
  annModal.showModal();
}

function closeAnnModal() {
  annModal.close();
}
