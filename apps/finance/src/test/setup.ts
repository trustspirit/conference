import '@testing-library/jest-dom/vitest'

// jsdom does not implement HTMLDialogElement.showModal/close — polyfill for trust-ui-react Dialog
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
