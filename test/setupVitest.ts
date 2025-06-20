import { afterAll, beforeAll, beforeEach, afterEach } from 'vitest';
import 'test/utils/addChaiAssertions';
import 'test/utils/licenseRelease';
import { generateTestLicenseKey, setupTestLicenseKey } from 'test/utils/testLicense';
import { configure } from '@mui/internal-test-utils';
import { config } from 'react-transition-group';

import sinon from 'sinon';
import { unstable_resetCleanupTracking as unstable_resetCleanupTrackingDataGrid } from '@mui/x-data-grid';
import { unstable_resetCleanupTracking as unstable_resetCleanupTrackingDataGridPro } from '@mui/x-data-grid-pro';
import { unstable_resetCleanupTracking as unstable_resetCleanupTrackingTreeView } from '@mui/x-tree-view';
import failOnConsole from 'vitest-fail-on-console';
import { clearWarningsCache } from '@mui/x-internals/warning';
import { hasTouchSupport, isJSDOM } from './utils/skipIf';

// Core's setupVitest is causing issues with the test setup
// import '@mui/internal-test-utils/setupVitest';

// Enable missing act warnings: https://github.com/reactwg/react-18/discussions/102
(globalThis as any).jest = null;
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let licenseKey: string = '';

beforeAll(() => {
  licenseKey = generateTestLicenseKey();
});

beforeEach(() => {
  clearWarningsCache();
  setupTestLicenseKey(licenseKey);
  config.disabled = true;
});

afterEach(() => {
  unstable_resetCleanupTrackingDataGrid();
  unstable_resetCleanupTrackingDataGridPro();
  unstable_resetCleanupTrackingTreeView();

  // Restore Sinon default sandbox to avoid memory leak
  // See https://github.com/sinonjs/sinon/issues/1866
  sinon.restore();
  config.disabled = false;
});

configure({
  // JSDOM logs errors otherwise on `getComputedStyle(element, pseudoElement)` calls.
  computedStyleSupportsPseudoElements: !isJSDOM,
});

failOnConsole();

// This is necessary because core utils still use mocha global hooks
if (!globalThis.before) {
  (globalThis as any).before = beforeAll;
}
if (!globalThis.after) {
  (globalThis as any).after = afterAll;
}

// Only necessary when not in browser mode.
if (!hasTouchSupport) {
  class Touch {
    instance: any;

    constructor(instance: any) {
      this.instance = instance;
    }

    get identifier() {
      return this.instance.identifier;
    }

    get pageX() {
      return this.instance.pageX;
    }

    get pageY() {
      return this.instance.pageY;
    }

    get clientX() {
      return this.instance.clientX;
    }

    get clientY() {
      return this.instance.clientY;
    }
  }
  // @ts-expect-error
  globalThis.window.Touch = Touch;
}
