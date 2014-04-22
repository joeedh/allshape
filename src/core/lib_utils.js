"use strict";

/*
  Some notes on undo:
  
  Undoing the deletion of a datablock is potentially
  a very complex operation.  Since deleting a block unlinks
  (unsets all references to) it, undoing back to the former state
  would require performing that unlinking in reverse.  Since we
  can't use direct references to the data model to implement undo,
  we'd have to implement something like the datapath api, but considerable
  more complicated (re-inserting DAG nodes, for example, would be really tricky).  
  Testing it would be hellish, too.
  
  So for now, all tool ops that delete datablock must serialize the entire
  app state (minus the UI) in .undo_pre(), and restore it in .undo().  

  Another alternative is to store a copy of the app state at every X
  point in the toolstack (actually, we'd store a diff to the previous copy).
  That would lessen the penalty from rebuilding the previous state by
  re-executing the tool stack.  But it would also take more memory, and would
  still be too slow to use in most cases anyhow.
*/

/* 'DataBlock List.                         *
 *  A generic container list for datablocks */
class DBList extends GArray {
  constructor(type) {
    GArray.call(this);
    
    this.type = type;
    this.idmap = {};
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
    /*unparent*/
    for (var e in obj.dag_node.inmap["parent"]) {
      var node = e.opposite(obj).node;
      
      if (node instanceof ASObject)
        node.unparent(scene);
    }
    
    scene.objects.remove(obj);
    scene.graph.remove(obj);
    
    if (scene.active == obj)
      scene.active = scene.objects.length > 0 ? scene.objects[0] : undefined;
    
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


/*
  DataRefList.  A simple container for block references.
  Most of the API will accept either a block or a DataRef.
  
  __iterator__ will use the ids to fetch and return blocks,
  though.
*/
class DataRefList extends GArray, TPropIterable {
  constructor(lst=undefined) {
    GArray.call(this);
    
    this.datalib = undefined;
    
    if (lst == undefined)
      return;
    
    if (lst instanceof Array) {
      for (var i=0; i<lst.length; i++) {
        if (lst[i] == undefined) continue;
        
        this.push(lst[i]);
      }
    } else if ("__iterator__" in lst) {
      for (var b in lst) {
        this.push(b);
      }
    }
  }
  
  __iterator__() : DataRefListIter {
    return new DataRefListIter(this, new Context());
  }
  
  //we don't want all of ctx, just the current datalib
  set ctx(ctx) {
    this.datalib = ctx.datalib;
  }
  
  get ctx() {
    return undefined;
  }
  
  /*funnily enough, I didn't realize until now that my grammar
    can handle methods named 'get' or 'set'.  I didn't make
    them keywords because I didn't want to lose those two names
    for variables, but it's kindof cool I can use them for methods,
    too*/
  get(int i, Boolean return_block=true) {
    if (return_block) {
      var dl = this.datalib != undefined ? this.datalib : g_app_state.datalib;
      return dl.get(this[i]);
    } else {
      return this[i];
    }
  }
  
  push(Object b) {
    if (!(b = this._b(b))) return;
    
    if (b instanceof DataBlock)
      b = new DataRef(b);
    
    GArray.prototype.push.call(this, new DataRef(b));
  }
  
  _b(b) {
    if (b == undefined) {
      console.log("WARNING: undefined passed to DataRefList.push()");
      console.trace();
      return;
    }
    
    if (b instanceof DataBlock) {
      return new DataRef(b);
    } else if (b instanceof DataRef) {
      return b;
    } else {
      console.trace();
      console.log("WARNING: bad value ", b, " passed to DataRefList._b()");
    }
  }
  
  remove(b) {
    if (!(b = this._b(b))) return;
    var i = this.indexOf(b);
    
    if (i < 0) {
      console.trace();
      console.log("WARNING: ", b, " not found in this DataRefList");
      return;
    }
    
    this.pop(i);
  }
  
  pop(int i, Boolean return_block=true) {
    var ret = GArray.prototype.pop.call(this, i);
    
    if (return_block)
      ret = new Context().datalib.get(ret.id);
      
    return ret;
  }
  
  replace(a, b) {
    if (!(b = this._b(b))) return;
    
    var i = this.indexOf(a);
    if (i < 0) {
      console.trace();
      console.log("WARNING: ", b, " not found in this DataRefList");
      return;
    }
    
    this[i] = b;
  }
  
  indexOf(b) {
    Array.indexOf.call(this, b);
    
    if (!(b = this._b(b))) return;
    
    for (var i=0; i<this.length; i++) {
      if (this[i].id == b.id)
        return i;
    }
    
    return -1;
  }
 
  //inserts *before* index
  insert(int index, b) {
    if (!(b = this._b(b))) return;
    
    GArray.prototype.insert.call(this, b);
  }
  
  prepend(b) {
    if (!(b = this._b(b))) return;
    
    GArray.prototype.prepend.call(this, b);
  }
  
  static fromSTRUCT(reader) {
    var ret = {};
    reader(ret);
    
    return new DataRefList(ret.list);
  }
}

DataRefList.STRUCT = """
  DataRefList {
    list : array(i, dataref(DataBlock)) | this[i];
  }
"""
