const routes = [
    { 
      name: 'home',
      path: '/', 
      component: home
    },
    { 
      path: '/list', 
      name: 'list',
      component: list
    },
    { 
      name: 'list-household',
      path: '/list/:id', 
      components: {
        default: viewHousehold
      }, 
      props: true 
    },
    // ADMIN ROUTES
    { 
      name: 'admin',
      path: '/admin', 
      component: admin 
    },
    { 
      path: '/admin/household/:household_id', 
      component: adminHousehold, 
      props: true,
      children: [
        {
          name: 'editPerson',
          path: 'person/:person_id',
          component: secondChild,
          props: true
        },
        {
          name: 'editHousehold',
          path: 'edit',
          component: thirdChild,
          props: true
        },        
        {
          name: 'admin-household',
          path: '',
          component: firstChild,
          props: true
        },
      ]
    },
    { path: '/emails', component: emails },
    { path: '/list/turn-off/:id', component: adminHousehold, props: true },
    { path: '/logout', component: logout },
    { path: '/resources/:id?', component: resources }
  ]
  
  // 3. Create the router instance and pass the `routes` option
  // You can pass in additional options here, but let's
  // keep it simple for now.
  const router = new VueRouter({
    routes // short for `routes: routes`
  });

var vm = new Vue({
  el: '#app',
  router
});

