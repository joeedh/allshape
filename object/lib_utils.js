"use strict";

function DataArrayRem(dst, field, obj) {
  var array = dst[field];
  
  function rem() {
    array.remove(obj);
  }
  
  return rem;  
}

function SceneObjRem(scene, obj) {
  function rem() {
    scene.objects.remove(obj);
    scene.graph.remove(obj);
    
    if (scene.active == obj)
      scene.active = undefined;
    
    if (scene.selection.has(obj))
      scene.selection.remove(obj);
  }
  
  return rem;
}

function DataRem(dst, field) {
  function rem() {
    src["field"] = undefined;
  }
  
  return rem;
}

/*utility callback function used when loading files.

  block is a datablock,
  dataref is a [blockid, libid] array,
  fieldname is the name of the field in the datablock,
  refname is the tag name for the dataref,
  and rem_func is a function that is called
  when another object delinks itself from block
  
  refname, rem_func are optional, and default to 
  fieldname, DataRem(block, fieldname), respectively
*/
function _Lib_GetBlock(block, dataref, fieldname, add_user, refname, rem_func) {
  
  if (add_user == undefined)
    add_user = true;
  if (rem_func == undefined)
    rem_func = DataRem(block, fieldname);
  if (refname == undefined)
    refname = fieldname;
  
  var id = dataref[0];
  //var lib_id = dataref[1];
  
  if (id == -1) {
    return undefined;
  } else {
    var b = g_app_state.datalib.get(id);
    
    if (b != undefined) {
      if (add_user)
        b.lib_adduser(block, refname, rem_func);
    } else {
      console.log("WARNING WARNING WARNING saved block reference isn't in database!!!");
    }
    
    return b;
  }  
}
