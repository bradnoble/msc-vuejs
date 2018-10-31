/*
* Initialize VueRouter w/ Vuex state store
*/
function initializeVueRouter(store) {

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
      path: '/households',
      name: 'households',
      component: households,
      meta: { requiresAuth: true }
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
      meta: { requiresAuth: true }
    },
    {
      path: '/household/:household_id',
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
          path: 'new-person',
          name: 'newPerson',
          component: secondChild,
          props: true
        },
        {
          path: 'edit',
          name: 'household-edit',
          component: householdEdit,
          props: true
        }
      ],
      meta: { requiresAuth: true }
    },
  ]

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
    
    //Test if route metadata require authorization
    if (to.matched.some(record => record.meta.requiresAuth)) {
      //Presence of user object indicates user is authenticated
      //TBD-could expand this to allow access to routes based upon roles
      if (store.getters.user) {
        next();
      } else {
        //Redirect to login page if not authenticated
        next({
          path: '/login',
          query: {redirect: to.fullPath},
        });
      }
    } else {
      next();
    }
  })

  return router;
}