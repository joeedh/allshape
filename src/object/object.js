"use strict";

#include "src/core/utildefine.js"

var RecalcFlags = {
  TRANSFORM : 1,
  DATA_COS  : 2,
  DATA      : 4
};

var ObFlags = {
  //1 is reserved for BlockFlags.SELECT 
  SUBSURF: 2,
  DISP_BB: 4,
  CSG:     8,
};

var CsgModes = {
  INTERSECT : 0,
  SUBTRACT  : 1,
  UNION     : 2
}

var csg_debug_names = {
  0 : "isc",
  1 : "sub",
  2 : "uni"
}

var RotTypes = {EULER: 0};
var BBDispTypes = {BOX: 1, SPHERE: 2, CYLINDER: 3, CONE: 4, VIEWCIRCLE: 5};

//evil!
class DimArray {
  constructor(Array<float> dim, ASObject ob) {
    this.length = 0;
    this.dim = new Vector3(dim);
    this.ob = ob;
  }
  
  set 0(float val) : float {
    this.dim[0] = val;
    this.ob.ctx_bb = this.dim;
  }
  set 1(float val) : float {
    this.dim[1] = val;
    this.ob.ctx_bb = this.dim;
  }
  set 2(float val) : float {
    this.dim[2] = val;
    this.ob.ctx_bb = this.dim;
  }

  get 0() : float {
    return this.dim[0];
  }
  get 1() {
    return this.dim[1];
  }
  get 2() {
    return this.dim[2];
  }
}

class ASObject extends DagNode {
  constructor(data, name) {
    //name is optional
    if (name == undefined)
      name = "Object";
    
    DataBlock.call(this, DataTypes.OBJECT, name);
    DagNode.call(this);
    
    //override DagNode's __hash__
    this.__hash__ = DataBlock.prototype.__hash__;
    
    this.scene = undefined : Scene;
    this.recalcflag = 0;
    
    this.csg_mode = CsgModes.SUBTRACT;
    
    this.dag_node.add_sockets("i", [
      new DepSocket("parent", this),
      new Matrix4Socket("multipliers", this) //allow multiple inputs
    ]);

    this.dag_node.add_sockets("o", [
      new Matrix4Socket("matrix", this, "matrix"),
      new DepSocket("dep", this)
    ]);
    
    this.flag = 0;
    this.ss_mesh = undefined;
    this.ss_steps = 24;
    this.last_ss_steps = this.ss_steps;
    
    this.loc = new Vector3();
    this.rot_euler = new Vector3();
    this.size = new Vector3([1.0, 1.0, 1.0]);
    
    this.rot_method = RotTypes.EULER;
    
    this.matrix = new Matrix4();
    
    //matrix to offset object within parent space
    //created when parent is assigned.
    this.parentinv = new Matrix4(); 
    
    //bounding box stuff
    this.bb = new MinMax(3);
    this.bb_display = BBDispTypes.Box;
    
    this.parent = undefined : ASObject;
    this._data = data;
    
    this.octree = undefined;
    
    this.layermask = 0x7FFFFFFF;
    this.sid = -1; //only set when obj is added to database
  }
  
  get data() {
    return this._data;
  }
  
  set data(Mesh data) {
    if (this._data != undefined && this._data != data && 
        !(this._data instanceof DataRef) && !(this._data instanceof Array)) 
    {
      this._data.remove_callback(this);
      //
      //don't handle reference counting automatically,
      //not without having the rest of the code do it
      //too.  for now, at least.
      //this._data.lib_remuser(this, "data");
    }
    
    this._data = data;
    
    if (data == undefined || (data instanceof DataRef) || (data instanceof Array))
      return;
    
    //add octree update callback
    var this2 = this;
    function octree_callback(owner, mesh, event) {
      if (event & (MeshRecalcFlags.REGEN_TESS|MeshRecalcFlags.REGEN_COS)) {
        this2.octree = undefined; //flag octree for recalc;
      }
    }
    
    this._data.update_callback(this, octree_callback);
  }
  
  /*this property implements the "dimensions" panel, 
    for resizing objects or, if in a geometry select
    mode, resizing the selection*/
  get ctx_bb() {
    if (this.data == undefined || !(this.data instanceof Mesh)) {
     console.trace("error in ctx_bb");
     return new Vector3();
    }
    
    var m = this.data;
    var bb = m.bb;
    
    var vec = new Vector3();
    vec.load(bb.max).sub(bb.min);
    vec.multVecMatrix(this.matrix);
    
    return new DimArray(vec, this);
  }
  
  set ctx_bb(Vector3 val) {
    var cur = this.ctx_bb;
    
    //sanity checks
    if (cur[0] == 0) cur[0] = 1;
    if (cur[1] == 0) cur[1] = 1;
    if (cur[2] == 0) cur[2] = 1;
    
    static size = new Vector3();
    
    console.log("size", JSON.stringify(val));
    
    size.load(val).divideVect(cur);
    this.size.mul(size);
    this.recalc(RecalcFlags.TRANSFORM);
    
    //okay.  need a way to interface data api with the undo
    //system.
    console.log("dimension edit!");
  }
  
  regen_octree() {
    if (DEBUG.octree)
      console.log("redoing octree");
    if (this.ss_mesh != undefined) {
      this.octree = build_octree_ss(this.ss_mesh);
    } else {
      this.octree = build_octree(this.data);
    }
  }
  
  get_octree() {
    if (this.octree == undefined) {
      this.regen_octree();
    }
    
    return this.octree;
  }
  
  copy() : ASObject {
    var ob = new ASObject(this.data, this.name);
    
    ob.loc = new Vector3(this.loc);
    ob.rot_euler = new Vector3(this.rot_euler);
    ob.size = new Vector3(this.size);
    ob.rot_method = this.rot_method;
    ob.parent = this.parent;
    ob.layermask = this.layermask;
    ob.scene = this.scene;
    ob.bb = [new Vector3(ob.bb[0]), new Vector3(ob.bb[1])];
    ob.bb_display = this.bb_display;
    ob.matrix = new Matrix4(this.matrix);
    ob.parentinv = new Matrix4(this.parentinv);
    ob.flag = this.flag;
    ob.ss_steps = this.ss_steps;
    
    return ob;
  }
  
  get aabb() {
    return this.bb;
  }
  
  on_add(DataLib lib) {
    this.sid = ibuf_idgen.gen_id();
  }

  static fromSTRUCT(unpacker) {
    var ob = new ASObject(undefined, "");
    
    unpacker(ob);
    ob.init_from_pack();
    
    return ob;
  }
  
  on_gl_lost(WebGLRenderingContext new_gl) {
    if (this.subsurf) {
      this.ss_mesh = undefined;
    }
  }
  
  calc_ss_steps() : int {
    var steps = Math.floor(this.ss_steps / Math.log(this.data.faces.length))+1.0;
    
    if (IsMobile && steps > 5)
      steps = Math.floor(steps*0.5);
    
    steps = Math.max(steps, 3.0);
    
    return steps;
  }

  get csg() {
    return !!(this.flag & ObFlags.CSG);
  }
  
  set csg(val) {
    if (val)
      this.flag |= ObFlags.CSG;
    else 
      this.flag &= ~ObFlags.CSG;
  }
  
  get subsurf() {
    return !!(this.flag & ObFlags.SUBSURF);
  }
  
  set subsurf(val) {
    if (!!val != !!(this.flag & ObFlags.SUBSURF)) {
      this.octree = undefined; //flag octree for regen
    }
    
    if (val)
      this.flag |= ObFlags.SUBSURF;
    else 
      this.flag &= ~ObFlags.SUBSURF;
  }
  
  dag_execute() {
    var mat = this.matrix = this.basic_matrix();
    //console.log("executing ASOBject[" +this.lib_id+"] dag_execute");
    
    if (this.parent != undefined) {
      mat.multiply(this.parentinv);
      mat.multiply(this.parent.matrix);
    }
    
    for (var ms in this.dag_node.inmap["multipliers"].edges) {
      var mat2 = ms.src.get_data();
      mat.multiply(mat2);
    }
  }

  basic_matrix() {
    var mat = new Matrix4();
    
    mat.rotate(this.rot_euler[0], this.rot_euler[1], this.rot_euler[2]);
    mat.scale(this.size[0], this.size[1], this.size[2]);
    mat.translate(this.loc[0], this.loc[1], this.loc[2]);
    
    return mat;
  }

  gen_rot_matrix() {
    var mat = new Matrix4();
    
    mat.rotate(this.rot_euler[0], this.rot_euler[1], this.rot_euler[2]);
    
    return mat;
  }

  pack(data) {
    prior(ASObject, this).pack.call(this, data);
    
    pack_int(data, this.flag);
    pack_vec3(data, this.loc);
    pack_vec3(data, this.rot);
    pack_vec3(data, this.size);
    pack_int(data, this.rot_method);
    pack_int(data, this.layermask);
    
    pack_dataref(data, this.parent);
    
    if (this.parent != undefined)
      pack_datablock(data, this.parent);
    
    pack_matrix4(data, this.matrix);
    pack_matrix4(data, this.parentinv);
    
    this.data.pack(data);  
  }

  unpack(data, uctx) {
    prior(ASObject, this).unpack.call(this, data, uctx);
    
    this.flag = unpack_int(data, uctx);
    this.loc = unpack_vec3(data, uctx);
    this.rot = unpack_vec3(data, uctx);
    this.size = unpack_vec3(data, uctx);
    this.rot_method = unpack_int(data, uctx);
    this.layermask = unpack_int(data, uctx);
    
    this.parent = unpack_dataref(data, uctx);
    this.matrix = unpack_mat4(data, uctx);
    this.parentinv = unpack_mat4(data, uctx);
    this.imatrix = new Matrix4(this.matrix);
    this.imatrix.invert();
    
    //hrm, need to unpack 'this.data' still
  }

  data_link(block, getblock, getblock_us) {
    
    //this should automatically add user to parent, with default callbacks
    this.parent = getblock_us(this.parent, this, "parent");
    this.data = getblock_us(this.data, this, "data");
  }

  unparent(scene) {
    scene.graph.socket_clear_str(this, "parent", "i");
    
    if (this.parent != undefined) {
      this.parent.lib_remuser(this, "parent");
    }
    
    this.parent = undefined;
    this.parentinv = new Matrix4();
  }

  set_parent(scene, newpar, preserve_child_space=false) {
    //preserve_child_space defaults to False
    //if true, it calculates a special pre-multiplication
    //matrix (this.parentinv) such that the object's post-parent
    //position/location/size is the same as pre-parent.
    
    if (this.parent == newpar && newpar != undefined) {
      console.log("parent already set; resetting DAG relationships. . .");
      this.unparent(scene);
      preserve_child_space = false;
    }
    
    if (newpar == undefined) {
      console.log("Warning: unparent with obj.unparent(scene), not obj.set_parent(scene, undefined)!");
      if (this.parent != undefined) {
        this.unparent(scene);
      }
      return;
    }
    
    if (this.parent != undefined) {
      this.unparent(scene);
    }
    
    if (preserve_child_space) {
      this.parentinv = new Matrix4(newpar.matrix);
      this.parentinv.invert();
    }
    
    scene.graph.connect(newpar, "dep", this, "parent");
    this.lib_adduser(this, "parent", DataRem(this, "parent"));
    this.parent = newpar;
  }
  
  from_matrix(Matrix4 mat) {
    //set loc/rot/co
  }
  
  recalc(flag) {
    this.dag_update();
    this.recalcflag |= flag;
  }
}

ASObject.STRUCT = STRUCT.inherit(ASObject, DataBlock) + """
  matrix      : mat4;
  parentinv   : mat4;
  loc         : vec3;
  rot_euler   : vec3;
  rot_method  : int;
  size        : vec3;
  flag        : int;
  data        : dataref(DataBlock);
  parent      : dataref(ASObject);
  layermask   : int;
  bb          : array(vec3);
  bb_display  : int;
  scene       : dataref(Scene);
  ss_steps    : int;
  csg_mode    : int;
}
""";
