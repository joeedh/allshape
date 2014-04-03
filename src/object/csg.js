"use strict";

typed class TypedClass {
  int type, flag, eid, value;
  float co[3], rot[3];
  
  constructor() {
    int a = 0;
  }
}

var TypedClass tst = new TypedClass();

var a = tst.type;
var b = tst.co[0];

class CSGNode extends GArray {
  constructor(ASObject ob, CSGNode par=undefined) {
    GArray.call(this);
    this.ob = ob;
    this.parent = par;
    this.mode = ob.csg_mode;
  }
  
  toString(int depth=0) {
    var t = "";
    for (var i=0; i<depth; i++)
      t += "  ";
    
    var s = "";
    
    s += t + this.ob.name 
    
    if (this.parent != undefined) {
      s += " " + csg_debug_names[this.mode]
    }
    
    if (this.length > 0) {
      s += " {\n";
      for (var c in this) {
        s += c.toString(depth+1);
      }
      s += t + "}\n";
    } else {
      s += "\n";
    }
    
    return s;
  }
  
  push(CSGNode child) {
    child.parent = this;
    GArray.prototype.push.call(this, child);
  }
  
  add(CSGNode child) {
    this.push(child);
  }
  
  remove(CSGNode child) {
    child.parent = undefined;
    GArray.prototype.remove.call(this, child);
  }
}

class CSGTreeList {
  constructor() {
    this.trees = new GArray();
    this.nodemap = {};
    this.flatlist = new GArray();
  }
  
  toString(ASObject ob) : String {
    s = "";
    s += "CSGTreeList {\n"
    for (var n in this.trees) {
      s += n.toString(1);
    }
    s += "}\n";
    
    return s;
  }
  
  has(ASObject ob) : Boolean {
    if (ob == undefined) {
      console.trace()
      console.log("Undefined ob passed to CSGTreeList.has()");
      return false;
    }
    
    return ob.lib_id in this.nodemap;
  }
  
  __iterator__(self) {
    return this.flatlist.__iterator__();
  }
  
  get(ASObject ob) : CSGNode{
    if (ob == undefined) {
      console.trace()
      console.log("Undefined ob passed to CSGTreeList.get()");
      return undefined;
    }
    
    return this.nodemap[ob.lib_id];
  }
  
  ensure(ASObject ob) : CSGNode {
    if (!this.has(ob)) {
      var node = new CSGNode(ob);
      this.add(node);
    }
    
    return this.get(ob);
  }
  
  add(CSGNode node, Boolean is_root=false) {
    this.nodemap[node.ob.lib_id] = node;
    
    if (is_root)
      this.trees.push(node);
    
    this.flatlist.push(node);
  }
  
  visit(CSGNode tree, func) {
    function recurse(node) {
      func(node);
      
      for (var c in tree) {
        recurse(c);
      }
    }
    
    recurse(tree);
  }
}

function sort_csg(Scene scene) {
  /*find csg roots.  these are objects
    tagged as csg either a) without parents,
    or b) whose parents are not themselves
    tagged as csg.*/
  
  /*helper functions*/
  function addnodes(ob, treelist) {
    var s = ob.dag_node.outmap["dep"];
    
    var n = treelist.get(ob);
    
    for (var e in s) {
      var dst = e.opposite(s).node;
      console.log("yay", dst.parent == ob);
      
      if (!dst.csg) continue;
      //if (!((dst instanceof ASObject) && dst.parent == ob)) continue;
      
      var n2 = treelist.ensure(dst, treelist.get(ob));
      n.add(n2);
      
      addnodes(dst, treelist);
    }
  }
  
  /*find roots*/
  var roots = new GArray()
  for (var ob in scene.objects) {
    if (!ob.csg) continue;
    if (ob.parent == undefined || !ob.parent.csg)
      roots.push(ob);
  }
  
  /*build CSG graph from roots*/
  var ret = new CSGTreeList();
  for (var ob in roots) {
    var node = new CSGNode(ob);
    
    ret.add(node, true);
    addnodes(ob, ret);
  }
  
  return ret;
}
