"use strict";

var RecalcFlags = {
  TRANSFORM : 1,
  DATA_COS  : 2,
  DATA      : 4
};

var ObFlags = {
  //1 is reserved for BlockFlags.SELECT 
  SUBSURF: 2,
  DISP_BB: 4
};

var RotTypes = {EULER: 0};
var BBDispTypes = {BOX: 1, SPHERE: 2, CYLINDER: 3, CONE: 4, VIEWCIRCLE: 5};

class ASObject extends DagNode {
  constructor(data, name) {
    //name is optional
    if (name == undefined)
      name = "Object";
    
    DataBlock.call(this, DataTypes.OBJECT, name);
    DagNode.call(this);
    
    this.scene = undefined : Scene;
    this.recalcflag = 0;
    
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
    this.last_ss_steps = 24;
    
    this.loc = new Vector3();
    this.rot_euler = new Vector3();
    this.size = new Vector3([1.0, 1.0, 1.0]);
    
    this.rot_method = RotTypes.EULER;
    
    this.matrix = new Matrix4();
    
    //matrix to offset object within parent space
    //created when parent is assigned.
    this.parentinv = new Matrix4(); 
    
    //bounding box stuff
    this.bb = [new Vector3(), new Vector3()];
    this.bb_display = BBDispTypes.Box;
    
    this.parent = undefined : ASObject;
    this.data = data;
    
    this.layermask = 0x7FFFFFFF;
    this.selbuf_id = -1; //only set when obj is added to database
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
  
  get_aabb() {
    return this.bb;
  }
  
  on_add(DataLib lib) {
    this.selbuf_id = ibuf_idgen.gen_id();
  }

  static fromSTRUCT(unpacker) {
    var ob = new ASObject(undefined, "");
    
    unpacker(ob);
    ob.init_from_pack();
    
    return ob;
  }
  
  calc_ss_steps() : int {
    var steps = Math.floor(this.ss_steps / Math.log(this.data.faces.length))+1.0;
    steps = Math.max(steps, 3.0);
    
    return steps;
  }

  get subsurf() {
    return !!(this.flag & ObFlags.SUBSURF);
  }
  
  set subsurf(val) {
    if (val)
      this.flag |= ObFlags.SUBSURF;
    else 
      this.flag &= ~ObFlags.SUBSURF;
  }
  
  dag_execute() {
    var mat = this.matrix = this.basic_matrix();
    
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
    
    if (this.parent != undefined) {
      mat.multiply(this.parentinv);
      mat.multiply(this.parent.matrix);
    }
    
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
    scene.graph.socket_clear(this, "parent", "i");
    
    if (this.parent != undefined) {
      this.parent.lib_remuser(this, "parent");
    }
    
    this.parent = undefined;
    this.parentinv = new Matrix4();
  }

  set_parent(scene, newpar, preserve_child_space) {
    //preserve_child_space defaults to False
    //if true, it calculates a special pre-multiplication
    //matrix (this.parentinv) such that the object's post-parent
    //position/location/size is the same as pre-parent.
    
    if (preserve_child_space == undefined)
      preserve_child_space = false;
      
    if (this.parent == newpar) {
      console.log("parent already set.");
      return;
    }
    
    if (newpar == undefined || newpar == null) {
      console.log("Warning: unparent with obj.unparent(scene), not obj.set_parent(scene, undefiend)!");
      this.unparent(scene);
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
  matrix : mat4;
  loc : vec3;
  rot_euler : vec3;
  rot_method : int;
  size : vec3;
  flag : int;
  data : dataref(DataBlock);
  layermask : int;
  bb : array(vec3);
  bb_display : int;
  scene : dataref(Scene);
  ss_steps : int;
}
""";
