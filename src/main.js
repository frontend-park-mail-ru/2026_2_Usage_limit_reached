import { initRouter, navigate } from './app/router.js';
import { renderHeader, bindHeaderLinks } from './components/header/header.js';

document.getElementById('header').innerHTML = renderHeader();
bindHeaderLinks(navigate);
initRouter();
