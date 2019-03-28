// #region App Initialization

var cfenv = require("cfenv"),
  appEnv = cfenv.getAppEnv(),
  dotenv = require('dotenv').config(),
  express = require('express'),
  bodyParser = require('body-parser'),
  jsonParser = bodyParser.json(),
  Json2csvParser = require('json2csv').Parser,
  // Combinatorics = require('js-combinatorics'),
  opts = { url: process.env.URL }
  ;

// Initialize Cloudant
var cloudant = require('@cloudant/cloudant')(opts);
var db = cloudant.db.use("msc");

// Create a new Express application.
var app = express();
var http = require('http').Server(app);

//Define base directory for application. Use it by referencing '__basedir'
global.__basedir = __dirname;
//console.log('base=' + __basedir);

http.listen(appEnv.port, "0.0.0.0", function () {
  console.log("server starting on " + appEnv.url);     // print a message when the server starts listening
});

app.use(express.static(__dirname + '/public'));

// #endregion

// #region Authentication setup

let session = require("express-session");
let passport = require('passport');
let LocalStrategy = require('passport-local').Strategy;
//let flash = require('connect-flash');

//Disable to prevent info on server system
//app.disable('x-powered-by');

app.use(session({
  cookie: {
    //domain: 'localhost', TBD-set in env variable?
    httpOnly: true,
    path: '/'
  },
  name: 'msc.sid',
  resave: false,
  saveUninitialized: true,
  secret: "madriverglen"
}));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(passport.initialize());
app.use(passport.session());
// app.use(flash());

//Authentication initialization
let authentication = require('authentication');
//Initialize app users
authentication.users.init(process.env.users);

/*
* Setup Passport Local Strategy to authenticate and return user object
*/
passport.use(new LocalStrategy(
  function (username, password, callback) {
    authentication.users.exists(username, function (err, user) {
      if (err) { return callback(err); }
      if (!user) {
        return callback(null, false, { message: 'Incorrect username' });
      }
      if (user.password !== password) {
        return callback(null, false, { message: 'Incorrect password' });
      }
      return callback(null, user);
    });
  }
));

/*
* Serializes user info to cookie
*/
passport.serializeUser(function (user, callback) {
  callback(null, user.id);
});

/*
* Deserializes user info from cookie in server session store
*/
passport.deserializeUser(function (id, callback) {
  authentication.users.findById(id, function (err, user) {
    callback(err, user);
  });
});

// #endregion

// #region Login/Logout Endpoints

/*
* Login endpoint passes username and password as query string parameters
* and assigns to request body so Passport strategy will accept them
*/
app.get('/api/login', function (req, res, next) {

  //Assign credentials to request body for Passport strategy
  req.body.username = req.query.username;
  req.body.password = req.query.password;

  //Authenticate using Local Strategy
  passport.authenticate('local', function (err, user, info) {
    if (err) { return next(err); }
    if (!user) { return res.end(); }
    //    if (!user) { return res.redirect('/login'); }
    req.logIn(user, function (err) {
      if (err) { return next(err); }

      // res.cookie('msc-user', user,
      //   {
      //     expires: new Date(Date.now() + 900000),
      //     httpOnly: true
      //   }
      // );

      //Pass user object/data to client for local storage
      const userToReturn={...user};
      delete userToReturn.password;
      res.send(userToReturn);
      return res.end();
    });
  })(req, res, next);
});

/*
* Server login based upon ID
* Used by client to "silently" login user based upon cookie
*/
app.get('/api/login/:id', function (req, res, next) {

  //Check if valid user ID
  authentication.users.findById(req.params.id, function (err, user) {
    if (user) {
      delete user.password;

      //Login user to Passport
      req.logIn(user, function (err) {
        if (err) { return next(err); }

        // res.cookie('msc-user', user,
        //   {
        //     expires: new Date(Date.now() + 900000),
        //     httpOnly: true
        //   }
        // );

        //Indicates success
        res.send(true);
        return res.end();
      });

    } else {
      res.send(false);
    }
  });

});

/*
* Logout of Passport Local strategy
*/
app.get('/api/logout',
  function (req, res) {
    req.logout();
    res.clearCookie('msc-user');
    res.end();
  });

// #endregion

// #region Resoures Setup

//Google Drive module
var gdrive = require('gdrive');
//OAuth client local module for Google API
gdrive.oauthclient.init();
//Google Drive API
gdrive.api.init();

// #endregion

// #region Home Page Endpoint (authenticated users)

//MAY BE ABLE TO REMOVE THIS ENDPOINT
app.get('/',
  authentication.users.isAuthenticated,
  (req, res) => {
  }
);

// #endregion

// #region design docs stuff for managing Cloudant indexes

// https://stackoverflow.com/questions/38385101/couchdb-update-design-doc
const ddoc = {
  _id: "_design/foo",
  views: {
    by_status: {
      map: function (doc) {
        if (doc.type == 'person') {
          if (doc.status != 'non-member' && doc.status != 'deceased') {
            emit(doc.status, 1);
          }
        }
      },
      reduce: '_sum'
    },
    emails: {
      map: function (doc) {
        if(doc.type == 'person' && doc.email && doc.status && doc.first && doc.last) {
          emit(doc.status, 1)
        }
      }
    },
    last_updated: {
      map: function (doc) {
        if(doc.updated) {
          emit(doc.updated, 1);
        }
      }
    },
    householdsAndPeople: {
      map: function(doc){    
        if(doc.type == "household"){      
          emit([doc.type, doc.name, doc._id], 1);
        }    
        if(doc.type == "person"){      
          emit([doc.type, doc.household_id, doc.first], 1);
        }  
      }
    },
    join_people_to_household: {
      map: function(doc){    
        if(doc.type == "person" && doc.household_id){      
          emit(doc.household_id, 1);    
        }  
      }
    },
/*
    signups: {
      map: function (doc){
        var split = doc.arrive.split(\"T\");\n    split = split[0].split(\"-\");\n\n    // take out leading zeros from month and day here before parseInt\n    // http://stackoverflow.com/questions/8763396/javascript-parseint-with-leading-zeros\n\n    var arrive = [\n      parseInt(split[0], 10),\n      parseInt(split[1], 10),\n      parseInt(split[2], 10)\n      ];\n    if(doc.type == 'signup'){\n      emit(arrive, 1);\n    }\n  }"
    },
*/
    people: {
      map: function (doc) {    
        if (doc.type == "person"){      
          emit(doc._id, 1);    
        }  
      }
    },
    adminReport: {
      map: function(doc){
        if(doc.type == "person"){
          if(
            doc.first == '' || !doc.first 
            || doc.last == '' || !doc.last
          ){
            emit(doc._id, 1);
          }
        }
        if(doc.type == "household"){
          if(
            doc.name == '' || !doc.name 
            || doc.street1 == '' || !doc.street1
            || doc.zip == '' || !doc.zip
          ){
            emit(doc._id, 1);
          }
        }
      }
    }
  },
  indexes: {
    name: {
      analyzer: 'standard',
      index: function (doc) {
        if (doc.type == 'person') {
          if (doc.last) {
            index('default', doc.last, { "store": true });
          }
          if (doc.first) {
            index('default', doc.first, { "store": true });
          }
        }
      }
    },
    admin: {
      analyzer: 'standard',
      index: function (doc) {
        if (typeof doc.type === "string") {
          index('status', doc.status, { "store": true, "facet": true });
          index('type', doc.type, { "store": true, "facet": true });
          index('last', doc.last, { "store": true, "facet": true });
          index('first', doc.first, { "store": true });
          index('default', doc.last, { "store": true });
          index('default', doc.first, { "store": true });
        }
      }
    }
  }
};

// upload the design doc
db.get(ddoc._id, function (err, doc) {
  if (err) {
    //console.log('no ddoc');
    db.insert(ddoc, function (err, doc) {
      if (!err) {
        //console.log('success: inserted ddoc');
      }
      else {
        console.log('ddoc:' + err.reason);
      }
    });
  }
  else {
    ddoc._rev = doc._rev;
    db.insert(ddoc, function (err, doc) {
      if (!err) {
        //console.log('success: updated ddoc');
        //console.log(doc);
      }
      else {
        console.log('ddoc:' + err.reason);
      }
    });
  }
});

// build the Cloudant Query index for lookups by status
const query_index = {
  name: 'status',
  type: 'text',
  index: {},
  ddoc: 'query-index'
}

db.index(query_index, function (err, response) {
  if (err) {
    throw err;
  }
  //console.log('Index creation result: %s', response.result);
});

// #endregion

// #region Household Endpoints

/*
* Get a household by ID
*/
app.get('/api/households/:id',
  authentication.users.isAuthenticated,
  function (req, res) {
    // both admins and members can see these results
    if (authentication.users.isInRole(req, 'admin,member')) {
      db.get(req.params.id, function (err, doc) {
        if (!err) {
          // get the people of this householdsAndPeople
          db.view(
            'foo',
            'join_people_to_household',
            {
              'include_docs': true,
              'key': req.params.id
            },
            function (err, people) {
              if (!err) {
                var mapped = function (data) {
                  return data.rows.map(function (row) {
                    return row.doc; // this is the entire payload
                  });
                };
                // add people to the household
                doc.people = mapped(people);
                res.send(doc);
              }
            }
          );
          //console.log(doc);
          //res.send(doc);
        } else {
          return res.status(404).json({ "error": "Sorry, we don't have a household with that id." });
        }
      });
    } else {
      return res.status(401).json({ "error": "Sorry, you don't have permission to access households." });
    }
  });

// TODO: ADD ADMIN ONLY AUTH HERE
app.get('/api/households',
  authentication.users.isAuthenticated,
  function (req, res) {
    //db.view(designname, viewname, [params], [callback])
    db.view('foo', 'householdsAndPeople', { 'include_docs': true }, function (err, resp) {
      if (!err) {
        var mapped = function (data) {
          return data.rows.map(function (row) {
            return row.doc; // this is the entire payload
          });
        };
        // add people to the household
        var docs = mapped(resp);
        var households = [];
        var people = {};
        for (i = 0; i < docs.length; i++) {
          if (docs[i].type == 'person') {
            // build an object that holds objects that hold arrays of people
            if (!people[docs[i].household_id]) {
              people[docs[i].household_id] = [];
            }
            people[docs[i].household_id].push(docs[i]);
          } else if (docs[i].type == 'household') {
            households[i] = docs[i];
          }
          //console.log(people);
        }
        for (i = 0; i < households.length; i++) {
          var household_id = households[i]._id;
          households[i].people = [];
          households[i].people = people[household_id];
        }
        //console.log(docs[1]);
        res.send(households);
      }
    });
  }
);

app.post('/api/household',
  authentication.users.isAuthenticated,
  jsonParser,
  function (req, res) {
    if (authentication.users.isInRole(req, 'admin')) {
      var household = req.body;

      // if we're deleting a household, we should first delete the people
      if (household._deleted == true) {
        // using cloudant query
        db.find(
          {
            "selector": {
              "household_id": {
                "$eq": household._id
              }
            },
            "fields": [
              "_id",
              "_rev"
            ]
          }, function (err, data) {
            if (err) {
              throw err;
            }
            var people = [];

            //console.log('Found %d people in this household', data.docs.length);

            for (var i = 0; i < data.docs.length; i++) {
              data.docs[i]._deleted = true;
              people.push(data.docs[i]);
            }

            if (people.length > 0) {
              db.bulk({ docs: people }, function (err, docs) {
                if (!err) {
                  //console.log('deleted this many people', people.length);
                } else {
                  console.log('error deleting people', err.reason);
                }
              });
            }
          });
      }

      // datestamp the update
      household.updated = new Date().toISOString();

      // update the household      
      db.insert(household, function (err, doc) {
        if (!err) {
          //console.log('success updating household');
          res.send(doc);
        }
        else {
          console.log('household:' + err.reason);
          res.status(401).json({ "error": err.reason });
        }
      });

    } else {
      //console.log('not admin');
      return res.status(401).json({ "error": "Sorry, you don't have permission for this." });
    }
  });

app.post('/postHouseholdOld',
  authentication.users.isAuthenticated,
  jsonParser,
  function (req, res) {
    var role = req.user.role[0].value;
    if (role === 'admin') {

      var household = req.body,
        newPeople = [];
      // bulk insert people
      // todo: make sure this works when a household has zero people, even though that's very unlikely
      // might even wanna prevent saving a household until there's a person
      if (household.people.length > 0) {
        // update people in bulk
        db.bulk({ docs: household.people }, function (err, docs) {
          //db.insert(household.people[1], function(err, docs){
          if (!err) {
            //console.log(docs);
            // update the new people object with response, including _rev
            newPeople = docs;
            // don't push the people object into the household, b/c people are stored separately
            delete household.people;
            // update household
            db.insert(household, function (err, doc) {
              if (!err) {
                //console.log('success updating household, will add people to response next');
                // make sure there are no people in the household object
                doc.people = [];
                // append the updated people object to the household before sending the response
                doc.people = newPeople;
                //console.log(doc);
                res.send(doc);
              }
              else {
                console.log('household:' + err.reason);
              }
            });
          } else {
            console.log('people: ' + err.reason);
          }
        });
      }
    } else {
      //console.log('not admin');
      return res.status(401).json({ "error": "Sorry, you don't have permission for this." });
    }
  });

// #endregion

// #region Members Endpoints

// get last updated records, for the membership landing page
app.get('/api/members/updated',
  authentication.users.isAuthenticated,
  function (req, res) {
    db.view('foo', 'last_updated',
      {
        descending: true,
        include_docs: true,
        limit: 5
      },
      function (err, docs) {
        if (err) {
          console.log(err);
        }
        else {
          //console.log(docs);
          res.send(docs);
        }
      }
    );
  }
);

// get counts, for the membership landing page
app.get('/api/members/statuses',
  function (req, res) {
    db.view('foo', 'by_status',
      {
        reduce: true,
        group_level: 1
      },
      function (err, docs) {
        if (err) {
          console.log(err);
        }
        else {
          //console.log(docs);
          res.send(docs);
        }
      }
    );
  }
);

// get member emails
app.get('/api/member/emails',
  authentication.users.isAuthenticated,
  function (req, res) {

    var params = (req.query.statuses) ? req.query.statuses : null;
    let opts = {};

    //console.log('query: ', req.query.statuses);

    //Status values are passed in a comma delimited list and converted to an array
    if (req.query.statuses) {
      opts.keys = params.split(',');
    }

    //console.log(opts.keys);
    opts.include_docs = true;

    // get the results of the API call
    // can't use Cloudant Query here b/c CQ can't find docs where a field is present but not null
    // https://stackoverflow.com/questions/42974007/how-to-check-empty-value-in-an-attribute-in-the-cloudant-selector-query-when-the
    db.view('foo', 'emails',
      opts,
      function (err, resp) {
        if (!err) {
          //console.log('resp: ', resp);
          res.send(resp);
        } else {
          console.log('error', err);
          res.send(err);
        }
      }
    );
  }
);

/*
* Get a list of members based upon member status
*/
app.get('/api/members/status/:statusId',
  authentication.users.isAuthenticated,
  function (req, res) {

    if (req.params.statusId) {

      let status = req.params.statusId.toLowerCase();

      if (status === 'all') {
        selector = {
          "type": { "$eq": "person" },
          "$nor": [
            { "status": "deceased" },
            { "status": "guest" },
            { "status": "non-member" }
          ]
        };
      } else {
        selector = {
          "type": { "$eq": "person" },
          "status": {
            "$eq": status
          }
        };
      }

      // on sorting with Cloudant query
      // https://developer.ibm.com/answers/questions/229663/how-to-use-sort-when-searching-the-cloudant-databa.html
      // note the :string modifier on the field to be sorted
      const q = {
        selector: selector,
        fields: [],
        sort: [
          {
            "last:string": "asc"
          },
          {
            "first:string": "asc"
          }
        ],
        use_index: "status"
      };

      // since nodejs-cloudant 3.0, use promises instead of callbacks
      // https://github.com/cloudant/nodejs-cloudant/blob/master/CHANGES.md#300-2018-11-20
      db.find(q).then((data) => {
        res.send(data);
      }).catch((err) => {
        console.log(err);
      });

    }
  }
);

// get a list of members based upon member name(s)
app.get('/api/members',
  authentication.users.isAuthenticated,
  function (req, res) {

    //console.log('search query: ', req.query.name);

    if (req.query.name) {
      let namesArray = req.query.name.trim().split(' ');
      let nameStr = '';

      if (namesArray.length > 1) {
        // multiple words means drilling in
        // that means AND
        nameStr = namesArray.join('* && ');
      } else {
        // if there's only one item in the array, add wildcard
        nameStr = namesArray[0] + '*';
      }
      // in case the search term has more than word and the second word needs a wildcard
      nameStr += '*'

      db.search('foo', 'name', {
        q: nameStr,
        include_docs: true
      }, function (err, resp) {
        if (!err) {
          // get unnecessary objects out of the response
          var mapped = function (data) {
            return data.rows.map(function (row) {
              return row.doc;
            });
          };
          let docs = mapped(resp);
          res.send(docs)
        }
      }
      );
    } else {
      res.send();
    }
  }
);

// get a report of docs in the db that are missing required data
app.get('/api/admin/report',
  authentication.users.isAuthenticated,
  function (req, res) {
    
    let params = {
      include_docs: true,
      limit: 200,
    }

    if (req.query) {
      db.view('foo', 'adminReport',
        params
        , function (err, resp) {
          if (!err) {
            let docs = resp;
            res.send(docs)
          } else {
            console.log(err);
            res.send(err)
          }
        }
      );
    } else {
      res.send();
    }
  }
);


// get a list of members based upon member name(s)
app.get('/api/admin/search',
  authentication.users.isAuthenticated,
  function (req, res) {
    
    let obj = req.query;

    let querystring = req.query.q.trim();
    // convert default Lucene query from OR to AND
    // and add wildcards so that users don't have to get searches exactly right
    // 1. split the querystring into an array
    let queryarray = querystring.split(' ');
    // 2. add the wildcard operator to every element in the array
    queryarray = queryarray.map(function(e) {return e + '*'});
    // turn the array into one long string, with AND between the wildcard strings
    queryarray = queryarray.join(' AND ');

    obj.q = queryarray;

    let params = {
      include_docs: true,
      limit: 200,
      sort: ["last<string>","first<string>"], // https://developer.ibm.com/answers/questions/178330/sorting-cloudant-data-in-node-red/
      counts: [
        "status"
        // ,"type"
        // ,"last"
      ]
    }

    Object.assign(obj,params);

    if (req.query) {
      db.search('foo', 'admin',
        obj
        , function (err, resp) {
          if (!err) {
            let docs = resp;
            res.send(docs)
          } else {
            console.log(err);
            res.send(err)
          }
        }
      );
    } else {
      res.send();
    }
  }
);




/*
* Get a list of member data for use in a .csv file based upon  member status
*/
app.get('/api/member/csv/:status',
  //authentication.users.isAuthenticated,
  function (req, res) {
    if (true) { //authentication.users.isInRole(req, 'admin')) {

      var households = {},
        people = [],
        filename = '',
        datetime = new Date().toISOString(),
        fields = [
          "_id",
          "household_id",
          "first",
          "last",
          "status",
          "type",
          "email",
          "phone",
          "street1",
          "street2",
          "city",
          "state",
          "zip"
        ],
        blacklist = [
          "_id",
          "household_id",
          "type"
        ],
        status = req.params.status,
        selector_array = [
          { "status": { "$ne": "deceased" } },
          { "status": { "$ne": "non-member" } },
          { "status": { "$ne": "guest" } }
        ];

      if (status && status != 'all') {
        selector_array.push({ "status": { "$eq": status } });
      }

      db.find(
        {
          "selector": {
            "$or": [
              {
                "$and": [
                  {
                    "type": {
                      "$eq": "person"
                    }
                  },
                  {
                    "$and": selector_array
                  }
                ]
              },
              {
                "type": {
                  "$eq": "household"
                }
              }
            ]
          },
          "limit": 600,
          "fields": fields
        }, function (err, data) {
          if (err) {
            throw err;
          }
          // build an array of people, and a dictionary of households
          for (var i = 0; i < data.docs.length; i++) {
            if (data.docs[i].type == 'household') {
              data.docs[i].household_phone = data.docs[i].phone;
              households[data.docs[i]._id] = data.docs[i];
            } else if (data.docs[i].type == 'person') {
              people.push(data.docs[i]);
            }
          }

          // associate households from the dictionary to each person in the people array
          for (var i = 0; i < people.length; i++) {
            let household = households[people[i].household_id];
            if (household) {
              Object.assign(people[i], household);
            }
          }

          // remove unnecessary fields to make the spreadsheet pretty
          for (var i = 0; i < blacklist.length; i++) {
            var index = fields.indexOf(blacklist[i]);
            if (index !== -1) {
              fields.splice(index, 1);
            }
          }

          filename = 'MSC-Membership-List-' + status + '-' + datetime;

          // leading zeros get trimmed by Numbers/Excel when importing CSVs
          // the zeros are there in the CSV, though
          // here's how to fix it, from inside Numbers/Excel:
          // https://discussions.apple.com/thread/5303970?answerId=5303970021#5303970021
          const json2csvParser = new Json2csvParser({ fields });
          const csv = json2csvParser.parse(people);

          res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'X-Requested-With',
            'Content-Disposition': 'attachment;filename=' + filename + '.csv',
            'Content-Type': 'text/csv'
          });

          res.write(csv);
          res.end();
          
          // res.set('Content-disposition', 'attachment; filename=' + filename + '.csv');
          // res.set('Content-Type', 'text/csv');
          // res.status(200).send(csv);

        }
      );
    } else {
      return res.status(401).json({ "error": "Sorry, you don't have permission for this." });
    }
  }
);

// #endregion

// #region Person Endpoints

app.get('/api/person/:id',
  authentication.users.isAuthenticated,
  function (req, res) {
    if (authentication.users.isInRole(req, 'admin')) {
      // the factory passes the id of the document as a query parameter
      var id = req.params.id;
      db.get(id, function (err, doc) {
        if (!err) {
          res.send(doc);
        } else {
          return res.status(404).json(
            {
              "error": "Sorry, we don't have a record of this person."
            }
          );
        }
      });
    } else {
      return res.status(401).json({ "error": "Sorry, you don't have permission for this." });
    }
  }
);

app.post('/api/person',
  authentication.users.isAuthenticated,
  jsonParser,
  function (req, res) {
    if (authentication.users.isInRole(req, 'admin')) {
      var person = req.body;

      // datestamp the update
      person.updated = new Date().toISOString();

      db.insert(person, function (err, doc) {
        if (!err) {
          //console.log('success updating person, will add people to response next');
          //console.log(doc);
          res.send(doc);
        }
        else {
          console.log('household:' + err.reason);
        }
      });
    } else {
      //console.log('not admin');
      return res.status(401).json({ "error": "Sorry, you don't have permission for this." });
    }
  });

// #endregion

// #region Resources Endpoints

/*
*Displays root folders from MSC Google Drive
*/
app.get('/api/resources',
  authentication.users.isAuthenticated,
  (req, res) => {
    gdrive.api.setOAuthClient(gdrive.oauthclient.getOAuthClient());
    gdrive.api.getRoot((files) => {
      res.send(files);
    });
  });

/*
* Download Google Drive file
*/
app.get('/api/resources/download/:id',
  //FYI-can't authenticate because called to open another window
  // authentication.users.isAuthenticated, 
  (req, res) => {

    gdrive.api.setOAuthClient(gdrive.oauthclient.getOAuthClient());

    if (req.params.id !== undefined) {

      //Get file metadata w/ filename for d/l
      // let fileName;
      // gdrive.api.getFileMetaData(req.params.id, (metadata) => {
      //   //Get file name from metadata
      //   fileName = metadata.name;

      //Get file contents and d/l
      gdrive.api.getFile(req.params.id, res);
      // gdrive.api.getFile(req.params.id, res, () => {
      //   res.send();
      //   res.end();
      // });
    } else {
      res.end();
    }

  });

/*
* Export file a Google Drive file
*/
app.get('/api/resources/export/:id',
  authentication.users.isAuthenticated,
  (req, res) => {

    gdrive.api.setOAuthClient(gdrive.oauthclient.getOAuthClient());

    if (req.params.id !== undefined) {

      //Get file metadata w/ filename for d/l
      let fileName;
      gdrive.api.getFileMetaData(req.params.id, (metadata) => {
        fileName = metadata.name;

        //Setup response for file d/l
        res.writeHead(200, {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'X-Requested-With',
          'Content-Disposition': "attachment;filename='" + fileName + "'",
          'Content-Type': 'application/pdf'
        });

        //Get file contents and d/l
        gdrive.api.getFile(req.params.id, res, () => {
          res.send();
          res.end();
        });
      });
    } else {
      res.end();
    }

  });

/*
* Retrieve a list of GDrive metadata for a folder
*/
app.get('/api/resources/:folderId',
  authentication.users.isAuthenticated,
  (req, res) => {

    gdrive.api.setOAuthClient(gdrive.oauthclient.getOAuthClient());

    if (req.params.folderId !== undefined) {
      gdrive.api.listFilesByFolder(req.params.folderId, (files) => {
        res.send(files);
      });
    } else {
      res.send(null);
    }

  });

/*
* Retrieve a list of GDrive metadata based upon search text
*/
app.get('/api/resources/search/:searchText',
  authentication.users.isAuthenticated,
  (req, res) => {

    gdrive.api.setOAuthClient(gdrive.oauthclient.getOAuthClient());

    if (req.params.searchText !== undefined) {
      gdrive.api.findFiles(req.params.search, (files) => {
        res.send(files);
      });
    } else {
      res.send(null);
    }

  });

/*
* Retrieve Base64 file content
*/
app.get('/api/resources/pdf/:id',
  authentication.users.isAuthenticated,
  (req, res) => {

    gdrive.api.setOAuthClient(gdrive.oauthclient.getOAuthClient());

    if (req.params.id !== undefined) {
      res.writeHead(200, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'X-Requested-With',
        'Content-Type': 'application/pdf'
      });

      gdrive.api.getFileBase64(req.params.id, res, () => {
        res.send();
        res.end();
      });
    } else {
      res.end();
    }

  });

// #endregion

// #region Signup Endpoints

app.get('/getSignups',
  authentication.users.isAuthenticated,
  function (req, res) {
    var role = req.user.role[0].value;
    if (role === 'member' || role === 'admin') {
      //console.log(role);
      db.view('foo', 'signups', { 'include_docs': true }, function (err, doc) {
        if (!err) {
          res.send(doc);
        }
      });
    } else {
      //console.log('not admin');
      return res.status(401).json({ "error": "Sorry, you don't have permission for this." });
    }
  });

app.get('/getSignupChairs',
  authentication.users.isAuthenticated,
  function (req, res) {
    var role = req.user.role[0].value;
    if (role === 'admin') {
      //console.log(role);
      db.view('foo', 'signups', { 'include_docs': true }, function (err, doc) {
        if (!err) {
          res.send(doc);
        }
      });
    } else {
      //console.log('not admin');
      return res.status(401).json({ "error": "Sorry, you don't have permission for this." });
    }
  });

app.get('/getSignup/',
  authentication.users.isAuthenticated,
  function (req, res) {
    var role = req.user.role[0].value;
    if (role === 'member' || role === 'admin') {
      //console.log(role);
      // the factory passes the id of the document as a query parameter
      var doc = req.query.id;
      db.get(doc, function (err, doc) {
        if (!err) {
          res.send(doc);
        }
      });
    } else {
      //console.log('not admin');
      return res.status(401).json({ "error": "Sorry, you don't have permission for this." });
    }
  });

app.get('/editSignup/',
  authentication.users.isAuthenticated,
  function (req, res) {
    var role = req.user.role[0].value;
    if (role === 'admin') {
      //console.log(role);
      // the factory passes the id of the document as a query parameter
      var doc = req.query.id;
      db.get(doc, function (err, doc) {
        if (!err) {
          res.send(doc);
        }
      });
    } else {
      //console.log('not admin');
      return res.status(401).json({ "error": "Sorry, you don't have permission for this." });
    }
  });

app.get('/getPeople',
  function (req, res) {
    db.view('foo', 'people', { 'include_docs': true }, function (err, resp) {
      var mapped = function (data) {
        return data.rows.map(function (row) {
          var trimmed = {};
          trimmed._id = row.doc._id;
          trimmed.status = row.doc.status;
          trimmed.household_id = row.doc.household_id;
          trimmed.name = row.doc.first + ' ' + row.doc.last;
          return trimmed;
        });
      };

      var people = mapped(resp);
      if (!err) {
        res.send(people);
      }
      else {
        console.log(err);
      }
    });
  }
);

app.post('/update', jsonParser, function (req, res) {
  var doc = req.body;
  db.insert(doc, function (err, doc) {
    if (!err) {
      res.send(doc);
    }
    else {
      console.log('error saving doc');
    }
  });
});

// #endregion

// #region Utilities

//Append user roles to response data
function appendRoles(data) {
  if (data) {
    data.roles = authentication.users.roles;
  }
}

// #endregion
