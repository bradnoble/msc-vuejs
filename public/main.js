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

// #endregion

// #region Members

// Members controller (parent controller of search, emails, downloads)
const members = {
  template: '#members',
  data: function () {
    return {
      searchstring: '',
      timer: null,
      statuses: []
    }
  },
  created: function () {
    var blacklist = ['deceased', 'non-member'];
    this.statuses = getStatuses(blacklist);
    document.title = "Membership List";
  },
  updated: function () {
    document.title = "Membership List";
  },
  methods: {
    search: function (event) {
      this.searchstring = event.trim();
      if (this.searchstring.length > 0) {
        this.$router.push({ name: 'member-name', params: {}, query: { q: this.searchstring } });
      } else {
        this.$router.push({ name: 'member-status', params: { status: 'all' } });
      }
    }
  }
}

// Member intro controller (first child of list)
const memberIntro = {
  template: '#member-intro',
  data: function () {
    return {
      items: [],
      updates: [],
      total: 0
    }
  },
  props: [
    'searchstring',
    'timer',
    'statuses'
  ],
  computed: {
    isAdmin: function () {
      return (this.$store.getters.roles.includes('admin'));
    }
  },
  mounted: function () {
    this.getStatusCounts();
    this.getLastUpdated();
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
      // /api/members/updated      
      let _this = this;
      this.$http.get('/api/members/updated')
        .then(
          function (res) {
            _this.updates = res.body.rows;
          }
        )
    },
    getStatusCounts: function () {
      let _this = this;
      this.$http.get('/api/members/statuses')
        .then(
          function (res) {
            _this.items = res.body.rows;
            _this.loading = false;

            // get total
            for (let i = 0; i < _this.items.length; i++) {
              _this.total = _this.total + _this.items[i].value;
            }

            // sort the statuses
            // https://stackoverflow.com/questions/1129216/sort-array-of-objects-by-string-property-value
            function compare(a, b) {
              if (a.value < b.value)
                return 1;
              if (a.value > b.value)
                return -1;
              return 0;
            }
            _this.items.sort(compare);

            // #region doughnut chart
            // commented out for now (11/15/2018)
            /*
            let datas = {};
            let datasets = [{data:[],backgroundColor:[]}];
            let labels = [];
            let colors = ["#0074D9", "#FF4136", "#2ECC40", "#FF851B", "#7FDBFF", "#B10DC9", "#FFDC00", "#001f3f", "#39CCCC", "#01FF70", "#85144b", "#F012BE", "#3D9970", "#111111", "#AAAAAA"];
  
  
            for(let i=0; i < _this.items.length; i++){
              // scrub out non-members
              if(_this.items[i].key != 'non-member' && _this.items[i].key != 'deceased'){
                datasets[0].data.push(_this.items[i].value);
                datasets[0].backgroundColor.push(colors[i]);
  //              labels.push(_this.items[i].key + ' (' + _this.items[i].value + ')');
                labels.push(_this.items[i].key);
                _this.total = _this.total + _this.items[i].value; 
              }
            }
            datas.datasets = datasets;
            datas.labels = labels;
  
            // And for a doughnut chart
            var ctx = document.getElementById("myChart");
            var myDoughnutChart = new Chart(ctx, {
                type: 'doughnut',
                data: datas,
                options: {
                  legend: {
                      labels: {
                        boxWidth: 20
                      },
                      display: true,
                      position: 'top'
                  },
                  title: {
                    display: true,
                    text: _this.total + ' people'
                  },
                  layout: {
                    padding: {
                        left: 0,
                        right: 0,
                        top: 0,
                        bottom: 0
                    }
                  }    
                }
            });
            */
            // #endregion chart
          }
        );
    }
  }
}

// Member search controller (second child of list)
const memberSearch = {
  template: '#member-search',
  props: [
    'searchstring',
    'timer',
    'statuses'
  ],
  computed: {
    isAdmin: function () {
      return (this.$store.getters.roles.includes('admin'));
    }
  },
  data: function () {
    return {
      items: [],
      loading: false
    }
  },
  mounted: function () {
    this.loading = true;
    this.search();
  },
  updated: function () {
    M.updateTextFields();
    $('.dropdown-trigger').dropdown();
  },
  watch: {
    '$route'(to, from) {
      this.loading = true;
      this.search();
    }
  },
  methods: {
    clearfromchild: function () {
      this.searchstring = '';
      this.$router.push({ name: 'members-status', params: { status: 'all' } });
    },
    onCsvDownload: function (status, event) {
      window.location.href = '/api/member/csv/' + status;
    },
    nameSearch: function (searchStr) {
      let _this = this;
      // if the page is loaded with a search query in the location bar, put it into the input
      _this.searchstring = _this.$route.query.q;

      if (_this.searchstring) {
        this.$http.get('/api/members?name=' + _this.searchstring)
          .then(
            function (res) {
              _this.items = res.data;
              _this.loading = false;
            }
          );
      } else {
        // TODO -- route to 'all'?
        _this.items = [];
        return;
      }
    },
    //Invokes search and routes based upoon search mode
    // necessary, called when the route changes both someone loads the view
    // and when someone enters a new search query
    search: function () {
      if (this.$route.params.status) {
        this.statusSearch();
      } else if (this.$route.query.q) {
        this.nameSearch();
      }
    },
    searchfromchild: function (e) {
      this.$emit('searched', this.searchstring)
      e.preventDefault();
    },
    statusSearch: function () {
      let _this = this;
      let status = _this.$route.params.status;
      // clear out the search input
      _this.searchstring = '';

      if (status) {
        this.$http.get('/api/members/status/' + status)
          .then(
            function (res) {
              _this.items = res.data.docs;
              _this.loading = false;
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
  template: '#member-emails',
  props: [
    'statuses'
  ],
  data: function () {
    return {
      emailsSelected: 'Select emails',
      items: [],
      loading: true,
      newsletter: ['active', 'inactive', 'life'],
      selected: {},
      selectedStatus: [],
      totalEmails: 0,
      querystring: '',
      query_array: []
    }
  },
  mounted: function () {
    // Get all emails by default when page loads
    this.getEmails();
  },
  updated: function () {
    M.textareaAutoResize($('#textarea-emails'));
    document.title = "Emails";
  },
  watch: {
    '$route.query.status'(to, from) {
      // when the querystring changes, do another search      
      this.getEmails();
    }
  },
  methods: {
    clearAll: function () { },
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
        this.$router.push({ name: 'member-emails' });
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
    getEmails: function () {
      let _this = this;
      _this.querystring = '';
      _this.loading = true;

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
        this.$http.get('/api/member/emails', obj)
          .then(function (resp) {
            let docs = [];
            let array = [];
            _this.totalEmails = resp.body.rows.length;

            // extract kv pairs from the function in factories.js
            docs = mapped(resp.body);

            // loop through docs to build an array that we will turn into a string
            for (let i = 0; i < docs.length; i++) {
              if (docs[i].email)
                array.push(docs[i].first + ' ' + docs[i].last + ' <' + docs[i].email + '>');
            }
            // turn the array into a string for the textarea in the page
            _this.items = array.join(', ');
            _this.loading = false;
          });
      } else {
        _this.totalEmails = 0;
        _this.items = "Use the group or status filters to build a list of email addresses."
        _this.loading = false;
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
  template: '#member-household',
  data: function () {
    return {
      item: {},
      back: ''
    }
  },
  beforeRouteEnter: function (to, from, next) {
    // conditional back button
    // helpful reference about how to use next(): 
    // https://medium.com/@allenhwkim/resolving-before-route-vuejs-d319b27576c3
    next(vm => {
      if (from.fullPath == '/') {
        vm.back = {
          name: 'member-intro'
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
    setPageTitle: function () {
      document.title = (this.item.name) ? this.item.name : 'View Household';
    },
    start: function () {
      _this = this;
      this.$http.get('/api/households/' + this.$route.params.id)
        .then(function (resp) {
          // console.log('start', resp)        
          _this.item = resp.data;
          _this.setPageTitle();
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

// #region Admin-Household

// list of households
const households = {
  template: '#households',
  data: function () {
    return {
      items: [],
      searchStr: '',
      loading: false
    }
  },
  created: function () {
    document.title = 'Households-MSC';
    this.loading = true;
    this.start();
  },
  mounted: function () {
    $('.dropdown-trigger').dropdown();
    // console.log("mounted on admin")   
  },
  updated: function () {
    $('.dropdown-trigger').dropdown();
    // console.log("updated on admin")   
  },
  methods: {
    start: function () {
      _this = this;
      this.$http.get('/api/households')
        .then(
          function (resp) {
            var data = resp.data;
            // create a string to search against
            for (i = 0; i < data.length; i++) {
              data[i].str = '';
              var array = [data[i].name];
              if (data[i].people && data[i].people.length > 0) {
                for (j = 0; j < data[i].people.length; j++) {
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
    search: function () {
      var str = this.searchStr.trim();
      var array = str.split(' ');

      // if the user deletes the search string, reset the list
      if (!str) {
        this.start();
      };

      //console.log(str)

      for (i = 0; i < this.items.length; i++) {
        // each item has its own counter
        var counter = 0;

        // if search terms have hits in the search string, increment the counter
        for (j = 0; j < array.length; j++) {
          if (this.items[i].str.toLowerCase().trim().indexOf(array[j].toLowerCase().trim()) > -1) {
            counter++
          }
        }

        // if these conditions are met, show the item
        // 1. is the counter more than zero, where it started?
        // 2. does counter equal the length of array of search terms?
        // (on 2 -- if true, every search term has a hit)
        if (counter > 0 && counter == array.length) {
          delete this.items[i].hide;
        } else {
          this.items[i].hide = true;
        }
      }
    }
  }
}

// parent view of people lists, forms to edit a person and edit a household
const household = {
  template: '#household',
  props: ['household_id'],
  data: function () {
    return {
      item: {},
      loading: true,
      error: ''
    }
  },
  created: function () {
  },
  mounted: function () {
    // grab the household data
    this.get();
  },
  updated: function () {
    let _this = this;
    $('.dropdown-trigger').dropdown();
    // console.log('parent updated')
    setTimeout(function () {
      _this.loading = false;
    }, 200);
  },
  watch: {
    '$route': function (to, from) {
      let _this = this;
      // after editing a person or household, update the household and the people
      if (from.name == 'person-edit' || from.name == 'person-new' || from.name == 'household-edit') {
        _this.get();
      }
    }
  },
  methods: {
    get: function () {
      const _this = this;

      this.$http.get('/api/households/' + _this.household_id)
        .then(function (resp) {
          _this.item = resp.data;
        }, function (error) {
          _this.error = error.data.error;
        });
    }
  }
};

// edit the household, child of households
const householdEdit = {
  template: '#household-edit',
  props: ['household_id', 'loading', 'error', 'item'],
  data: function () {
    return {
      title: {},
      errors: []
    }
  },
  created: function () { },
  mounted: function () {
    // if the route has a household_id, then this must be the edit mode
    if (this.household_id) {
      this.title = {
        icon: "edit",
        content: "Edit household contact info"
      };
    } else {
      this.title = {
        icon: "add",
        content: "Household contact info"
      };
    }
  },
  updated: function () { },
  methods: {
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
    save: function (e) {
      let _this = this;

      if (_this.item.people) {
        delete _this.item.people;
      };

      if (this.checkform()) {

        // starting label for the save button
        const txt = $('#save').text();
        // temporary message that shows
        $('#save').text('Saving...');

        this.$http.post('/api/household', _this.item)
          .then(function (resp) {
            // console.log('item', _this.item)
            setTimeout(function () {
              // revert the label of the save button
              $('#save').text(txt);
              //console.log(resp)
              // redirect to the summary tab
              _this.$router.replace({ name: 'admin-household', params: { household_id: _this.item._id } });
            }, 200);
          }, function (error) {
            console.log('error', error);
          }
          );
      }
      e.preventDefault();
    },
    remove: function (e) {
      let _this = this;
      var people = _this.item.people;

      //console.log(people.length)
      //console.log(people[0]._deleted)

      for (var i = 0; i < people.length; i++) {
        if (!people[i]._deleted) {
          Vue.set(people[i], '_deleted', true);
        } else {
          Vue.set(people[i], '_deleted', false);
        }
      }

      if (!_this.item._deleted) {
        Vue.set(_this.item, '_deleted', true);
      } else {
        //delete _this.item._deleted; // Vue.set(_this.item, '_deleted', true);        
      }
      // e.preventDefault();
    }
  }
}

// for creating a household
// not a child of adminHousehold
const householdNew = {
  template: '#household-new',
  data: function () {
    return {
      item: getNewHousehold()
    }
  },
  mounted: function () {
    $('.dropdown-trigger').dropdown();
  }
};

// #endregion

// #region Admin-Person

// IS USED??? list people, child of adminHousehold
const firstChild = {
  template: '#first-child',
  props: ['item'], // gotta use props to grab data from the parent
  data: function () {
    return {
    }
  },
  created: function () { },
  mounted: function () { },
  updated: function () { }
}

// edit a person, child of adminHousehold
const personEdit = {
  template: '#person-edit',
  props: ['household_id', 'person_id', 'loading', 'error'],
  data: function () {
    return {
      person: {},
      statuses: getStatuses(),
      genders: getGenders(),
      title: {},
      errors: []
    }
  },
  created: function () { },
  mounted: function () {
    // frob the process meter
    // the parent update method will turn it off when it completes
    this.$parent.loading = true;

    // for new people in the household
    if (this.$route.name == 'person-new') {
      this.title = {
        icon: "person_add",
        content: "Add a person to this household"
      };
      this.person = getPersonObject();
      // assign the new person to the household
      this.person.household_id = this.household_id;
    }
    // for editing people who are already in the household
    else {
      this.title = {
        icon: "edit",
        content: "Edit this person's entry"
      };
      // grab the person's data from the database
      this.get();
    }
  },
  updated: function () { },
  methods: {
    get: function () {
      let _this = this;
      this.$http.get('/api/person/' + _this.person_id)
        .then(function (resp) {
          _this.person = resp.data;
        }, function (error) {
          _this.$parent.error = error.data.error;
        }
        );
    },
    checkform: function () {
      this.errors = [];
      if (this.person.last.length > 0 && this.person.first.length > 0) {
        return true;
      }
      if (this.person.last == '' || this.person.first == '') {
        this.errors.push('Please provide a first and last name.')
      }
    },
    save: function (e) {
      let _this = this;

      if (this.checkform()) {

        // starting label for the save button
        var txt = $('#save').text();
        // temporary message that shows
        $('#save').text('Saving...');

        this.$http.post('/api/person/', _this.person)
          .then(function (resp) {
            setTimeout(function () {
              // revert the label of the save button
              $('#save').text(txt);
              // redirect to the summary tab
              _this.$router.replace({ name: 'admin-household', params: { household_id: _this.household_id } });
            }, 200);
          }, function (error) {
            console.log('error', error);
          }
          );

      }
      e.preventDefault();
    },
    removePerson: function () {
      let _this = this;
      Vue.set(_this.person, '_deleted', true);
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

Vue.component('location', {
  template: '#view-location',
  props: ['item']
});

Vue.component('person', {
  template: '#view-person',
  props: ['item']
});

Vue.component('household-person', {
  template: '#household-person',
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
