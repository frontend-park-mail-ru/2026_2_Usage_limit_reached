import template from './profile.hbs?raw';
import { render } from '../../app/view.js';

export function renderProfile() {
  return render(template);
}
