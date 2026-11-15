class SiteHeader extends HTMLElement {
  connectedCallback() {
    this.setAttribute('data-header', '');
  }
}

if (!customElements.get('site-header')) {
  customElements.define('site-header', SiteHeader);
}
