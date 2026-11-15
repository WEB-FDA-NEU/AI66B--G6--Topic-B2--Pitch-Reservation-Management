import { bootCustomerPage } from '../features/customer-kit.js';
import { renderBookingConfirmOrPaymentPage } from '../features/checkout.js';

bootCustomerPage(user => renderBookingConfirmOrPaymentPage(user));
