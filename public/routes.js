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
      path: '/members',
      component: members,
      props: true,
      children: [
        {
          path: '',
          name: 'member-intro',
          component: memberIntro,
          props: true
        },
        {
          path: 'search/status/:status',
          name: 'member-status',
          component: memberSearch,
          props: true
        },
        {
          path: 'search',
          name: 'member-name',
          component: memberSearch,
          props: true
        },
        {
          path: 'emails',
          name: 'member-emails',
          component: memberEmails,
          props: true
        }
      ],
      meta: { requiresAuth: true }
    },
    {
      name: 'member-household',
      path: '/household/:id',
      components: {
        default: memberHousehold
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