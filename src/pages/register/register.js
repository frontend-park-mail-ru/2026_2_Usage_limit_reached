import template from './register.hbs?raw';
import { render } from '../../app/view.js';

export function renderRegister() {
  return render(template);
}
