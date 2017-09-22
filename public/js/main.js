
// 1. Define route components.
// These can be imported from other files
var editHousehold = {
  template: '#edit-household',
  data: function(){
    return {
      item: {},
      statuses: getStatuses(),
      genders: getGenders(),
      open: 'summary'
    }
  },
  created: function() {
    if(this.$route.params.id == "new"){
      var newHousehold = getNewHousehold();
      // https://vuejs.org/2016/02/06/common-gotchas/
      // https://stackoverflow.com/questions/40713905/deeply-nested-data-objects-in-vuejs
      // Vue.set(this.item.people, idx, newPerson)
      this.item = newHousehold;
      this.open = 'household';
    } else {
      this.start();
    }
  },
  mounted: function(){
    $('.collapsible').collapsible();
  },
  computed: {},
  methods: {
    start: function() {
      _this = this;
      this.$http.get('/getHousehold/', 
        {
          id: this.$route.params.id
        })
        .then(function(resp){
          // console.log('start', resp)        
          _this.item = resp.data;
          if(_this.item.people.length < 1){
            _this.addPerson();
          }
          // change legacy values to use materialize switch
          _this.item.mail_news = (_this.item.mail_news == 'yes' || _this.item.mail_news == true ) ? true : false;
          _this.item.mail_list = (_this.item.mail_list == 'yes' || _this.item.mail_list == true ) ? true : false;
          }, function(error){
          _this.item = {
            name: 'sorry!'
          }
        }
      );
    },
    killDOB: function(idx){
      // console.log(idx)
      if(this.item.people[idx].status != 'child' || this.item.people[idx].status != 'junior'){
        this.item.people[idx].dob = '';
      }
    },
    loadTab: function(idx){
      this.open = idx;
/*
      https://vuejs.org/v2/guide/reactivity.html#Async-Update-Queue
      this.$nextTick(function () {
      })
*/
    },
    addPerson: function(){
      var newPerson = getPersonObject();
      // assign the new person to the household
      newPerson.household_id = this.item._id;
      var idx = this.item.people.length;
      // https://vuejs.org/2016/02/06/common-gotchas/
      // https://stackoverflow.com/questions/40713905/deeply-nested-data-objects-in-vuejs
      Vue.set(this.item.people, idx, newPerson)
      // open up the new person tray
      this.open = idx;
    },
    removePerson: function(index){
      Vue.set(this.item.people[index], '_deleted', true);
    },
    saveMe: function(obj) {
      // starting label for the save button
      var txt = $('#save').text();
      // temporary message that shows
      $('#save').text('Saving...');
      // console.log(this.item.name, this.item)
      _this = this;
      this.$http.post('/postHousehold/', this.item)
        .then(function(resp){
          // console.log('post', resp)        
          // todo: redirect to a fresh view of this
          // _this.$router.replace({ path: '/list/' })
          setTimeout(function(){ 
            // revert the label of the save button
            $('#save').text(txt);
            // update the data in the view 
            _this.start();
            // redirect to the summary tab
            _this.open = 'summary';
          }, 1000);      
        }, function(error){
          console.log('error', error);
        }
      );
    }
  },
  watch: {
    '$route' (to, from) {
      console.log('$route', to, from)
      this.start();
    }
  }
};

var list = {
  template: '#list',
  data: function(){
    return {
      items: brad,
      searchStr: '',
      loading: false
    }
  },
  created: function(){
    this.loading = true;
    this.start();
  },
  methods: {
    start: function(){
      _this = this;
      this.$http.get('/getHouseholdsAndPeople')
        .then(
          function(resp){
            var data = resp.data;
            // create a string to search against
            for(i=0; i < data.length; i++){
              data[i].str = '';
              var array = [data[i].name];
              if(data[i].people && data[i].people.length > 0){
                for(j=0; j < data[i].people.length; j++){
                  array.push(data[i].people[j].first);
                }
                data[i].str = array.join(' ');
              }
            }
            // update the view with the result
            _this.items = data;
            _this.loading = false;
          }
        );
    },
    search: function(){
      var str = this.searchStr.trim();
      var array = str.split(' ');

      // if the user deletes the search string, reset the list
      if(!str){
        this.start();
      };

      for(i=0; i < this.items.length; i++){
        // each item has its own counter
        var counter = 0;
  
        // if search terms have hits in the search string, increment the counter
        for(j=0; j < array.length; j++){
          if(this.items[i].str.toLowerCase().trim().indexOf(array[j].toLowerCase().trim()) > -1){
            counter++
          } 
        }

        // if these conditions are met, show the item
        // 1. is the counter more than zero, where it started?
        // 2. does counter equal the length of array of search terms?
        // (on 2 -- if true, every search term has a hit)
        if(counter > 0 && counter == array.length){
          delete this.items[i].hide;
        } else {
          this.items[i].hide = true;
        }
      }
    }       
  }
}

var emails = {
  template: '#emails',
  data: function(){
    return {
      items: [],
      loading: true,
      statuses: getStatuses(),
      selected: {},
      emailsSelected: 'Select emails'
    }
  },
  created: function(){
    this.loading = true;
    this.start();
  },
  methods: {
    start: function(){
      _this = this;
      var params = {},
        keys = Object.keys(this.selected);
      // put the keys into a string, to send as params to the API
      params.statuses = (keys.length > 0) ? keys.join(',') : null;
      this.$http.get('/getEmails', params)
        .then(
          function(resp){
            var data = resp.data.rows;
            var blob = '';

            var emails = data.map(function(row){
              return row.value[0];
            })
            blob = emails.join(', ');
            // update the view with the result
            _this.items = blob;
            _this.loading = false;
          }
        );
    },
    toggleStatus: function(status){
      if(!this.selected[status]){
        this.selected[status] = true;
      } else {
        delete this.selected[status]
      }
      // replace the entire object b/c we're deleted stuff
      // https://vuejs.org/v2/guide/reactivity.html
      this.selected = Object.assign({}, this.selected, this.selected);
      this.start();
    },
    selectEmails: function(){
      $('#emails').select();
      this.emailsSelected = "Emails selected"
    }
  }
};

// 2. Define some routes
// Each route should map to a component. The "component" can
// either be an actual component constructor created via
// `Vue.extend()`, or just a component options object.
// We'll talk about nested routes later.
const routes = [
  { path: '/list', component: list, alias: '/' },
  { path: '/emails', component: emails },
  { path: '/list/:id', component: editHousehold, props: true }
]

// 3. Create the router instance and pass the `routes` option
// You can pass in additional options here, but let's
// keep it simple for now.
const router = new VueRouter({
  routes // short for `routes: routes`
})


var brad = [
  {
    name: 'household name',
    people: [
      {
        'first': 'first name',
        'last': 'last name',
        'email': '@email',
     }
    ]
  }
];


Vue.component('household', {
  template: '<div> \
    <b>{{ item.label_name }}</b><br /> \
    {{ item.street1 }} {{ item.street2 }}<br /> \
    {{ item.city }} {{ item.state }} {{ item.zip }}<br /> \
    {{ item.phone }}<br /> \
    <b>Mail newsletter?</b> {{ item.mail_news }}<br /> \
    <b>Mail list?</b> {{ item.mail_list }}<br /> \
    </div>',
  props: ['item'],
  methods: {
    start: function(){
      console.log('hi')
    }
  }  
});

Vue.component('person', {
  template: '<li> \
    <b>{{ item.first }} {{ item.last }}</b> \
    <span v-if="item.status">({{ item.status }})</span> \
    <span v-if="item.dob"> | {{ item.dob }}</span> \
    <span v-if="item.email"> | {{ item.email }}</span> \
    <span v-if="item.phone"> | {{ item.phone }}</span> \
    <span v-if="item.work_phone"> | Work: {{ item.work_phone }}</span> \
    </li>',
  props: ['item']
})

var vm = new Vue({
  el: '#app',
  router
});

  // Initialize collapse button
  $(".button-collapse").sideNav({
      closeOnClick: true, // Closes side-nav on <a> clicks, useful for Angular/Meteor    
  });
    // Initialize collapsible (uncomment the line below if you use the dropdown variation)
  //$('.collapsible').collapsible();