import '@testing-library/jest-dom/vitest'

// jsdom does not implement HTMLDialogElement.showModal/close — polyfill for trust-ui-react Dialog.
// Skipped for node-environment suites (e.g. the firestore.rules tests), which have no DOM.
if (typeof HTMLDialogElement !== 'undefined') {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function () {
      this.open = true
    }
  }
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function () {
      this.open = false
    }
  }
}
