import { bootManagement } from '../features/management-kit.js';
import { renderPitchForm } from '../features/pitch-form.js';

if (!new URLSearchParams(location.search).get('id')) {
  sessionStorage.setItem('pitch-point:flash', 'Hãy chọn một sân trong danh sách để chỉnh sửa.');
  location.replace('manager-pitches.html');
} else bootManagement(renderPitchForm);
