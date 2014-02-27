"use strict";

#ifdef THREAD_WORKER
/*check for various api calls that aren't implemented by all browsers*/
if (String.prototype.startsWith == undefined) {
  String.prototype.startsWith = function(str) {
    if (str.length > this.length)
      return false;
      
    for (var i=0; i<str.length; i++) {
      if (this[i] != str[i])
        return false;
    }
    
    return true;
  }
}

if (String.prototype.endsWith == undefined) {
  String.prototype.endsWith = function(str) {
    if (str.length > this.length)
      return false;
      
    for (var i=0; i<str.length; i++) {
      if (this[this.length-str.length+i] != str[i])
        return false;
    }
    
    return true;
  }
}

//this needs to be converted to use regexpr's
if (String.prototype.contains == undefined) {
  String.prototype.contains = function(str) {
    if (str.length > this.length)
      return false;
      
    for (var i=0; i<this.length - str.length + 1; i++) {
      var found = true;
      for (var j=0; j<str.length; j++) {
        if (this[i+j] != str[j]) {
          found = false;
          break;
        }
      }
      
      if (found)
        return true;
    }
    
    return false;
  }
}

//we probably should get rid of this function
String.prototype.find = function(str) {
  if (str.length > this.length)
    return false;
    
  for (var i=0; i<this.length - str.length + 1; i++) {
    var found = true;
    for (var j=0; j<str.length; j++) {
      if (this[i+j] != str[j]) {
        found = false;
        break;
      }
    }
    
    if (found)
      return i;
  }
  
  return -1;
}

function define_worker_interface(workers) {
  return function(event) {
    var data = event.data.evaluated;
    
    workers[data.method](data.data);
    postMessage("{{terminate}}");
  }
}
#else
function define_worker_interface(workers) {
  return function(event) { };
}
#endif
