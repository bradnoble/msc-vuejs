//Page init
$(function () {
  $('.dropdown-trigger').dropdown();
  $('.dropdown-button').dropdown(); // chris do we need both of these?
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

const home = {
  template: '#home'
}
const list = {
  template: '#list'
}

const search = {
  template: '#search',
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
      } else if (str.length >= 1) {
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

const viewHousehold = {
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

const emails = {
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

const downloads = {
  template: '#downloads'
}


const logout = {
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
>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> ADMIN COMPONENTS
*/

// list of households
const admin = {
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
  mounted: function (){
    $('.dropdown-button').dropdown();     
    // console.log("mounted on admin")   
  },
  updated: function (){
    $('.dropdown-button').dropdown();     
    // console.log("updated on admin")   
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

// for creating a household
// not a child of adminHousehold
const newHousehold = {
  template: '#new-household',
  data: function(){
    return {
      item: getNewHousehold()
    }
  },
  mounted: function(){
    $('.dropdown-button').dropdown();        
  }
};

// parent view of people lists, forms to edit a person and edit a household
const adminHousehold = {
  template: '#admin-household',
  props: ['household_id'],
  data: function(){
    return {
      item: {},
      loading: true,
      error: ''
    }
  },
  created: function(){
  },
  mounted: function(){
    // grab the household data
    this.get();
  },
  updated: function(){
    $('.dropdown-button').dropdown();        
    let _this = this;
    // console.log('parent updated')
    setTimeout(function(){ 
      _this.loading = false;
    }, 200);      
  },
  watch: {
    '$route': function(to, from){ 
      let _this = this;
      if(from.name == 'editPerson' || from.name == 'editHousehold'){
        // after editing a person or household, update the household and the people
        _this.get();
      }
    }
  },
  methods: {
    get: function() {
      let _this = this; // need `_this` to cast and set `this` into the API call
      this.$http.get('/getHousehold/', {
        id: _this.household_id // can this be cast in via props?
      }).then(function(resp){
        _this.item = resp.data;
      }, function(error){
        _this.error = error.data.error;
      });
    }
  }
};

// list people, child of adminHousehold
const firstChild = {
  template: '#first-child',
  props: ['item'], // gotta use props to grab data from the parent
  data: function(){
    return {
    }
  },
  created: function() {},
  mounted: function(){},
  updated: function(){}
}

// edit a person, child of adminHousehold
const secondChild = {
  template: '#second-child',
  props: ['household_id', 'person_id', 'loading', 'error'],
  data: function(){
    return {
      person: {},
      statuses: getStatuses(),
      genders: getGenders(),
      title: {},
      errors: []
    }
  },
  created: function(){},
  mounted: function(){
    // frob the process meter
    // the parent update method will turn it off when it completes
    this.$parent.loading = true;

    // for new people in the household
    if(this.person_id == 'new' ){
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
  updated: function(){},
  methods: {
    get: function(){
      let _this = this;
      this.$http.get('/getPerson/', 
      {
        id: _this.person_id
      })
      .then(function(resp){
          _this.person = resp.data;
        }, function(error){
          _this.$parent.error = error.data.error;
        }
      );        
    },
    save: function(){
      let _this = this;
      
      // TODO get required fields
      // if conditions aren't met, add errors to the errors array
      //return _this.errors.push('this is an error');

      // starting label for the save button
      var txt = $('#save').text();
      // temporary message that shows
      $('#save').text('Saving...');
      this.$http.post('/postPerson/', _this.person)
        .then(function(resp){
          setTimeout(function(){ 
            // revert the label of the save button
            $('#save').text(txt);
            // redirect to the summary tab
            _this.$router.replace({ name:'admin-household', params: {household_id: _this.household_id} });
          }, 200);      
        }, function(error){
          console.log('error', error);
        }
      );
    },
    removePerson: function(){
      let _this = this;
      // Vue.set(_this.item, '_deleted', true);
      _this.person._deleted = true;
    }
  }
}

// edit the household, child of adminHousehold
const thirdChild = {
  template: '#third-child',
  props: ['household_id', 'loading', 'error', 'item'],
  data: function(){
    return {
      title: {},
    }
  },
  created: function(){},
  mounted: function(){
    // if the route has a household_id, then this must be the edit view
    if(this.household_id){
      this.title = {
        icon: "edit",
        content: "Edit this household contact info"
      };
    } else {
      this.title = {
        icon: "add",
        content: "Add a household"
      };      
    }
  },
  updated: function(){},
  methods: {
    save: function(){
      let _this = this;
      // starting label for the save button
      const txt = $('#save').text();
      // temporary message that shows
      $('#save').text('Saving...');
      this.$http.post('/postHousehold/', _this.item)
        .then(function(resp){
          // console.log('item', _this.item)
          setTimeout(function(){ 
            // revert the label of the save button
            $('#save').text(txt);
            // redirect to the summary tab
            _this.$router.replace({ name:'admin-household', params: {household_id: _this.item._id} });
          }, 200);      
        }, function(error){
          console.log('error', error);
        }
      );
    },
    remove: function(){
      let _this = this;
      var people = _this.$parent.item.people;
      for(i=0; i < people.length; i++){
        // people[i]._deleted = true;
        if(people[i]._deleted){
          delete people[i]._deleted;
        } else {
          Vue.set(people[i], '_deleted', true);
        }
      }
      Vue.set(_this.item, '_deleted', true);
      // _this.item._deleted = true;
    }
  }
}







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





/*
>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> REUSABLE COMPONENTS
*/

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

Vue.component('error', {
  template: '#error',
  props: ['error']
});

Vue.component('loading', {
  template: '#loading',
  props: ['status']
});



// TODO handle page titles
new Vue({
  el: 'title',
  data: {
    title: 'My Title'
  }
})
