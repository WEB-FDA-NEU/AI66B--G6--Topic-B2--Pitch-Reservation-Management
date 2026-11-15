import { bootCustomerPage } from '../features/customer-kit.js';
import { renderAuthPage } from '../features/auth-forms.js';

bootCustomerPage(user => renderAuthPage(user));
