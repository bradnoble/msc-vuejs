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
      name: 'admin',
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
          meta: { 
            breadcrumb: "Search",
          },
          props: true
        },
        {
          path: 'edit/household/:id',
          name: 'edit-household',
          component: adminEditHousehold,
          meta: { 
            breadcrumb: "Edit Household",
          },
          props: true
        },
        {
          path: 'add/household/',
          name: 'add-household',
          component: adminEditHousehold,
          meta: { 
            breadcrumb: "Add Household",
          },
          props: true
        },
        {
          path: 'household/:id/add-person/',
          name: 'add-person',
          component: adminEditPerson,
          meta: { 
            breadcrumb: "Add Person",
          },
          props: true
        },
        {
          path: 'edit/person/:id',
          name: 'edit-person',
          component: adminEditPerson,
          meta: { 
            breadcrumb: "Edit Person",
          },
          props: true
        },
        {
          path: 'household/:id',
          name: 'admin-view-household',
          component: adminViewHousehold,
          meta: { 
            breadcrumb: "Household",
          },
          props: true
        }
      ],
      meta: { 
        breadcrumb: "Admin",
        requiresAuth: true, 
        roles: 'admin' 
      }
    },
    {
      path: '/members',
      name: 'member-intro',
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
          path: 'search',
          name: 'member-search',
          component: memberSearch,
          meta: {
            breadcrumb: "Search by name"
          },
          props: true
        },
        {
          path: 'emails',
          name: 'member-emails',
          component: memberEmails,
          meta: {
            breadcrumb: "Emails"
          },
          props: true
        },
        {
          path: 'reports',
          name: 'member-reports',
          component: memberReports,
          meta: {
            breadcrumb: "Reports"
          },
          props: true
        },
        {
          path: 'household/:id',
          name: 'member-household',
          components: {
            default: memberHousehold
          },
          props: true,
          meta: { 
            breadcrumb: "Household"
          }
        }
      ],
      meta: { 
        breadcrumb: "Membership List",
        requiresAuth: true 
      }
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