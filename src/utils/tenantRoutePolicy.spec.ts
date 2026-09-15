import { describe, expect, it } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import { isExplicitTenantAppRoute, orderTenantHostRoutes } from './tenantRoutePolicy';

const component = {};

describe('tenant route policy', () => {
  it('recognizes explicit tenant application and public routes', () => {
    expect(isExplicitTenantAppRoute('/app/login')).toBe(true);
    expect(isExplicitTenantAppRoute('/admin/queue')).toBe(true);
    expect(isExplicitTenantAppRoute('/check-in')).toBe(true);
    expect(isExplicitTenantAppRoute('/book')).toBe(true);
    expect(isExplicitTenantAppRoute('/services')).toBe(false);
  });

  it('keeps application routes ahead of tenant website fallbacks', () => {
    const websiteRoutes = [
      { path: '/', name: 'website-home', component },
      { path: '/services', name: 'website-services', component },
    ];
    const appRoutes = [
      { path: '/', name: 'marketing-home', component },
      { path: '/app', name: 'pwa-entry', component },
      { path: '/app/login', name: 'login', component },
      {
        path: '/check-in',
        component,
        children: [{ path: '', name: 'check-in', component }],
      },
      { path: '/book', name: 'book', component },
      {
        path: '/admin',
        component,
        children: [{ path: 'queue', name: 'admin-queue', component, meta: { requiresAuth: true } }],
      },
      { path: '/:pathMatch(.*)*', redirect: '/check-in' },
    ];
    const router = createRouter({
      history: createMemoryHistory(),
      routes: orderTenantHostRoutes(websiteRoutes, appRoutes),
    });

    expect(router.resolve('/app/login').name).toBe('login');
    expect(router.resolve('/admin/queue').name).toBe('admin-queue');
    expect(router.resolve('/check-in').name).toBe('check-in');
    expect(router.resolve('/book').name).toBe('book');
    expect(router.resolve('/').name).toBe('website-home');
  });
});
