import { bootCustomerPage } from '../features/customer-kit.js';
import { renderPitchDetailOrSchedulePage } from '../features/pitch-booking.js';

bootCustomerPage(user => renderPitchDetailOrSchedulePage(user));
