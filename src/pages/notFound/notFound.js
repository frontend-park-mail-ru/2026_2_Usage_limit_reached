import template from './notFound.hbs?raw';
import { render } from '../../app/view.js';

export function renderNotFound() {
  return render(template);
}
