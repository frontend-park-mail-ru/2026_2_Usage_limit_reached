import template from './login.hbs';
import { render } from '../../app/view.js';

export function renderLogin() {
  return render(template);
}
