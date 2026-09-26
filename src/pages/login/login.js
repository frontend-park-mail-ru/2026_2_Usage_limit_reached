import template from './login.hbs?raw';
import { render } from '../../app/view.js';

export function renderLogin() {
  return render(template);
}
