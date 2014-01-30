"use strict";

function DataRem(dst, field) {
  function rem() {
    src["field"] = undefined;
  }
  
  return rem;
}

//utility callback function used when loading files
function _Lib_GetBlock(DataBlock block, fieldname) {
  var id = block[fieldname];
  
  if (id == -1) {
    return undefined;
  } else {
    var b = g_app_state.datalib.get(id);
    
    if (b != undefined) {
      b.lib_adduser(block, DataRem(block, fieldname));
    } else {
      console.log("WARNING WARNING WARNING saved block reference isn't in database!!!");
    }
    
    return b;
  }  
}
