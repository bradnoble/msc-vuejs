const routes = [
    { 
      name: 'home',
      path: '/', 
      component: home
    },
    { 
      path: '/list', 
      component: list,
      children: [
        {
          path: '',
          name: 'list',
          component: search,
          props: true
        },
        {
          path: 'emails',
          name: 'emails',
          component: emails,
          props: true
        },
        {
          path: 'downloads',
          name: 'downloads',
          component: downloads,
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
    },
    { path: '/emails', component: emails },
//    { path: '/list/turn-off/:id', component: adminHousehold, props: true },
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

