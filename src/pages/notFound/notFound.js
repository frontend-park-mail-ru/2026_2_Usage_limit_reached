import template from './notFound.hbs';
import { render } from '../../app/view.js';

export function renderNotFound() {
  return render(template);
}
