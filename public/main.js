// #region App initialization

$(function () {
  /*
  $('.dropdown-trigger').dropdown();
  $('.modal').modal();
  $('.tooltipped').tooltip();
  $('.collapsible').collapsible();
  */
  M.AutoInit();
  //>>MaterializeCSS 1.0.0 features
  // $('.tap-target').tapTarget();

  // Initialize collapse button
  // $(".button-collapse").sideNav({
  //   closeOnClick: true, // Closes side-nav on <a> clicks, useful for Angular/Meteor    
  // });
  // Initialize collapsible (uncomment the line below if you use the dropdown variation)
  //$('.collapsible').collapsible();

  //Vuex initialization
  Vue.use(Vuex);

  //State store initialization
  const store = new Vuex.Store({
    state: {
      //Read user from cookie, null if not present
      user: window.$cookies.get('msc-user'),
      background: ''
    },
    getters: {
      //Page background class
      background: state => {
        return state.background;
      },
      //List of user roles
      roles: state => {
        return (state.user && state.user.roles ? state.user.roles : '')
      },
      //User object
      user: state => {
        return state.user
      }
    },
    mutations: {
      //Clear user from state
      clearBackground(state) {
        state.background = ''
      },
      clearUser(state) {
        state.user = null
      },
      setBackground(state, background) {
        state.background = background
      },
      //Set user in state
      setUser(state, user) {
        state.user = user
      }
    }
  })

  // Router setup and initialize Vue app
  const router = initializeVueRouter(store);

  Vue.filter('capitalize', function (value) {
    if (!value) return ''
    value = value.toString()
    return value.charAt(0).toUpperCase() + value.slice(1)
  })

  //App initialization
  var vm = new Vue({
    el: '#app-container',
    store,
    router,
    template: '#layout-template',
    computed: {
      background: function () {
        let img = this.$store.getters.background;
        return img;
      }
    },
    created: function () {
      //Authorization initialization before any loading
      let user = window.$cookies.get('msc-user');
      if (user) {
        Vue.http.headers.common['api-key'] = user.token;
      }
    },
    data: function () {
      return {
        title: 'Montclair Ski Club'
      }
    }
  })

});

// #endregion

// #region Layout/Login/Logout/Home

const login = {
  template: '#login-template',
  props: [
    'loginMsg',
    'password',
    'username'
  ],
  created() {
    document.title = 'Login-MSC ';
  },
  mounted: function () {
    $('#username').focus();
  },
  methods: {
    onLogin: function () {
      let user = this.$http.get('/api/login?username=' + this.username + '&password=' + this.password)
        .then((res) => {
          //If valid user returned
          if (res.data) {

            const user = res.data;

            //Store user object in local cookie
            this.$cookies.set('msc-user', user, '1d');
            // TEST print user name
            //console.log(this.$cookies.get('msc-user').username);

            //Set global HTTP header
            Vue.http.headers.common['api-key'] = user.token;

            //Store user info and redirect to Home page
            this.$store.commit('setUser', user);
            this.$router.push('/');
          } else {
            this.username = '';
            this.password = '';
            this.loginMsg = 'Authenticate failed: either username or password is incorrect.';
            $('#username').focus();
          }
        });
    }
  }
}

//Logout controller
const logout = {
  created: function () {
    this.logout();
  },
  methods: {
    logout: function () {

      //Remove local cookie w/ user data
      this.$cookies.remove('msc-user');

      //Clear client user data representing authentication
      this.$store.commit('clearUser');

      //Initiate logout of Passport on server
      this.$http.get('/api/logout');

      //Redirect to login page
      this.$router.push('/login')
    }
  }
};

//Home controller
const home = {
  template: '#home-template',
  beforeDestroy() {
    //Clear page background
    this.$store.commit('clearBackground');
  },
  created() {
    document.title = 'MSC';
  },
  data() {
    return {
    }
  },
  mounted: function () {

    //Change page background
    this.$store.commit('setBackground', 'page-background-snowtrees');

    TwitterWidgetsLoader.load(function (err, twttr) {
      if (err) {
        //do some graceful degradation / fallback
        console('TwitterWidgetLoad failed to load');
        return;
      }

      twttr.widgets.createTimeline(
        {
          screenName: 'msc_madriver',
          sourceType: 'profile',
        },
        document.getElementById('twitter-timeline'),
        {
          // width: '600',
          height: '600',
          related: 'twitterdev,twitterapi'
        }).then(function (el) {
          //console.log('Embedded a timeline.')
        });

    });

    //UI initialization
    //$('.carousel').carousel();

  },
  methods: {
  }
}

Vue.component('app-navbar', {
  template: '#navbar-template',
  computed: {
    isAdmin: function () {
      return (this.$store.getters.roles.includes('admin'));
    },
    isAuthenticated: function () {
      return (this.$store.getters.user ? true : false);
    }
  },
  created: function () {
  },
  data: function () {
    return {
    }
  }
});

Vue.component('app-footer', {
  template: '#footer-template'
});

// for 404s
const errorPage = {
  template: '#error-page',
  data: function(){
    return {}
  }
}

// #endregion

// #region Members

// Members controller (parent controller of search, emails, downloads)
const members = {
  template: '#members',
  data: function () {
    return {
      searchFacets: '',
      error: '',
      loading: true
    }
  },
  computed: {
    isAdmin: function () {
      return (this.$store.getters.roles.includes('admin'));
    }
  },
  updated: function(){
    // send the route path values to the factory
    // note: because this is a parent, and is called from updated()
    // this will update the title tags for all children when they load
    buildBreadcrumbForTitleTag(this.$route.matched);
  },
  methods: {
    search: function (e) {
      e.preventDefault();
      // if this is a new keyword search, clear the facets
      this.searchFacets = '';
      this.pushToRouter();
    },
    clickedFromChild: function(value){
      if(this.searchFacets == value){
        this.searchFacets = '';
      } else {
        this.searchFacets = value;
      }
      this.pushToRouter();
    },
    setSearchString: function(){
      this.searchstring = this.$route.query.q;
    },
    pushToRouter: function(){
      let _this = this;
      let obj = {};

      if(_this.searchstring.length > 0){
        obj.q = _this.searchstring.trim()
      }
      if(_this.searchFacets){
        obj.drilldown = _this.searchFacets
      }

      if (_this.searchstring.length > 0) {
        _this.$router.push({ 
          name: 'members-search', 
          params: {}, 
          query: obj
        });
      }
    },
    toggleSearchForm: function(val){
      this.searchForm = val
    },
    errorMsg: function(val){
      this.error = val;
    },
    loadingCheck: function(val){
      this.loading = val;
    }
  }
}

// Member intro controller (first child of list)
const memberIntro = {
  template: '#members-intro',
  data: function () {
    return {
      updates: [],
      statuses: [],
      total: 0,
      statuses_array: []
    }
  },
  props: [
    'isAdmin'
  ],
  computed: {
  },
  mounted: function () {
    // show the search form
    this.$emit('searchForm', true);
    // get recent updates
    this.getLastUpdated();
    // get tally
    this.getStatusesWithCounts();
    this.$emit('loading', false);
  },
  updated: function(){
    // $('.dropdown-trigger').dropdown({ constrainWidth: false });
  },
  methods: {
    // this was helpful for talking from a child to a parent
    // https://medium.com/@sky790312/about-vue-2-parent-to-child-props-af3b5bb59829
    // also this https://laracasts.com/discuss/channels/vue/how-to-catch-a-childs-emit-in-the-parent-with-vue/replies/289920
    searchfromchild: function (e) {
      this.$emit('searched', this.searchstring)
      e.preventDefault();
    },
    getLastUpdated: function () {
      let _this = this;
      _this.$http.get('/api/members/updated')
        .then(
          function (res) {
            _this.updates = getDocs(res.body);
          }
        )
    },
    getStatusesWithCounts: function(){
      let _this = this;
      _this.$http.get('/api/members/statuses')
        .then(
          function (res) {
            _this.statuses = res.body.rows;

            // get total
            for (let i = 0; i < _this.statuses.length; i++) {
              _this.total = _this.total + _this.statuses[i].value;
              _this.statuses_array.push(_this.statuses[i].key);
            }
            
            // console.log(_this.statuses_array);

            // sort the statuses
            // https://stackoverflow.com/questions/1129216/sort-array-of-objects-by-string-property-value
            function compare(a, b) {
              if (a.value < b.value)
                return 1;
              if (a.value > b.value)
                return -1;
              return 0;
            }
            _this.statuses.sort(compare);
            // console.log("this gets called from emails, too")
          }
        );
    }
  }
}

// Member search controller (second child of list)
const memberSearch = {
  template: '#members-search',
  props: [
    'isAdmin'
  ],
  data: function () {
    return {
      items: [],
      counts: {}
    }
  },
  mounted: function () {
    this.$emit('searchForm', true);
    let _this = this;
    _this.$emit('setSearchString');
    _this.$emit('loading', true);
    _this.searchAPI();
  },
  updated: function () {
    M.updateTextFields();
    $('.dropdown-trigger').dropdown({ constrainWidth: false });
  },
  watch: {
    '$route'(to, from) {
      this.searchAPI();
      this.$emit('searchForm', true);
    }
  },
  methods: {
    addFacet: function(facet, value){
      let _this = this;
      let array = [];
      array[0] = facet;
      array[1] = value;
      // push array to the parent
      // which pushes it to the querystring, which is watched
      // we will call searchAPI from there, not here
      // stringify so that the drilldown arrays are preserved the way Cloudant needs them
      // ie, drilldown=["status","active"] instead of drilldown=["status"]&drilldown=["active"]
      // https://forum.vuejs.org/t/passing-data-back-to-parent/1201
      _this.$emit('clicked', JSON.stringify(array));
    },
    clearFacets: function(){
      let _this = this;
      _this.$emit('clicked', '');
    },
    searchAPI: function(){
      let _this = this;
      let query = _this.$route.query;
      if (query) {
        _this.$http.get('/api/members/search',
          {
            params: query
          }
        ).then(function(res){
            _this.items = getDocs(res.data);
            _this.counts = res.data.counts;
            _this.$emit('loading', false);
            _this.$emit('error');
          }, function(error){
            _this.$emit('error', error);
          }
        );
      } else {
        _this.items = [];
        return;
      }
    }
  }
};

// Member emails controller (third child of list)
const memberEmails = {
  template: '#members-emails',
  props: [
    'isAdmin'
  ],
  data: function () {
    return {
      items: [],
      newsletter: ['active', 'inactive', 'life'],
      querystring: '',
      query_array: [],
      statuses: []
    }
  },
  mounted: function () {
    // if the view loads with a querystring, get results
    if(this.$route.query.status){
      this.getEmails();
    }
    // get statuses no matter what
    this.getStatusesWithEmails();
  },
  updated: function () {
    M.textareaAutoResize($('#textarea-emails'));
  },
  watch: {
    '$route.query.status'(to, from) {
      // when the querystring changes, get emails      
      this.getEmails();
    }
  },
  methods: {
    intercept: function (str) {
      // this function takes link clicks and pushes them into an array 
      // for the querystring
      // .watch() listens for changes to the querystring, and then queries the db
      var arr = [];
      var status = str;
      var querystring = this.$route.query;
      var index = 0;

      // no param means no search
      if (!status) {
        this.$router.push({ name: 'members-emails' });
        this.query_array = [];
      } else {
        // if there's no querystring, start the array
        if (!querystring.status) {
          arr.push(status);
        }
        // in vuejs, if the querystring already has only one value, it's a string
        // and we need to change it to an array so it can have other friends
        if (querystring.status && typeof querystring.status == 'string') {
          querystring.status = [querystring.status];
        }
        // might not need this check here, b/c anything making it this far will be an object
        if (typeof querystring.status == 'object') {
          // if the status is already in the querystring, get it out
          index = querystring.status.indexOf(status);
          if (index > -1) {
            // create a new querystring array without it
            for (var i = 0; i < querystring.status.length; i++) {
              if (querystring.status[i] != status) {
                arr.push(querystring.status[i]);
              }
            }
          } else {
            // add the new status to the query array
            arr.push(status);
            // console.log('arr', arr, 'querystring.status', querystring.status)
            arr = arr.concat(querystring.status);
            // console.log(arr)
          }
        }
        this.$router.push({ query: { status: arr } })
      }
    },
    getStatusesWithEmails: function(){
      this.$http.get('/api/members/statusesWithEmails')
        .then(function (resp) {
          this.statuses = resp.body.rows;
          this.$emit('loading', false);
        }
      )
    },
    getEmails: function () {
      let _this = this;
      _this.querystring = '';

      if (_this.$route.query.status) {
        if (typeof _this.$route.query.status == 'string') {
          _this.querystring = _this.$route.query.status;
          _this.query_array = [_this.$route.query.status];
        } else {
          _this.querystring = _this.$route.query.status.join(',');
          _this.query_array = _this.$route.query.status;
        }
      }

      // put the comma delimited querystring into the query object
      // and send it to the API for results
      let obj = {
        params: {
          statuses: _this.querystring
        }
      };

      if (_this.querystring) {
        _this.$emit('loading', true);

        this.$http.get('/api/members/emails', obj)
          .then(function (resp) {
            let docs = [];
            let array = [];
            _this.totalEmails = resp.body.rows.length;

            // extract kv pairs from the function in factories.js
            docs = getDocs(resp.body);

            // loop through docs to build an array that we will turn into a string
            for (let i = 0; i < docs.length; i++) {
              if (docs[i].email)
                array.push(docs[i].first + ' ' + docs[i].last + ' <' + docs[i].email + '>');
            }
            // turn the array into a string for the textarea in the page
            _this.items = array.join(', ');
            _this.$emit('loading', false);
          });
      } else {
        _this.totalEmails = 0;
        _this.items = []
      }

    },
    selectEmails: function () {
      var copyText = $('#emails').select();
      //      this.emailsSelected = "Emails selected"
      /* Get the text field */
      // var copyText = document.getElementById("emails");

      /* Select the text field */
      // copyText.select();

      /* Copy the text inside the text field */
      document.execCommand("Copy");

      /* Alert the copied text */
      alert("Copied the text: " + copyText.value);
    }
  }
}

const memberHousehold = {
  template: '#members-household',
  data: function () {
    return {
      item: {},
      back: ''
    }
  },
  props: [
    'isAdmin'
  ],
  beforeRouteEnter: function (to, from, next) {
    // conditional back button
    // helpful reference about how to use next(): 
    // https://medium.com/@allenhwkim/resolving-before-route-vuejs-d319b27576c3
    next(vm => {
      if (from.fullPath == '/') {
        vm.back = {
          name: 'members-intro'
        };
      } else {
        vm.back = {
          name: from.name,
          params: from.params,
          query: from.query
        };
      }
    });
  },
  mounted: function () {
    this.start();
  },
  updated: function () {
    // console.log(this.back)
  },
  methods: {
    start: function () {
      _this = this;
      _this.$emit('loading', true);

      this.$http.get('/api/members/households/' + this.$route.params.id)
        .then(function (resp) {
          // console.log('start', resp)        
          _this.item = resp.data;
          this.$emit('loading', false);
        },
          function (error) {
            _this.item = {
              name: 'sorry!'
            }
          }
        );
    }
  },
  watch: {
    '$route'(to, from) {
      //console.log('$route', to, from)
      this.start();
    }
  }
};

// #endregion

////////////////
// #region ADMIN
////////////////

const admin = {
  template: '#admin',
  data: function(){
    return {
      searchFacets: '',
      error: '',
      loading: true,
    }
  },
  updated: function(){
    // send the route path values to the factory
    // note: because this is a parent, and is called from updated()
    // this will update the title tags for all children when they load
    buildBreadcrumbForTitleTag(this.$route.matched);
    // cascade field updates to children
    M.updateTextFields();
  },
  methods: {
    clickedFromChild: function(value){
      if(this.searchFacets == value){
        this.searchFacets = '';
      } else {
        this.searchFacets = value;
      }
      this.pushToRouter();
    },
    pushToRouter: function(){
      let _this = this;
      let obj = {};
      let searchString = this.$route.query.q;

      if(searchString.length > 0){
        obj.q = searchString.trim()
      }
      if(_this.searchFacets){
        obj.drilldown = _this.searchFacets
      }

      if (searchString.length > 0) {
        _this.$router.push({ 
          name: 'admin-search', 
          params: {}, 
          query: obj
        });
      }
    },
    errorMsg: function(val){
      // if there is no val or if val=false, no error will appear
      // console.log(typeof val)
      if(val){
        if(val.type == "warning"){
          this.error = val
        } else {
          this.error = val
        }
      } else {
        this.error = val
      }
      // if an error already exists when this is called, add another error to it
      // if the error is a blocker, it should be red
      // if the error is just a warning, it should be orange
      // this.error = val;
    },
    loadingCheck: function(val){
      this.loading = val;
    }
  }
}

const adminIntro = {
  template: '#admin-intro',
  data: function(){
    return {
      people: [],
      households: [],
      updates: []
    }
  },
  props: [
  ],
  mounted: function(){
    // see if there are any data errors
    this.getReport();
    // get recent updates
    this.getUpdates();
    // show the user that we're loading dynamic data
    this.$emit('loading', true);
    // kill off errors from other views
    this.$emit('error', false)
  },
  methods: {
    getReport: function(){
      let _this = this;
      _this.$http.get('/api/admin/report',
        ).then(function(res){
          // console.log(res)
          let array = getDocs(res.data);
          for(let i=0; i<array.length; i++){
            if(array[i].type == "person"){
              _this.people.push(array[i]);
            }
            else if (array[i].type == "household"){
              _this.households.push(array[i])
            }
          }
          _this.$emit('loading', false);
        }, function(error){
          console.log(error);
          _this.$emit('error', error);
        });
  
    },
    getUpdates: function(){
      this.$http.get('/api/admin/updated',
        ).then(function(res){
          console.log(res.body.rows);
/*
          let people = {};
          let households = {};
          let rows = res.body.rows;
          for(let i = 0; i < rows.length; i++){
            if(rows[i].doc.type == "person"){ 
              people[rows[i].doc._id] = rows[i].doc;
            } else {
              households[rows[i].doc._id] = rows[i].doc;
            }
          }
*/
          this.updates = getDocs(res.body);
        });
    }
  }
}

const adminSearch = {
  template: '#admin-search',
  data: function(){
    return {
      items: [],
      counts: {}
    }
  },
  props: [
  ],
  mounted: function(){
    let _this = this;
    _this.$emit('loading', true);
    _this.searchAPI();
  },
  updated: function(){
    $('.dropdown-trigger').dropdown({ constrainWidth: false });
    $('.tooltipped').tooltip();
  },
  watch: {
    '$route'(to, from) {
      this.searchAPI();
    }
  },
  methods: {
    addFacet: function(facet, value){
      let _this = this;
      let array = [];
      array[0] = facet;
      array[1] = value;
      // push array to the parent
      // which pushes it to the querystring, which is watched
      // we will call searchAPI from there, not here
      // stringify so that the drilldown arrays are preserved the way Cloudant needs them
      // ie, drilldown=["status","active"] instead of drilldown=["status"]&drilldown=["active"]
      // https://forum.vuejs.org/t/passing-data-back-to-parent/1201
      _this.$emit('clicked', JSON.stringify(array));
    },
    clearFacets: function(){
      let _this = this;
      _this.$emit('clicked', '');
    },
    searchAPI: function(){
      let _this = this;
      let query = _this.$route.query;
      if (query) {
        _this.$http.get('/api/admin/search',
          {
            params: query
          }
        ).then(function(res){
            _this.items = getDocs(res.data);
            _this.counts = res.data.counts;
            _this.$emit('loading', false);
            _this.$emit('error');
          }, function(error){
            _this.$emit('error', error);
          }
        );
      } else {
        _this.items = [];
        return;
      }
    }
  }
}

const adminEditHousehold = {
  template: '#admin-edit-household',
  data: function(){
    return {
      id: '',
      item: {},
      people: [],
      disable: true, // form save button is disabled until required fields have values
      errors: [] // these are for required field errors, not server errors
    }
  },
  props: [
  ],
  mounted: function(){
    this.$emit('error',false);
    if(this.$route.name == "add-household"){
      this.item = getNewHousehold();
    } else {
      this.$emit('loading', true);
      this.getHousehold();
    }
  },
  updated: function(){
    M.updateTextFields()
    // disable the save button until required fields have values
    let requiredFields = $('.required');
    let counter = 0;
    for(var i = 0; i < requiredFields.length; i++){
      if (!requiredFields[i].value){
        counter++
      }
    }
    // if the counter is 0 after looping through the values of required fields, 
    // the save button will stay disabled
    // if the counter is > 0, the save button will be enabled
    // note, this.disable is used when the form is submitted, too, via the checkform() method
    this.disable = Boolean(counter);
  },
  watch: {
    '$route'(to, from) {
      this.getHousehold();
    }
  },
  methods: {
    getHousehold: function(){
      let _this = this;
      _this.id = this.$route.params.id;

      _this.$http.get('/api/admin/household/' + _this.id)
        .then(
          function(res){
            // console.log(res);
            _this.item = res.body;
            _this.$emit('error');
            _this.$emit('loading', false);
          }, function(error){
            // console.log(error);
            _this.$emit('error', error);
            _this.item = {};
          }
        ).then(
          function(){
            console.log('hi');

            _this.$http.get('/api/admin/householdAndPeople/' + _this.id)
            .then(function (resp) {
              _this.people = resp.data.people;
              console.log(_this.people)
              _this.$emit('error');
              _this.$emit('loading');
            }, function (error) {
              _this.item = {};
              _this.$emit('error', error);
            });
    
            
          }
        )
    },
    checkform: function () {
      this.errors = [];
      if (this.item.name.length > 0 && this.item.city.length > 0 && this.item.state.length > 0 && this.item.zip.length > 0) {
        return true;
      }
      if (this.item.name == '') this.errors.push('Please provide a name for this household.')
      if (this.item.city == '') this.errors.push('Please provide a city for this household.')
      if (this.item.state == '') this.errors.push('Please provide a state for this household.')
      if (this.item.zip == '') this.errors.push('Please provide a zip for this household.')
    },
    save: function(){
      let _this = this;

      if (_this.item.people) {
        delete _this.item.people;
      };

      if (this.checkform()) {

        // starting label for the save button
        const txt = $('#save').text();
        // temporary message that shows
        $('#save').text('Saving...');

        this.$http.post('/api/admin/save/household', _this.item)
          .then(function (resp) {
            // console.log('item', _this.item)
            setTimeout(function () {
              // revert the label of the save button
              $('#save').text(txt);
              //console.log(resp)
              // redirect to the summary tab
              _this.$router.replace({ name: 'admin-view-household', params: { id: _this.item._id } });
            }, 200);
          }, function (error) {
            console.log('error', error);
          }
          );
      }
    },
    deleteHousehold: function(){
      let _this = this;
      Vue.set(_this.item, '_deleted', true);
      // console.log('delete')
      let proceed = confirm("Are you sure you want to remove this household? It can not be undone.")

      if(proceed){
        this.$http.post('/api/admin/save/household', _this.item)
        .then(
          function (resp) {
            // redirect to the household summary
            _this.$router.replace({ name: '404', params: { id: _this.item._id } });
            // this toast appears on the 404 page, after the redirect
            M.toast({html: 'Household deleted', classes: 'red lighten-4 red-text'})
          }, function (error) {
            console.log('error', error);
          }
        );  
      }
    }
  }
}

const adminEditPerson = {
  template: '#admin-edit-person',
  data: function(){
    return {
      id: '',
      item: {},
      household: {},
      statuses: getStatuses(),
      genders: getGenders(),
      disable: true, // form save button is disabled until required fields have values
      errors: [] // for required field errors, not server errors
    }
  },
  props: [],
  computed: {},
  mounted: function(){
    if(this.$route.name == "add-person"){
      this.item = getPersonObject();
      this.item.household_id = this.$route.params.id;
      this.$emit('loading',false);
    } else {
      this.$emit('loading', true);
      this.getPerson();
    }
  },
  updated: function(){
    M.updateTextFields();

    // disable the save button until required fields have values
    let requiredFields = $('.required');
    let counter = 0;
    for(var i = 0; i < requiredFields.length; i++){
      if (!requiredFields[i].value){
        counter++
      }
    }
    // if the counter is 0 after looping through the values of required fields, 
    // the save button will stay disabled
    // if the counter is > 0, the save button will be enabled
    // note, this.disable is used when the form is submitted, too, via the checkform() method
    this.disable = Boolean(counter);
  },
  watch: {
    '$route'(to, from) {
      this.getPerson();
    }
  },
  methods: {
    getPerson: function(){
      let _this = this;
      _this.id = this.$route.params.id;

      _this.$http.get('/api/admin/person/' + _this.id,
      ).then(
        function(res){
          _this.item = res.body;
          _this.$emit('loading', false);
          _this.$emit('error', false);
        }, function(error){
          _this.item = {};
          _this.$emit('error', error);
        }
      ).then(
        function(){
          if(_this.item.household_id){
            //console.log('household_id: ', _this.item.household_id);
            _this.$http.get('/api/admin/household/' + _this.item.household_id,
              ).then(
                function(res){
                  _this.household = res.body;
                  //console.log(_this.household);
                  _this.$emit('loading', false);
                  _this.$emit('error', false);
                }, function(error){
                  _this.household = {};
                  // _this.$emit('error', error);
                  _this.$emit('error', {
                    'type':'warning',
                    'ctx': "This page should show the household to which this person belongs, but no household exists. It's ok, the form will still work. Probably best to delete this record, or contact Brad Noble.",
                    'msg': error.body.error
                  })
                }
              )
            }

        }
      );
    },
    checkform: function () {
      this.errors = [];
      if(this.disable){
        this.errors.push('Please provide a first and last name.')
      } else {
        return true
      }
    },
    save: function(){
      let _this = this;

      if (this.checkform()) {

        // save the starting label for the save button
        const txt = $('#save').text();
        // temporary message that shows
        $('#save').text('Saving...');

        this.$http.post('/api/admin/save/person', _this.item)
          .then(function (resp) {
            // console.log('item', _this.item)
            setTimeout(function () {
              // revert the label of the save button
              $('#save').text(txt);
              // redirect to the summary tab
              _this.$router.replace({ name: 'admin-view-household', params: { id: _this.item.household_id } });
              M.toast({html: 'Person saved'})
            }, 200);
          }, function (error) {
            console.log('error', error);
          }
        );
      }
    },
    deletePerson: function(){
      let _this = this;
      Vue.set(_this.item, '_deleted', true);
      // console.log('delete')
      let proceed = confirm("Are you sure you want to remove this person? It can not be undone.")

      if(proceed){
        this.$http.post('/api/admin/save/person', _this.item)
        .then(
          function (resp) {
            // redirect to the household summary
            _this.$router.replace({ name: 'admin-view-household', params: { id: _this.item.household_id } });
            // this toast appears on the household summary after the redirect
            M.toast({html: 'Person deleted', classes: 'red lighten-4 red-text'})
          }, function (error) {
            console.log('error', error);
          }
        );  
      }
    }
  }
}

const adminViewHousehold = {
  template: '#admin-view-household',
  data: function(){
    return {
      id: '',
      item: {},
      error: ''
    }
  },
  props: [],
  mounted: function(){
    this.getHouseholdWithPeople();
    this.$emit('loading', true);
  },
  updated: function(){},
  watch: {
    '$route'(to, from) {
      this.getHouseholdWithPeople();
    }
  },
  methods: {
    getHouseholdWithPeople: function(){
      let _this = this;
      _this.id = this.$route.params.id;
      _this.$http.get('/api/admin/householdAndPeople/' + _this.id)
        .then(function (resp) {
          _this.item = resp.data;
          _this.$emit('error');
          _this.$emit('loading');
        }, function (error) {
          _this.item = {};
          _this.$emit('error', error);
        });

    }
  }
}

const adminReports = {
  template: '#admin-reports',
  data: function(){
    return {
      statuses: getStatuses('deceased'),
      items: [],
      queryStatuses: []
    }
  },
  props: [
  ],
  mounted: function(){
    this.$emit('loading', false);
    // get preview data
    // todo: make sure to only call this when there's a querystring
    this.previewDataForCSV();
  },
  watch: {
    '$route'(to, from) {
      this.previewDataForCSV();
    }
  },
  methods: {
    checkQuerystring: function(){
      // console.log(this.$route.query);
      if(this.$route.query && this.$route.query.status){
        if(typeof this.$route.query.status == "string"){
          this.queryStatuses = [this.$route.query.status];
        } else {
          this.queryStatuses = this.$route.query.status;
        }
      }
    },
    addStatusParam: function(clickedStatus){
      // disable facet links while the server is working
      $('.status-param').addClass('disabled');
      
      // convert querystring values to an array, if there are any
      let query = (this.$route.query.status) ? this.$route.query.status : [];
      if(typeof query == "string"){
        query = [query]
      }

      // iterate through the array and see if clickedStatus is already in the array
      let newQueryArray = [];
      let counter = 0;
      for(let i = 0; i < query.length; i++){
        if(query[i] != clickedStatus){
          newQueryArray.push(query[i]);
        } else {
          counter++;
        }
      }
      // if it's not in the array, add it
      if(counter == 0){
        newQueryArray.push(clickedStatus);
      }
      // if the query array is empty, destroy it
      // otherwise, it breaks the conditional rendering of the 'clear' button
      if(newQueryArray.length == 0){
        newQueryArray = ''
      }
      // push the new array to the location bar
      this.pushToRouter(newQueryArray);
    },
    pushToRouter: function(array){
      let _this = this;
      _this.$router.push({ 
        name: 'admin-reports', 
        params: {}, 
        query: {
          status: array
        }
      });
    },
    previewDataForCSV: function(){
      let _this = this;
      let query = _this.$route.query;
      let obj = {};
      let params = {};
      obj.preview = true;

      // make sure querystring is an array
      _this.checkQuerystring();

      // merge obj with query and send that to the query below
      params = Object.assign(obj, query);

      // console.log(query);
      // console.log(params);
      // console.log(this.$route.fullPath.split('?')[1])

      if (query && query.status && query.status.length > 0) {
        _this.$emit('loading', true);
        _this.$http.get('/api/admin/csv',
          {
            params: params
          }
        ).then(function(res){
          // console.log(res.data);
          _this.items = res.data;
          // activate the facets now that the server has responded
          $('.status-param').removeClass('disabled');

          _this.$emit('loading', false);
          }, function(error){
            _this.$emit('error', error);
            console.log('error')
          }
        )
        .catch(function(error){
          console.log('catch: ', error);
        })
        .finally(function(){
        });
      }
      else {
        _this.items = [];
        $('.status-param').removeClass('disabled');
      }      
    }
  }
}

// #endregion



// #region Resources

/*
* Resources controller (Google Drive)
*/
const resources = {
  template: '#resources',
  data() {
    return {
      path: [],
      files: [],
      isLoading: false,
      folderId: -1
    }
  },
  created() {
    document.title = 'Resources-MSC';
  },
  mounted: function () {

    //Hide help text by default
    $('#resourcesHelp').hide();
    this.init();
  },
  methods: {
    init: function () {
      if (!this.isLoading) {
        this.isLoading = true;
        if (this.$route.params && this.$route.params.id) {
          this.loadFolder(this.$route.params.id);
        } else {
          this.loadRoot();
        }
      }
    },
    formatBytes: function (bytes, decimals) {
      if (bytes == 0) return '0 Bytes';
      let k = 1024,
        dm = decimals || 2,
        sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
        i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    },
    loadFolder: function (id) {
      this.$http.get('/api/resources/' + id)
        .then((res) => {
          //Pushes root breadcrumb
          this.path.push({ name: 'MSC Drive', id: '-1' });
          //Store folder/file data
          this.files = res.data;
          this.isLoading = false;
        });
    },
    loadRoot: function () {
      //-1 is root
      this.$http.get('/api/resources/-1')
        .then((res) => {
          //Pushes root breadcrumb
          this.path.push({ name: 'MSC Drive', id: '-1' });
          //Store folder/file data
          this.files = res.data;
          this.isLoading = false;
        });
    },
    onBreadcrumb: function (id, event) {
      const _this = this;

      if (!this.isLoading && (this.folderId != id)) {
        this.isLoading = true;
        this.folderId = id;
        this.$http.get('/api/resources/' + id)
          .then((res) => {
            //Remove all folders below the selected one
            const index = _this.path.map(function (x) { return x.id; }).indexOf(id);
            _this.path.splice((index + 1));
            _this.files = res.data;
            _this.isLoading = false;
          });
      }
    },
    onFileDownload: function (file, event) {
      // this.$http.get('/api/resources/download/' + file.id)
      //   .then((res) => {
      //     console.log('test');
      //   });
      window.open('/api/resources/download/' + file.id);
    },
    onFileView: function (file, event) {

      const _this = this;

      this.$http.get('/api/resources/pdf/' + file.id)
        .then((res) => {
          //console.log('Response back w/ PDF data');

          //Decode base-64 string
          let pdfData = atob(res.data);

          //Convert to byte array
          var uint8Array = new Uint8Array(pdfData.length);
          for (var i = 0; i < pdfData.length; i++) {
            uint8Array[i] = pdfData.charCodeAt(i);
          }

          //Load iframe for PDF viewer
          var pdfjsframe = document.getElementById('pdfViewer');
          pdfjsframe.contentWindow.PDFViewerApplication.open(uint8Array);
          // pdfjsframe.width = '1200';
          // pdfjsframe.height ='1200';

          // //PDF viewer size
          $('#pdfModal', window.parent.document).width('65%');
          $('#pdfModal', window.parent.document).height('100%');
          $('#pdfViewer', window.parent.document).width('100%');
          $('#pdfViewer', window.parent.document).height('100%');

          // // var $window = $(pdfjsframe.contentWindow);
          // $('#pdfViewer').css('width', '100%'); //($window.height() * 0.85));
          // $('#pdfViewer').css('height', '1300px'); //($window.height() * 0.95));

          //Open modal
          //>>MaterializeCSS 1.0.0 approach w/o jQuery
          // var elem = document.querySelector('.modal');
          // var modal = M.Modal.getInstance(elem);
          // modal.open();

          //MaterializeCSS 0.100.2 approach w/ jQuery
          $('#pdfModal').modal('open');

        });
    },
    onFolderView: function (file, event) {
      const _this = this;

      //Only process if a folder...
      if (file.mimeType.includes('folder') && !this.isLoading && (this.folderId != file.id)) {
        this.isLoading = true;
        this.folderId = file.id;
        this.$http.get('/api/resources/' + file.id)
          .then((res) => {
            _this.path.push({ name: file.name, id: file.id });
            _this.files = res.data;

            //Format file size to KB etc.
            $.each(_this.files, function (index, file) {
              file.size = formatBytes(file.size);
            })

            _this.isLoading = false;
          }
          );
      }
    },
    onHelp: function (event) {
      $('#resourcesHelp').toggle(600);
    },
    onPDFLoad: function (iFrame) {
      iFrame.width = iFrame.contentWindow.document.body.scrollWidth;
      iFrame.height = iFrame.contentWindow.document.body.scrollHeight;
    },
    onSearch: function (event) {
      let searchText = $(event.target).val().trim();
      alert(searchText);
    }

  }
}

// #endregion



// #region Utility functions

function formatBytes(bytes, decimals) {
  if (bytes == 0) return '0 Bytes';
  let k = 1024,
    dm = decimals || 2,
    sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
    i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// #endregion

// #region Shared components

Vue.component('search-form-template', {
  template: '#search-form-template',
  data: function(){
    return {
      redirect: ''
    }
  },
  props: [
  ],
  computed: {
  },
  mounted: function(){
    // what section am I in? 
    // need to know so I can direct the results to the right page
    let parentPageName = this.$route.matched[0].name;

    // if the parent is admin, go to admin
    // if the parent is members, go to members
    // if the parent is anything other than admin, go to members
    if(parentPageName != 'admin'){
      this.redirect = 'members';
    } else {
      this.redirect = 'admin';
    }
  },
  methods: {
    search: function(){
      this.pushToRouter();
    },
    pushToRouter: function(){
      let val = $('#search').val().trim();

      this.$router.push({ 
        name: this.redirect + '-search', 
        params: {}, 
        query: {
          q: val
        }
      });
    }
  }
});

Vue.component('dropdown', {
  template: '#dropdown',
  props: [
    'status',
    'isAdmin',
    'statuses_array'
  ]
});

Vue.component('location', {
  template: '#view-location',
  props: ['item']
});

Vue.component('person', {
  template: '#view-person',
  props: ['item']
});

Vue.component('person-name', {
  template: '#view-person-name',
  props: ['item']
});

Vue.component('person-contact-info', {
  template: '#view-person-contact-info',
  props: ['item']
});

Vue.component('error', {
  template: '#error',
  props: ['error']
});

Vue.component('loading', {
  template: '#loading',
  props: ['status']
});

Vue.component('form-errors', {
  template: '#form-errors',
  props: ['errors']
});

// #endregion
