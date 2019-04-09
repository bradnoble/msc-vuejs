/*
* Initialize VueRouter w/ Vuex state store
*/
function initializeVueRouter(store) {

  // #region Route definitions

  const routes = [
    {
      name: 'home',
      path: '/',
      component: home,
      meta: { requiresAuth: true }
    },
    {
      path: '/households',
      name: 'households',
      component: households,
      meta: { requiresAuth: true, roles: 'admin' }
    },
    {
      path: '/households/new',
      component: householdNew,
      props: true,
      children: [
        {
          path: '',
          name: 'household-new',
          component: householdEdit,
          props: true
        }
      ],
      meta: { requiresAuth: true, roles: 'admin' }
    },
    {
      path: '/households/:household_id',
      component: household,
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
          name: 'person-edit',
          component: personEdit,
          props: true
        },
        {
          path: 'person/new',
          name: 'person-new',
          component: personEdit,
          props: true
        },
        {
          path: 'edit',
          name: 'household-edit',
          component: householdEdit,
          props: true
        }
      ],
      meta: { requiresAuth: true, roles: 'admin' }
    },
    {
      name: 'login',
      path: '/login',
      component: login,
      props: true
    },
    {
      name: 'logout',
      path: '/logout',
      component: logout,
      meta: { requiresAuth: true }
    },
    {
      path: '/admin',
      component: admin,
      props: true,
      children: [
        {
          path: '',
          name: 'admin',
          component: adminIntro,
          props: true
        },
        {
          path: 'search',
          name: 'admin-search',
          component: adminSearch,
          props: true
        }
      ],
      meta: { requiresAuth: true, roles: 'admin' }
    },
    {
      path: '/admin/edit/household/:id',
      name: 'edit-household',
      component: adminEditHousehold,
      props: true,
      meta: { requiresAuth: true, roles: 'admin' }
    },
    {
      path: '/admin/add/household/',
      name: 'add-household',
      component: adminEditHousehold,
      props: true,
      meta: { requiresAuth: true, roles: 'admin' }
    },
    {
      path: '/admin/household/:id/add-person/',
      name: 'add-person',
      component: adminEditPerson,
      props: true,
      meta: { requiresAuth: true, roles: 'admin' }
    },
    {
      path: '/admin/edit/person/:id',
      name: 'edit-person',
      component: adminEditPerson,
      props: true,
      meta: { requiresAuth: true, roles: 'admin' }
    },
    {
      path: '/admin/household/:id',
      name: 'admin-view-household',
      component: adminViewHousehold,
      props: true,
      meta: { requiresAuth: true, roles: 'admin' }
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
          path: 'status/:status',
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
      // this is the link you land on in the member section from the recent updates
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
    }
  ]

  // #endregion

  // #region Initialization and metnhods

  const router = new VueRouter({
    routes: routes,
    linkActiveClass: 'active',
    linkExactActiveClass: 'active'
  });

  /*
  * Evaluates router requests for authorization
  */
  router.beforeEach((to, from, next) => {

    //TEMP-for testing
    //return next();
    let testme = store.getters.roles.includes('admin')

    //If route metadata require authorization
    if (to.matched.some(record => record.meta.requiresAuth)) {

      //Presence of user object authenticated
      const user = store.getters.user;
      if (user) {
        //See if route contains role authorization
        const record = to.matched.find((record) => {
          return record.meta.roles;
        });
        if (record) {
          const routeRoles = record.meta.roles;
          //See if user has at least one of the roles required for authorization
          let found = user.roles.split(',').some(r => routeRoles.includes(r));
          //Allow route if authorized otherwise redirect to home page
          if (found) {
            next();
          } else {
            next({ path: '/' });
          }
        } else {
          next();
        }
      } else {
        //Redirect to login page if not authenticated
        next({
          path: '/login',
          query: {
            redirect: to.fullPath
          },
        });
      }
    } else {
      next();
    }
  })

  return router;

  // #endregion

}