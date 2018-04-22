//Page init
$(function () {
  $('.dropdown-trigger').dropdown();
  $('.modal').modal();
  $('.tooltipped').tooltip();
  //>>MaterializeCSS 1.0.0 features
  // $('.tap-target').featureDiscovery();

  // Initialize collapse button
  // $(".button-collapse").sideNav({
  //   closeOnClick: true, // Closes side-nav on <a> clicks, useful for Angular/Meteor    
  // });
  // Initialize collapsible (uncomment the line below if you use the dropdown variation)
  //$('.collapsible').collapsible();

});

// 1. Define route components.
// These can be imported from other files
var editHousehold = {
  template: '#edit-household',
  data: function () {
    return {
      item: {},
      statuses: getStatuses(),
      genders: getGenders(),
      open: 'summary'
    }
  },
  created: function () {
    if (this.$route.params.id == "new") {
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
  mounted: function () {
    $('.collapsible').collapsible();
  },
  computed: {},
  methods: {
    setPageTitle: function () {
      document.title = (this.item.name) ? this.item.name : 'Edit Household';
    },
    start: function () {
      _this = this;
      this.$http.get('/getHousehold/',
        {
          id: this.$route.params.id
        })
        .then(function (resp) {
          // console.log('start', resp)        
          _this.item = resp.data;
          if (_this.item.people.length < 1) {
            _this.addPerson();
          }
          // change legacy values to use materialize switch
          _this.item.mail_news = (_this.item.mail_news == 'yes' || _this.item.mail_news == true) ? true : false;
          _this.item.mail_list = (_this.item.mail_list == 'yes' || _this.item.mail_list == true) ? true : false;
          _this.setPageTitle();
        }, function (error) {
          _this.item = {
            name: 'sorry!'
          }
        }
        );
    },
    killDOB: function (idx) {
      // console.log(idx)
      if (this.item.people[idx].status != 'child' || this.item.people[idx].status != 'junior') {
        this.item.people[idx].dob = '';
      }
    },
    loadTab: function (idx) {
      this.open = idx;
      /*
            https://vuejs.org/v2/guide/reactivity.html#Async-Update-Queue
            this.$nextTick(function () {
            })
      */
    },
    addPerson: function () {
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
    removePerson: function (index) {
      Vue.set(this.item.people[index], '_deleted', true);
    },
    saveMe: function (obj) {
      // starting label for the save button
      var txt = $('#save').text();
      // temporary message that shows
      $('#save').text('Saving...');
      // console.log(this.item.name, this.item)
      _this = this;
      this.$http.post('/postHousehold/', this.item)
        .then(function (resp) {
          // console.log('post', resp)        
          // todo: redirect to a fresh view of this
          // _this.$router.replace({ path: '/list/' })
          setTimeout(function () {
            // revert the label of the save button
            $('#save').text(txt);
            // update the data in the view 
            _this.start();
            // redirect to the summary tab
            _this.open = 'summary';
          }, 1000);
        }, function (error) {
          console.log('error', error);
        }
        );
    }
  },
  watch: {
    '$route'(to, from) {
      console.log('$route', to, from)
      this.start();
    }
  }
};

var adminPouch = {
  template: '#admin',
  data: function () {
    return {
      items: [],
      loading: false
    }
  },
  created: function () {
    document.title = 'Admin';
    this.loading = true;
    this.$http.get('/admin')
      .then(
        function (resp) {
          console.log(resp.data);
          /*
                    var doc = resp.data;
                    doc._id = "_local/config";
                    db.put(doc);
          */
        }
      );
    //    this.start();
  },
  methods: {
    start: function () {
      // this.items = {'hi':'yes'}
      _this = this;
      /*
            db.get('_local/config').then(function (doc) {
              console.log(doc);
              _this.items = doc;
            });
          */
    },
    destroy: function () {
      var doc = '_local/config';
      _this = this;

      db.get(doc).then(function (doc) {
        return db.remove(doc);
      }).then(function (result) {
        _this.start();
        // handle result
      }).catch(function (err) {
        console.log(err);
      });
    }
  }
};

var admin = {
  template: '#admin',
  data: function () {
    return {
      items: [],
      searchStr: '',
      loading: false
    }
  },
  created: function () {
    document.title = 'Admin';
    this.loading = true;
    this.start();
  },
  methods: {
    start: function () {
      _this = this;
      this.$http.get('/admin')
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

      console.log(str)

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


var list = {
  template: '#list',
  data: function () {
    return {
      items: [],
      searchStr: '',
      loading: false
    }
  },
  created: function () {
    document.title = 'List';
    this.loading = true;
    this.start();
  },
  methods: {
    start: function () {
      _this = this;
      this.$http.get('/list')
        .then(
          function (resp) {
            var data = resp.data;
            // create a string to search against
            for (i = 0; i < data.length; i++) {
              data[i].str = '';
              var array = [data[i].first, data[i].last, data[i].household.name, data[i].household.label_name];
              data[i].str = array.join(' ');
            }
            // update the view with the result
            _this.items = data;
            _this.loading = false;
          }
        );
    },
    clearSearchStr: function () {
      this.searchStr = '';
      this.start();
    },
    search: function () {
      var str = this.searchStr.trim();
      var array = str.split(' ');

      // if the user deletes the search string, reset the list
      if (!str) {
        this.start();
      } else if (str.length >= 3) {
        // console.log(str)

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
    },
    viewHousehold: function (household_id) {
      var container = household_id;
      console.log(container);
      $('.' + container).html('')
    },
    search_old: function () {
      var str = this.searchStr.trim();
      var array = str.split(' ');

      // if the user deletes the search string, reset the list
      if (!str) {
        this.start();
      };

      console.log(str)

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

var emails = {
  template: '#emails',
  data: function () {
    return {
      items: [],
      loading: true,
      statuses: getStatuses(),
      selected: {},
      emailsSelected: 'Select emails'
    }
  },
  created: function () {
    this.start();
    document.title = 'emails';
  },
  methods: {
    start: function () {
      _this = this;
      _this.loading = true;
      var params = {},
        // get keys out of the selected object
        keys = Object.keys(this.selected);

      // put the keys into a string, to send as params to the API
      params.statuses = (keys.length > 0) ? keys.join(',') : null;
      this.$http.get('/getEmails', params)
        .then(
          function (resp) {
            var data = resp.data.rows;
            var blob = '';

            var emails = data.map(function (row) {
              return row.value[0];
            })
            blob = emails.join(', ');
            // update the view with the result
            _this.items = blob;
            _this.loading = false;
            $('#emails').trigger('autoresize');
          }
        );
    },
    toggleStatus: function (status) {
      if (status) {
        if (!this.selected[status]) {
          this.selected[status] = true;
        } else {
          delete this.selected[status]
        }
      } else {
        this.selected = {};
      }
      // replace the entire object b/c we've deleted stuff
      // https://vuejs.org/v2/guide/reactivity.html
      this.selected = Object.assign({}, this.selected, this.selected);
      this.start();
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
};


var viewHousehold = {
  template: '#view-household',
  data: function () {
    return {
      item: {}
    }
  },
  created: function () {
    this.start();
  },
  methods: {
    setPageTitle: function () {
      document.title = (this.item.name) ? this.item.name : 'View Household';
    },
    start: function () {
      _this = this;
      this.$http.get('/getHousehold/',
        {
          id: this.$route.params.id
        })
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
      console.log('$route', to, from)
      this.start();
    }
  }
};

var logout = {
  template: '#logout',
  data: function () {
    return {
      item: {}
    }
  },
  created: function () {
    this.start();
  },
  methods: {
    setPageTitle: function () {
      document.title = (this.item.name) ? this.item.name : 'Logout';
    },
    start: function () {
      _this = this;
      this.$http.get('/logout')
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
  }
};

/*
* Resources: module (Google Drive)
*/
var resources = {
  template: '#resources',
  data() {
    return {
      path: [],
      files: []
    }
  },
  created() {
    document.title = 'Resources - MSC';
    this.init();
    this.start();
  },
  methods: {
    init: function () {
      let _this = this;
    },
    start: function () {
      this.$http.get('/resources')
        .then((res) => {
          this.path.push({ name: 'MSC Drive', id: '-1' });
          this.files = res.data;
        }
        );
    },
    onFolderView: function (file, event) {

      //Only process if a folder...
      if (file.mimeType.includes('folder')) {
        const _this = this;

        this.$http.get('/resources/' + file.id)
          .then((res) => {
            _this.path.push({ name: file.name, id: file.id });
            _this.files = res.data;

            //Format file size to KB etc.
            $.each(_this.files, function (index, file) {
              file.size = formatBytes(file.size);
            })

          }
          );
      }
    },
    onFileView: function (file, event) {

      const _this = this;

      this.$http.get('/resources/view/' + file.id)
        .then((res) => {
          console.log('Response back w/ PDF data');

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
    onPDFLoad: function (iFrame) {
      iFrame.width = iFrame.contentWindow.document.body.scrollWidth;
      iFrame.height = iFrame.contentWindow.document.body.scrollHeight;
    },
    onFileDownload: function (file, event) {
      window.open('/resources/download/' + file.id);
    },
    onBreadcrumb: function (id, event) {
      const _this = this;

      this.$http.get('/resources/' + id)
        .then((res) => {
          //Remove all folders below the selected one
          const index = _this.path.map(function (x) { return x.id; }).indexOf(id);
          _this.path.splice((index + 1));
          _this.files = res.data;
        }
        );
    },
    onSearch: function (event) {
      let searchText = $(event.target).val().trim();
      alert(searchText);
    }
  }
}

/*
 * Resources: Format bytes to KB, MB, etc. 
 */
function formatBytes(bytes, decimals) {
  if (bytes == 0) return '0 Bytes';
  let k = 1024,
    dm = decimals || 2,
    sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
    i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// 2. Define some routes
// Each route should map to a component. The "component" can
// either be an actual component constructor created via
// `Vue.extend()`, or just a component options object.
// We'll talk about nested routes later.
const routes = [
  {
    path: '/list',
    component: list,
    alias: '/'
  },
  {
    path: '/list/:id',
    components: {
      default: viewHousehold
    },
    props: true
  },
  { path: '/logout', component: logout },
  { path: '/admin', component: admin },
  { path: '/admin/household/:id', component: editHousehold, props: true },
  { path: '/admin/household/edit/:id', component: editHousehold, props: true },
  { path: '/admin/member/edit/:id', component: editPerson, props: true },
  { path: '/emails', component: emails },
  { path: '/list/turn-off/:id', component: editHousehold, props: true },
  { path: '/resources/:id?', component: resources },
]

// 3. Create the router instance and pass the `routes` option
// You can pass in additional options here, but let's
// keep it simple for now.
const router = new VueRouter({
  routes // short for `routes: routes`
});

Vue.component('location', {
  template: '#view-location',
  props: ['item']
});

Vue.component('person', {
  template: '#view-person',
  props: ['item']
});

Vue.component('admin-person', {
  template: '#admin-person',
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

var vm = new Vue({
  el: '#app',
  router
});

new Vue({
  el: 'title',
  data: {
    title: 'My Title'
  }
})
