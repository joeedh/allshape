"use strict";

/* 'DataBlock List.                         *
 *  A generic container list for datablocks */
class DBList extends GArray {
  constructor(type) {
    GArray.call(this);
    
    this.type = type;
    this.idmap = {}
    this.selected = new GArray();
    this.active = undefined;
    this.length = 0;
    
    //private variable
    this.selset = new set();
  }

  static fromSTRUCT(unpacker) {
    var dblist = new DBList(0);
    
    unpacker(dblist);
    
    var arr = dblist.arrdata;
    dblist.length = 0;
    
    //note that array data is still in dataref form
    //at this point
    for (var i=0; i<arr.length; i++) {
      GArray.prototype.push.call(dblist, arr[i]);
    }
    
    dblist.selected = new GArray(dblist.selected);
    
    //get rid of temp varable we used to store the actual
    //array data
    delete dblist.arrdata;
    return dblist;
  }

  toJSON() {
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

  static fromJSON(obj) {
    var list = new DBList(obj.type);
   
    list.list = new GArray(obj.list);
    list.selected = new GArray(obj.selected);
    list.active = obj.active;
    list.length = obj.length;
  }
  
  clear_select() {
    for (var block in this.selected) {
      block.flag &= ~SELECT;
    }
    
    this.selset = new set();
    this.selected = new GArray();
  }
  
  set_active(block) {
    if (block == undefined && this.length > 0) {
      console.trace();
      console.log("Undefined actives are illegal for DBLists, unless the list length is zero.");
      return;
    }
    
    this.active = block;
  }
  
  select(block, do_select=true) {
    if (!(block instanceof DataBlock)) {
      console.trace();
      console.log("WARNING: bad value ", block, " passed to DBList.select()");
      return;
    }
    
    if (do_select) {
      block.flag |= SELECT;
      
      if (this.selset.has(block)) {
        return;
      }
      
      this.selset.add(block);
      this.selected.push(block);
    } else {
      block.flag &= ~SELECT;
      
      if (!this.selset.has(block)) {
        return;
      }
      
      this.selset.remove(block);
      this.selected.remove(block);
    }
  }

  //note that this doesn't set datablock user linkages.
  data_link(block, getblock, getblock_us) {
    for (var i=0; i<this.length; i++) {
      this[i] = getblock(this[i]);
      this.idmap[this[i].lib_id] = this[i];
    }
    
    var sel = this.selected;
    for (var i=0; i<sel.length; i++) {
      sel[i] = getblock(sel[i]);
      this.selset.add(sel[i]);
    }
    
    this.active = getblock(this.active);
  }

  push(block) {
    if (!(block instanceof DataBlock)) {
      console.trace();
      console.log("WARNING: bad value ", block, " passed to DBList.select()");
      return;
    }
    
    GArray.prototype.push.call(this, block);
    this.idmap[block.lib_id] = block;
    
    if (this.active == undefined) {
      this.active = block;
      this.select(block, true);
    }
  }

  remove(block) {
    var i = this.indexOf(block);
    
    if (i < 0 || i == undefined) {
      console.log("WARNING: Could not remove block " + block.name + " from a DBList");
      return;
    }
    
    this.pop(i); 
  }

  pop(i) {
    if (i < 0 || i >= this.length) {
      console.log("WARNING: Invalid argument ", i, " to static pop()");
      print_stack();
      return;
    }
    
    var block = this[i];

    prior(DataBlock, this).pop.call(this, i);
    
    delete this.idmap[block.lib_id];
    
    if (this.active == block) {
      this.select(block, false);
      this.active = this.length > 0 ? this[0] : undefined;
    }
    
    if (this.selset.has(block)) {
      this.selected.remove(block);
      this.selset.remove(block);
    }
  }

  idget(id) {
    return this.idmap[id];
  }
}

DBList.STRUCT = """
  DBList {
    type : int;
    selected : array(dataref(DataBlock));
    arrdata : array(dataref(DataBlock)) | obj;
    active : dataref(DataBlock);
  }
""";

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
    dst["field"] = undefined;
  }
  
  return rem;
}

/*utility callback function used when loading files.

  dataref is a [blockid, libid] array,
  block is an optional datablock,
  fieldname is the name of the field in the datablock,
  refname is the tag name for the dataref,
  and rem_func is a function that is called
  when another object delinks itself from block
  
  refname, rem_func are optional, and default to 
  fieldname, DataRem(block, fieldname), respectively.
*/
function wrap_getblock_us(datalib) {
  return function(dataref, block, fieldname, add_user, refname, rem_func) {
    if (dataref == undefined) return;
    
    if (rem_func == undefined)
      rem_func = DataRem(block, fieldname);
      
    if (refname == undefined)
      refname = fieldname;
    
    var id = dataref[0];
    //var lib_id = dataref[1];
    
    if (id == -1) {
      return undefined;
    } else {
      var b = datalib.get(id);
      
      if (b != undefined) {
        if (add_user)
          b.lib_adduser(block, refname, rem_func);
      } else {
        console.log("WARNING WARNING WARNING saved block reference isn't in database!!!");
        console.log("  dataref: ", dataref);
        console.trace();
      }
      
      return b;
    }  
  };
}

function wrap_getblock(datalib) {
  return function(dataref) {
    if (dataref == undefined) return;
    
    var id = dataref[0];
    //var lib_id = dataref[1];
    
    if (id == -1) {
      return undefined;
    } else {
      var b = datalib.get(id);
      
      if (b != undefined) {
      } else {
        console.log("WARNING WARNING WARNING saved block reference isn't in database!!!");
        console.log("  dataref: ", dataref);
        console.trace();
      }
      
      return b;
    }
  }
}
