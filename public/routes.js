function getVueRouter() {

  const routes = [
    { 
      name: 'home',
      path: '/', 
      component: home
    },
    {
      name: 'memberhome',
      path: '/memberhome',
      component: memberHome
    },
    {
      name: 'logout',
      path: '/logout',
      component: logout
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
      ]
    },
    { 
      name: 'list-household',
      path: '/list/:id', 
      components: {
        default: viewHousehold
      }, 
      props: true 
    },
    {
      name: 'resources',
      path: '/resources/:id?',
      component: resources
    },

    // ADMIN ROUTES

    { 
      path: '/admin', 
      name: 'admin',
      component: admin 
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
      ]
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
      ]
    }
//    { path: '/emails', component: emails },
//    { path: '/list/turn-off/:id', component: adminHousehold, props: true },
  ]
  
  return new VueRouter({
    routes: routes,
    linkActiveClass: 'active',
    linkExactActiveClass: 'active'
  });
  
}