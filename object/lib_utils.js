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

/*generic container list for datablocks*/
function DBList(type) {
  this.type = type;
  this.idmap = {}
  this.list = new GArray();
  this.selected = new GArray();
  this.active = undefined;
  this.length = 0;
  
  //private variable
  this.selset = {};
}
create_prototype(DBList);

DBList.prototype.toJSON = function() {
  var list = [];
  var sellist = [];
  
  for (var block in this) {
    list.push(block.lib_id);
  }
  
  for (var block in this.selected) {
    sellist.push(block.lib_id);
  }
  
  var obj = {
    list : list,
    selected : sellist,
    active : this.active != undefined ? this.active.lib_id : -1,
    length : this.length,
    type : this.type
  };
  
  return obj;
}

DBList.fromJSON = function(obj) {
  var list = new DBList(obj.type);
 
  list.list = new GArray(obj.list);
  list.selected = new GArray(obj.selected);
  list.active = obj.active;
  list.length = obj.length;
}

DBList.prototype.data_link = function(getblock) {
  
}

DBList.prototype.add = function(block) {
  this.list.push(block);
  this.idmap[block.lib_id] = block;
  
  if (this.active == undefined) {
    this.active = block;
  }
  
  this.length++;
}

DBList.prototype.remove = function(block) {
  var i = this.list.indexOf(block);
  
  if (i < 0 || i == undefined) {
    console.log("WARNING: Could not remove block " + block.name + " from a DBList");
    return;
  }
  
  this.list.pop(i);
  delete this.idmap[block.lib_id];
  
  if (this.active == block) {
    this.active = this.list.length > 0 ? this.list[0] : undefined;
  }
  
  if (block.lib_id in this.selset) {
    this.selected.remove(block);
    delete this.selset[block.lib_id];
  }
  
  this.length--;
}

DBList.prototype.pop = function(i) {
  if (i < 0 || i >= this.length)
    return;
  
  var block = this.list[i];
  this.list.pop(i);
  
  delete this.idmap[block.lib_id];
  
  if (this.active == block) {
    this.active = this.list.length > 0 ? this.list[0] : undefined;
  }
  
  if (block.lib_id in this.selset) {
    this.selected.remove(block);
    delete this.selset[block.lib_id];
  }
  
  this.length--;
}

DBList.prototype.__iterator__ = function() {
  return this.list.__iterator__();
}

DBList.prototype.get = function(id) {
  return this.idmap[id];
}