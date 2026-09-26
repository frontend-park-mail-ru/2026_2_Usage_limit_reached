import template from './header.hbs?raw';
import { render } from '../../app/view.js';

export function renderHeader() {
  return render(template);
}
