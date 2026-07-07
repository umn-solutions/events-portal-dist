import {
  Text,
  Container,
  Image,
  LinkButton,
  Toast,
  SiteApi,
  CurrentUser,
  defineRoute,
  __lodash,
} from '../libs/nofbiz/nofbiz.base.js';
import { buildNavbar } from '../utils/nav.js';
import { STATUSES } from '../utils/status.js';

export default defineRoute(async (config) => {
  config.setRouteTitle('Home');

  const user = new CurrentUser();

  // Hero band
  const hero = new Container(
    [
      new Container(
        [
          new Container(
            [
              new Text('Volunteering program', { type: 'span', class: 'eyebrow' }),
              new Text(
                'Our people give their time to causes that matter',
                { type: 'h1', class: 'hero__title' },
              ),
              new Text(
                'Explore our volunteering program and join initiatives that create real change in communities.',
                { type: 'p', class: 'hero__sub' },
              ),
              new LinkButton('Browse initiatives', 'initiatives', { variant: 'primary' }),
            ],
            { class: 'hero__inner' },
          ),
          new Image('../SiteAssets/app/media/hero.png', { class: 'hero__image', alt: 'Volunteering program' }),
        ],
        { class: 'shell' },
      ),
    ],
    { class: 'hero' },
  );

  // Intro band -- static, renders regardless of stats load outcome
  const RESOURCES = [
    { title: 'Things to know before volunteering', note: 'PDF guide' },
    { title: 'Volunteer Handbook', note: 'PDF guide' },
    { title: 'Frequently asked questions', note: 'PDF' },
  ];

  const buildResourceCard = (r) =>
    new Container(
      [
        new Container([], { class: 'resource-card__icon' }),
        new Container(
          [
            new Text(r.title, { type: 'span', class: 'resource-card__title' }),
            new Text(r.note, { type: 'span', class: 'resource-card__note' }),
          ],
          { class: 'resource-card__text' },
        ),
      ],
      {
        class: 'resource-card surface',
        onClickHandler: () => Toast.info('This resource will be available soon.'),
      },
    );

  const introBand = new Container(
    [
      new Container(
        [
          new Container(
            [
              new Text('About the platform', { type: 'span', class: 'eyebrow' }),
              new Text('Give your time where it matters', { type: 'h2', class: 'section-title' }),
              new Text(
                'This platform brings our people together with volunteering initiatives run by partner organisations across the communities we serve. Browse open initiatives, find a cause that matches your skills and your schedule, and lend your time where it makes a real difference.',
                { type: 'p', class: 'intro__body' },
              ),
              new Text(
                'Every initiative explains what you will do, the skills involved, the time commitment, and how to take part. New opportunities are added regularly, so check back often or use the catalog to find the ones that fit you.',
                { type: 'p', class: 'intro__body' },
              ),
            ],
            { class: 'intro__main surface' },
          ),
          new Container(
            [
              new Text('Resources', { type: 'h3', class: 'intro__aside-title' }),
              new Container(RESOURCES.map(buildResourceCard), { class: 'intro__aside-list' }),
            ],
            { class: 'intro__aside' },
          ),
        ],
        { class: 'intro__grid shell' },
      ),
    ],
    { class: 'intro' },
  );

  // Attempt to load stats. On failure render navbar + hero only.
  let figuresBand = null;
  try {
    const items = await new SiteApi().list('Initiatives').getItems();

    const totalCount = items.length;

    const distinctAssociations = __lodash.uniqBy(
      items.filter((i) => i.AssociationName),
      (i) => String(i.AssociationName),
    ).length;

    const volunteersNeeded = items.reduce((sum, i) => {
      const n = Number(i.VolunteersNeeded);
      return Number.isNaN(n) ? sum : sum + n;
    }, 0);

    const openCount = items.filter((i) => String(i.Status) === STATUSES.OPEN).length;

    const makeFigure = (value, label) =>
      new Container(
        [
          new Text(String(value), { type: 'span', class: 'figure__value' }),
          new Text(label, { type: 'span', class: 'figure__label' }),
        ],
        { class: 'figure' },
      );

    const figuresGrid = new Container(
      [
        makeFigure(totalCount, 'Total initiatives'),
        makeFigure(distinctAssociations, 'Partner organisations'),
        makeFigure(volunteersNeeded, 'Volunteers needed'),
        makeFigure(openCount, 'Open initiatives'),
      ],
      { class: 'figures__grid' },
    );

    const figuresIntro = new Container(
      [
        new Text('Our impact in figures', { type: 'span', class: 'eyebrow' }),
        new Text('Volunteering at a glance', { type: 'h2', class: 'section-title' }),
        new Text(
          'These numbers reflect the collective effort of our people and the organisations we partner with. They grow as new initiatives open and more colleagues choose to take part.',
          { type: 'p', class: 'figures__lead' },
        ),
      ],
      { class: 'figures__intro' },
    );

    figuresBand = new Container(
      [
        new Container(
          [
            new Container([figuresIntro, figuresGrid], { class: 'figures__grid-wrap surface' }),
          ],
          { class: 'shell' },
        ),
      ],
      { class: 'figures' },
    );
  } catch (err) {
    console.error('[home] stats getItems failed:', err);
    Toast.error('Could not load platform statistics.');
  }

  const children = [buildNavbar(user, ''), hero, introBand];
  if (figuresBand) children.push(figuresBand);

  return children;
});
