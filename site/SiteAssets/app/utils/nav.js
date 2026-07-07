import { Container, Image, LinkButton } from '../libs/nofbiz/nofbiz.base.js';
import { isAdmin } from './auth.js';

// Returns a sticky nav bar with brand on the left and page links on the right.
// activePath matches the route key string ('', 'initiatives', 'admin').
export function buildNavbar(user, activePath) {
  const logo = new Image('../SiteAssets/app/media/logo.png', {
    class: 'app-nav__logo',
    alt: 'Volunteering Portal logo',
  });

  const brand = new LinkButton('Volunteering Portal', '/', {
    class: 'app-nav__brand',
  });

  const brandGroup = new Container([logo, brand], {
    class: 'app-nav__brand-group',
  });

  const initiativesClass = `app-nav__link${activePath === 'initiatives' ? ' app-nav__link--active' : ''}`;
  const profileClass = `app-nav__link${activePath === 'profile' ? ' app-nav__link--active' : ''}`;
  const navLinks = [
    new LinkButton('Initiatives', 'initiatives', {
      class: initiativesClass,
    }),
    new LinkButton('My Profile', 'profile', {
      class: profileClass,
    }),
  ];

  // TEMP: always show Admin link while testing. Remove to restore isAdmin gate.
  const SHOW_ADMIN_ALWAYS = true;

  if (SHOW_ADMIN_ALWAYS || isAdmin(user)) {
    const adminClass = `app-nav__link${activePath === 'admin' ? ' app-nav__link--active' : ''}`;
    navLinks.push(
      new LinkButton('Admin', 'admin', {
        class: adminClass,
      }),
    );
  }

  const inner = new Container(
    [brandGroup, new Container(navLinks, { class: 'app-nav__links' })],
    { class: 'app-nav__inner shell' },
  );

  return new Container([inner], { as: 'nav', class: 'app-nav' });
}
