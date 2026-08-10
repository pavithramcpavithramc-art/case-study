import {initNavigation, scrollSpy} from './navigation.js';
import {initAnimations} from './animations.js';
import {initSpendwiseUI} from './projects.js';

document.addEventListener('DOMContentLoaded', ()=>{
  initNavigation();
  scrollSpy();
  initAnimations();
  initSpendwiseUI();
});
