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

  document.getElementById('banner-modal-save')?.addEventListener('click', () => {
    if (!document.getElementById('banner-form').checkValidity()) {
      document.getElementById('banner-form').reportValidity();
      return;
    }
    closeBannerModal();
  });

  document.getElementById('ann-modal-save')?.addEventListener('click', () => {
    if (!document.getElementById('ann-form').checkValidity()) {
      document.getElementById('ann-form').reportValidity();
      return;
    }
    closeAnnModal();
  });

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
    // We bind specifically to action buttons now to avoid conflicts
    clone.querySelector('.btn-edit').addEventListener('click', () => openBannerModal(banner));
    clone.querySelector('.btn-preview').addEventListener('click', () => openPreview(banner, 'banner'));
    clone.querySelector('.btn-toggle').addEventListener('click', () => toggleStatus(banner, 'banner'));
    
    const btnDelete = clone.querySelector('.btn-delete');
    if (banner.status === 'Draft') {
      btnDelete.style.display = 'inline-flex';
      btnDelete.addEventListener('click', () => deleteItem(banner, 'banner'));
    }

    
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
    clone.querySelector('.btn-edit').addEventListener('click', () => openAnnModal(ann));
    clone.querySelector('.btn-preview').addEventListener('click', () => openPreview(ann, 'ann'));
    clone.querySelector('.btn-toggle').addEventListener('click', () => toggleStatus(ann, 'ann'));
    
    const btnDelete = clone.querySelector('.btn-delete');
    if (ann.status === 'Draft' || ann.status === 'Scheduled') {
      btnDelete.style.display = 'inline-flex';
      btnDelete.addEventListener('click', () => deleteItem(ann, 'ann'));
    }

    
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


const previewModal = document.getElementById('preview-modal');
document.getElementById('preview-modal-close')?.addEventListener('click', () => previewModal.close());
previewModal?.addEventListener('click', (e) => { if (e.target === previewModal) previewModal.close(); });

function openPreview(item, type) {
  document.getElementById('preview-status').textContent = item.status;
  document.getElementById('preview-status').className = 'badge ' + item.statusClass;
  document.getElementById('preview-title').textContent = item.title;
  document.getElementById('preview-desc').textContent = type === 'banner' ? item.description : item.content;
  
  if (type === 'banner') {
    document.getElementById('preview-link').textContent = item.link;
    document.getElementById('preview-link').hidden = false;
    if (item.imageUrl) {
      document.getElementById('preview-hero').style.background = 'linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(' + item.imageUrl + ') center/cover no-repeat';
    } else {
      document.getElementById('preview-hero').style.background = 'linear-gradient(135deg, var(--c-primary-d) 0%, var(--c-primary) 100%)';
    }
    document.getElementById('preview-meta-label1').textContent = 'Position';
    document.getElementById('preview-meta-value1').textContent = item.position;
    document.getElementById('preview-meta-label2').textContent = 'Date range';
    document.getElementById('preview-meta-value2').textContent = item.startDate + ' — ' + item.endDate;
  } else {
    document.getElementById('preview-link').hidden = true;
    document.getElementById('preview-meta-label1').textContent = 'Audience';
    document.getElementById('preview-meta-value1').textContent = item.audience;
    document.getElementById('preview-meta-label2').textContent = 'Published';
    document.getElementById('preview-meta-value2').textContent = item.publishedDate;
  }
  
  previewModal.showModal();
}


const confirmModal = document.getElementById('confirm-modal');
const confirmTitle = document.getElementById('confirm-title');
const confirmText = document.getElementById('confirm-text');
const btnConfirmOk = document.getElementById('confirm-ok');
const btnConfirmCancel = document.getElementById('confirm-cancel');

let currentConfirmCallback = null;

btnConfirmCancel?.addEventListener('click', () => {
  confirmModal.close();
});

btnConfirmOk?.addEventListener('click', () => {
  if (currentConfirmCallback) currentConfirmCallback();
  confirmModal.close();
});

function deleteItem(item, type) {
  const typeName = type === 'banner' ? 'banner' : 'announcement';
  confirmTitle.textContent = `Delete ${typeName}`;
  confirmText.textContent = `Delete draft ${typeName} "${item.title}"? This cannot be undone.`;
  
  // Custom styling for delete confirm button
  btnConfirmOk.className = 'btn-admin btn-admin--danger';
  btnConfirmOk.style = 'background: var(--c-primary); color: #fff;'; // Use dark green for consistency if requested, but image shows green button for delete? Wait, image 4 shows green 'Confirm' button even for delete. Let's use primary.
  btnConfirmOk.className = 'btn-admin btn-admin--primary';
  
  currentConfirmCallback = () => {
    if (type === 'banner') {
      bannersData = bannersData.filter(b => b.id !== item.id);
      renderBanners();
    } else {
      announcementsData = announcementsData.filter(a => a.id !== item.id);
      renderAnnouncements();
    }
    updatePagination();
  };
  confirmModal.showModal();
}

function toggleStatus(item, type) {
  const typeName = type === 'banner' ? 'banner' : 'announcement';
  const isActivating = (item.status === 'Draft' || item.status === 'Scheduled' || item.status === 'Inactive' || item.status === 'Unpublished' || item.status === 'Expired');
  
  let actionName = '';
  if (type === 'banner') {
    actionName = isActivating ? 'Activate' : 'Deactivate';
  } else {
    actionName = isActivating ? 'Publish' : 'Unpublish';
  }

  confirmTitle.textContent = `${actionName} ${typeName}`;
  if (type === 'announcement' && isActivating) {
    confirmText.textContent = `${actionName} "${item.title}" to ${item.audience}?`;
  } else {
    confirmText.textContent = `Are you sure you want to ${actionName.toLowerCase()} "${item.title}"?`;
  }

  btnConfirmOk.className = 'btn-admin btn-admin--primary';

  currentConfirmCallback = () => {
    if (isActivating) {
      item.status = type === 'banner' ? 'Active' : 'Published';
      item.statusClass = 'badge--success';
    } else {
      item.status = type === 'banner' ? 'Inactive' : 'Unpublished';
      item.statusClass = 'badge--neutral';
    }
    type === 'banner' ? renderBanners() : renderAnnouncements();
  };
  confirmModal.showModal();
}
