class SiteFooter extends HTMLElement {
  connectedCallback() {
    this.setAttribute('data-footer', '');
  }
}

if (!customElements.get('site-footer')) {
  customElements.define('site-footer', SiteFooter);
}
