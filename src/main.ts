import 'aframe';
import './styles.css';
import './components/hoverable';
import './components/tap-select';
import './components/render-order';
import { router } from './state/router';

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => router.init());
} else {
  router.init();
}
