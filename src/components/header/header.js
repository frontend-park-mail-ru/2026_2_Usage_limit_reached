import template from './header.hbs';
import { render } from '../../app/view.js';

export function renderHeader() {
  return render(template);
}
