"use strict";

var ObTypes = {
  MESH : "ME",
  CSG : "CS",
  GROUP : "GR",
  NULL : "NU",
};

var ObFlags = {
  Display_BB: 1
};

var RotTypes = { EULER: 0};
var BBDisplayTypes = {BOX: 1, SPHERE: 2, CYLINDER: 3, CONE: 4, VIEWCIRCLE: 5};

function ASObject(data, name) {
  //name is optional
  
  DataBlock.call(this, DataTypes.OB, name);
  
  this.flag = 0;
  this.loc = new Vector3();
  this.euler = new Vector3();
  this.size = new Vector3();
  
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
}
inherit(ASObject, DataBlock);

ASObject.prototype.gen_matrix = function() {
  var mat = new Matrix4();
  
  mat.rotate(this.rot_euler[0], this.rot_euler[1], this.rot_euler[2]);
  mat.scale(this.size[0], this.size[1], this.size[2]);
  mat.translate(this.loc[0], this.loc[1], this.loc[2]);
  
  if (this.parent != undefined) {
    mat.multiply(this.parentinv);
    mat.multiply(this.parent.matrix);
  }
  
  var imat = new Matrix4(mat);
  imat.invert();
  
  this.matrix = mat;
  this.imatrix = imat;
}

ASObject.prototype.gen_rot_matrix = function() {
  var mat = new Matrix4();
  
  mat.rotate(this.rot_euler[0], this.rot_euler[1], this.rot_euler[2]);
  
  return mat;
}

ASObject.prototype.pack = function(data) {
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

ASObject.prototype.unpack = function(data, uctx) {
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

ASObject.prototype.data_link = function(data, getblock) {
  this.parent = getblock(this, "parent", data, uctx);
}