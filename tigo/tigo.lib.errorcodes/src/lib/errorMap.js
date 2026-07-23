import BUYP from '../lib/errors/BUYP.js';
import OAUTH from '../lib/errors/OAUTH.js';
import INVOICE from '../lib/errors/INVOICE.js';
import TOPUP from '../lib/errors/TOPUP.js';
import SERVICE_COVERAGE from './errors/SERVICE_COVERAGE.js';
import TYPE from './errors/TYPE.js';
import OTP from './errors/OTP.js';
import GENERIC from './errors/GENERIC.js';

const errorMap = {
  ...BUYP,
  ...OAUTH,
  ...INVOICE,
  ...TOPUP,
  ...SERVICE_COVERAGE,
  ...TYPE,
  ...OTP,
  ...GENERIC
};

export default errorMap;
