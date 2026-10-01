import './styles/main.css';
import { initRouter } from './app/router.js';
import { renderHeader } from './components/header/header.js';

document.getElementById('header').innerHTML = renderHeader();
initRouter();
