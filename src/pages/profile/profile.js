import template from './profile.hbs';
import { render } from '../../app/view.js';

export function renderProfile() {
  return render(template);
}
