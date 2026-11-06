import './styles/main.css';
import { initRouter } from './app/router.ts';
import { registerServiceWorker } from './app/registerServiceWorker.ts';

initRouter();
void registerServiceWorker();
