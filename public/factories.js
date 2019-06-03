// function to convert a querystring into an array
// used in the emails section
const querystring_to_array = function(str){
  let array = [];
  if(str && typeof str == 'string'){
    array = [str];
  } 
return array;
}


// function to extract docs (ie, include_docs = true) from Cloudant results
const getDocs = function (data) {
  return data.rows.map(function (row) {
    return row.doc; 
  });
};

// build a breadcrumb for the page title tag <title>
const buildBreadcrumbForTitleTag = (matched) => {
  let breadcrumbs = ['MSC'];
  for(let i = 0; i < matched.length; i++){
    breadcrumbs.push(matched[i].meta.breadcrumb);
  }
  let title = breadcrumbs.join(' / ');
  // console.log(title);    
  document.title = title;
}

// each person can be one of these
var getStatuses = function(blacklist){
  var statuses = ['active','inactive','life','junior','child','non-member','applicant','honorary','deceased'];  
  if(blacklist){
    if(typeof blacklist == "string"){
      blacklist = [blacklist]
    }
    // remove unnecessary fields
    for (var i = 0; i < blacklist.length; i++) {
      var index = statuses.indexOf(blacklist[i]);
      if (index !== -1) {
        statuses.splice(index, 1);          
      }
    }
  }
  return statuses; 
}

// each person can be one of these
var getGenders = function(){
  return ['Male','Female'];
}

var docDefaults = function(type) {
  var now = new Date(),
    stamp = [
      type,
      now.getFullYear(),
      now.getMonth() + 1,
      now.getDate() + 1,
      now.getMilliseconds()
    ],
    obj = {
      _id: stamp.join('-'),
      type: type
    };

  return obj;
};

// to populate the component for the household form,
// each person needs to be loaded an object with keys but no values
var getPersonObject = function(){
  var array = ['first', 'last', 'email', 'status', 'phone', 'work_phone', 'dob', 'gender'];
  var obj = docDefaults('person');
  for(var i=0; i < array.length; i++){
    switch(array[i]) {
      case 'status':
        obj[array[i]] = getStatuses()[0];
        break;
      case 'gender':
        obj[array[i]] = getGenders()[0];        
        break;
      default:
        obj[array[i]] = '';
    } 
  }
  return obj;
};

const getNewHousehold = function(){
  let obj = docDefaults('household');
  let household = {
    "name": "",
    "label_name": "",
    "street1": "",
    "street2": "",
    "city": "",
    "state": "",
    "country": "",
    "zip": "",
    "phone": "",
    "mail_news": false,
    "mail_list": false
  };
  Object.assign(obj, household);
  return obj;
};

const setPageTitleTag = function(array){
  let domain = ['MSC'];
  document.title = domain.concat(array).join(' > ')
//  return domain.concat(array).join(' > ');
}