function getVueRouter() {

  const routes = [
    {
      name: 'home',
      path: '/',
      component: home,
      meta: { requiresAuth: true }
    },
    {
      name: 'login',
      path: '/login',
      component: login
    },
    {
      name: 'logout',
      path: '/logout',
      component: logout,
      meta: { requiresAuth: true }
    },
    {
      path: '/list',
      component: list,
      props: true,
      children: [
        {
          path: '',
          name: 'list',
          component: listIntro,
          props: true
        },
        {
          path: 'search/status/:status',
          name: 'faceted-results',
          component: facets,
          props: true
        },
        {
          path: 'search',
          name: 'text-results',
          component: facets,
          props: true
        },
        {
          path: 'emails',
          name: 'emails',
          component: emails,
          props: true
        }
      ],
      meta: { requiresAuth: true }
    },
    {
      name: 'list-household',
      path: '/list/:id',
      components: {
        default: viewHousehold
      },
      props: true,
      meta: { requiresAuth: true }
    },
    {
      name: 'resources',
      path: '/resources/:id?',
      component: resources,
      meta: { requiresAuth: true }
    },

    // ADMIN ROUTES

    {
      path: '/admin',
      name: 'admin',
      component: admin,
      meta: { requiresAuth: true }
    },
    {
      path: '/admin/household/new',
      component: newHousehold,
      props: true,
      children: [
        {
          path: '',
          name: 'new-household',
          component: thirdChild,
          props: true
        }
      ],
      meta: { requiresAuth: true }
    },
    {
      path: '/admin/household/:household_id',
      component: adminHousehold,
      props: true,
      children: [
        {
          path: '',
          name: 'admin-household',
          component: firstChild,
          props: true
        },
        {
          path: 'person/:person_id',
          name: 'editPerson',
          component: secondChild,
          props: true
        },
        {
          path: 'new-person',
          name: 'newPerson',
          component: secondChild,
          props: true
        },
        {
          path: 'edit',
          name: 'editHousehold',
          component: thirdChild,
          props: true
        }
      ],
      meta: { requiresAuth: true }
    },
  ]
  //    { path: '/emails', component: emails },
  //    { path: '/list/turn-off/:id', component: adminHousehold, props: true },

  const router = new VueRouter({
    routes: routes,
    linkActiveClass: 'active',
    linkExactActiveClass: 'active'
  });

  // router.beforeEach((to, from, next) => {
  //   //TEMP
  //   next();

  //   if (to.matched.some(record => record.meta.requiresAuth)) {
  //     if (true) {
  //       next({
  //         path: '/login',
  //         query: {
  //           redirect: to.fullPath,
  //         },
  //       });
  //     } else {
  //       next();
  //     }
  //   } else {
  //     next();
  //   }
  // })

  return router;
}