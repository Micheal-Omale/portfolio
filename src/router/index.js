import { createRouter, createWebHistory } from 'vue-router'

import HomeView from '../views/HomeView.vue'

// Only Home is built out. About / Work / Project are registered now as lazy
// placeholder views so the nav links resolve and the routes can be filled in
// later without touching the router.
const routes = [
  { path: '/', name: 'home', component: HomeView },
  {
    path: '/about',
    name: 'about',
    component: () => import('../views/AboutView.vue'),
  },
  {
    path: '/work',
    name: 'work',
    component: () => import('../views/WorkView.vue'),
  },
  {
    path: '/work/:project',
    name: 'project',
    component: () => import('../views/ProjectView.vue'),
    props: true,
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    // Match the reference: every route change starts at the top.
    return { top: 0 }
  },
})

export default router
