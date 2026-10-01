import template from './register.hbs';
import { render } from '../../app/view.js';

export function renderRegister() {
  return render(template);
}
