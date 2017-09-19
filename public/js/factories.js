// each person can be one of these
var getStatuses = function(){
  return ['active','inactive','life','junior','child','non-member']; 
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

// to populate the compoenent for the household form,
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

var getNewHousehold = function(){
  var obj = docDefaults('household');
  obj.people = [];
  return obj;
};
