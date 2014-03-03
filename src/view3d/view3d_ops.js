
function ViewRotateOp() {
  ToolOp.call(this);
  
  this.undoflag = UndoFlags.IGNORE_UNDO;
  
  this.transdata = null;
  this.is_modal = true;
  this.name = "ViewRotate"

  this.inputs = {MV1: new Vec3Property(new Vector3(), "mvector1", "mvector1", "mvector1"), 
                 MV2: new Vec3Property(new Vector3(), "mvector2", "mvector2", "mvector2")}
                 
  this.outputs = {}
}

inherit(ViewRotateOp, ToolOp);

ViewRotateOp.prototype.can_call = function(ctx) {
  return true;
}

ViewRotateOp.prototype.modal_init = function(ctx) {
  this.start_mat = new Matrix4(ctx.view3d.drawmats.cameramat);
  this.first_call = true;
}

ViewRotateOp.prototype.on_mousemove = function(event) {
  if (this.first_call == true) {
    this.first_call = false;
    this.start_mpos = new Vector3([event.x, event.y, 0]);
    this.start_mpos[0] = this.start_mpos[0]/(this.modal_ctx.view3d.size[0]/2) - 1.0;
    this.start_mpos[1] = this.start_mpos[1]/(this.modal_ctx.view3d.size[1]/2) - 1.0;
  }
  
  mstart = new Vector3(this.start_mpos);

  var mend = new Vector3([event.x, event.y, 0.0]);
  mend[0] = mend[0]/(this.modal_ctx.view3d.size[0]/2) - 1.0;
  mend[1] = mend[1]/(this.modal_ctx.view3d.size[1]/2) - 1.0;

  var vec = new Vector3(mend);
  vec.sub(mstart);
  
  this.inputs.MV1.data = mstart;
  this.inputs.MV2.data = mend;
  this.exec(this.modal_ctx);
}

ViewRotateOp.prototype.exec = function(ctx) {
  var v1 = new Vector3(this.inputs.MV1.data);
  var v2 = new Vector3(this.inputs.MV2.data);
  
  if (v1.vectorDistance(v2) < 0.01)
    return;
  
  var vec = new Vector3(v2);
  vec.sub(v1);
  
  perp = new Vector3([-vec[1], vec[0], 0.0]);
  var q = new Quat();
  q.axisAngleToQuat(perp, vec.vectorLength()*2);
  mat = q.toMatrix();
  
  newmat = new Matrix4(mat);
  newmat.multiply(this.start_mat);
  
  ctx.view3d.drawmats.cameramat = newmat;
  ctx.view3d.gen_rendermats();
  ctx.view3d.on_view_change();
}

ViewRotateOp.prototype.on_mouseup = function(event) {
  if (DEBUG.modal)
    console.log("modal end");
  this.end_modal();
}

function ViewPanOp() {
  ToolOp.call(this);
  
  this.undoflag = UndoFlags.IGNORE_UNDO;
  
  this.transdata = null;
  this.is_modal = true;
  this.name = "ViewRotate"

  this.inputs = {MV1: new Vec3Property(new Vector3(), "mvector1", "mvector1", "mvector1"), 
                 MV2: new Vec3Property(new Vector3(), "mvector2", "mvector2", "mvector2")}
                 
  this.outputs = {}
}

inherit(ViewPanOp, ToolOp);

ViewPanOp.prototype.can_call = function(ctx) {
  return true;
}

ViewPanOp.prototype.modal_init = function(ctx) {
  this.start_mat = new Matrix4(ctx.view3d.drawmats.cameramat);
  this.first_call = true;
  
  this.center = new Vector3();
  
  var i = 0;
  for (var v in ctx.mesh.verts) {
    if (isNaN(v.co[0]) || isNaN(v.co[1]) || isNaN(v.co[2]))
      continue;
    
    this.center.add(v.co);
    i += 1;
    if (i > 200) 
      break;
  }
  
  if (i > 0)
    this.center.mulScalar(1.0/i);
}

ViewPanOp.prototype.on_mousemove = function(event) {
  if (this.first_call == true) {
    this.first_call = false;
    this.start_mpos = new Vector3([event.x, event.y, 0]);
    this.start_mpos[0] = this.start_mpos[0]/(this.modal_ctx.view3d.size[0]/2) - 1.0;
    this.start_mpos[1] = this.start_mpos[1]/(this.modal_ctx.view3d.size[1]/2) - 1.0;
  }
  
  mstart = new Vector3(this.start_mpos);

  var mend = new Vector3([event.x, event.y, 0.0]);
  mend[0] = mend[0]/(this.modal_ctx.view3d.size[0]/2) - 1.0;
  mend[1] = mend[1]/(this.modal_ctx.view3d.size[1]/2) - 1.0;

  this.inputs.MV1.data = mstart;
  this.inputs.MV2.data = mend;
  this.exec(this.modal_ctx);
}

ViewPanOp.prototype.exec = function(ctx) {
  var v1 = new Vector3(this.inputs.MV1.data);
  var v2 = new Vector3(this.inputs.MV2.data);
  
  if (v1.vectorDistance(v2) < 0.01)
    return;
  
  v1[2] = 0.9;
  v2[2] = 0.9;
  
  var iprojmat = new Matrix4(ctx.view3d.drawmats.rendermat);
  iprojmat.invert();
  
  var scenter = new Vector3(this.center);
  scenter.multVecMatrix(ctx.view3d.drawmats.rendermat);
  
  if (isNaN(scenter[2]))
    scenter[2] = 0.0;
  
  v1[2] = scenter[2];
  v2[2] = scenter[2];
  
  v1.multVecMatrix(iprojmat);
  v2.multVecMatrix(iprojmat);
  
  var vec = new Vector3(v2);
  vec.sub(v1);
  
  newmat = new Matrix4(this.start_mat);
  
  if (isNaN(vec[0]) || isNaN(vec[1]) || isNaN(vec[2]))
    return;
    
  newmat.translate(vec);
  
  ctx.view3d.drawmats.cameramat = newmat;
  ctx.view3d.gen_rendermats();
  ctx.view3d.on_view_change();
}

ViewPanOp.prototype.on_mouseup = function(event) {
  if (DEBUG.modal)
    console.log("modal end");
  
  this.end_modal();
}

function mprop_to_tprop(props, props2) {
  if (props2 == undefined) {
    props2 = {}
  }
  
  for (var k1 in Iterator(props)) {
    var k = k1[0]
    var p = props[k];
    var p2;
    
    var name = k; var uiname = k; var descr = k;
    if (p.type == MPropTypes.ELEMENT_BUF) {
      if (p.save_in_toolops) {
        var lst = list(p);
        for (var i=0; i<lst.length; i++) {
          lst[i] = lst[i].eid;
        }
        p2 = new ElementBufProperty(lst, name, uiname, descr);
        p2.ignore = false;
      } else {
        p2 = new ElementBufProperty([], name, uiname, descr);
        p2.ignore = true;
      }
    } else if (p.type == MPropTypes.INT) {
      p2 = new IntProperty(p.data, name, uiname, descr);
      p2.ignore = false;
      if (p.range != undefined)
        p2.range = p2.ui_range = p.range;
    } else if (p.type == MPropTypes.FLOAT) {
      p2 = new FloatProperty(p.data, name, uiname, descr);
      p2.ignore = false;
      if (p.range != undefined)
        p2.range = p2.ui_range = p.range;
    } else if (p.type == MPropTypes.STRING) {
      p2 = new StringProperty(p.data, name, uiname, descr);
      p2.ignore = false;
    } else if (p.type == MPropTypes.VEC3) {
      p2 = new Vec3Property(p.data, name, uiname, descr);
      p2.ignore = false;
    } else if (p.type == MPropTypes.BOOL) {
      p2 = new BoolProperty(p.data, name, uiname, descr);
      p2.ignore = false;
    } else if (p.type == PropTypes.FLAG) {
      p2 = p;
    }
    
    if (props2.hasOwnProperty(k)) {
      props2[k].data = p2.data;
    } else {
      props2[k] = p2;
    }
    
    props[k].flag = p.flag;
  }
  
  return props2;
}

function tprop_to_mprop(mprop, tprop) {
  for (var k1 in Iterator(tprop)) {
    var k = k1[0]
    var p = tprop[k];
    var p2 = mprop[k];
    
    if (p.ignore) 
      continue;
    
    if (p.type == PropTypes.BOOL) {
      p2.data = p.data;
    } else if (p.type == PropTypes.INT) {
      p2.data = p.data;
    } else if (p.type == PropTypes.FLOAT) {
      p2.data = p.data;
    } else if (p.type == PropTypes.STRING) {
      p2.data = p.data;
    } else if (p.type == PropTypes.VEC3) {
      p2.data = p.data;
    } else if (p.type == PropTypes.FLAG) {
      p2.set_data(p.data);
    } else {
      throw "Unimplemented toolop->meshop type conversion";
    }
  }
  
  return mprop;
}

function MeshToolOp(meshop) {
  ToolOp.call(this);
  
  this.is_modal = false;
  this.name = meshop.name;
  this.uiname = meshop.uiname;
  
  this.meshop = meshop;
  
  this.inputs = mprop_to_tprop(meshop.inputs);
  this.outputs = mprop_to_tprop(meshop.outputs);
  
  this._partial = undefined : Mesh;
}
inherit(MeshToolOp, ToolOp);

MeshToolOp.prototype.undo_pre = function(ctx) {
  if (this.meshop.flag & MeshOpFlags.USE_PARTIAL_UNDO) {
    this._partial = ctx.mesh.gen_partial(ctx.mesh.selected, this.meshop.undo_expand_lvl);
  } else {
    prior(MeshToolOp, this).undo_pre.call(this, ctx);
  }
}

MeshToolOp.prototype.undo = function(ctx) {
  if (this.meshop.flag & MeshOpFlags.USE_PARTIAL_UNDO) {
    var part = this._partial;
    var mesh = ctx.mesh;
    
    mesh.load_partial(this._partial);
    mesh.regen_render();
    
    this._partial = undefined;
  } else {
    prior(MeshToolOp, this).undo.call(this, ctx);
  }
}

MeshToolOp.prototype.can_call = function(ctx) {
  return true;
}

MeshToolOp.prototype.exec = function(ctx) {
  tprop_to_mprop(this.meshop.inputs, this.inputs);
  
  ctx.appstate.jobs.kill_owner_jobs(ctx.mesh);
  
  ctx.mesh.ops.call_op(this.meshop);
  
  mprop_to_tprop(this.meshop.outputs, this.outputs);
  ctx.mesh.regen_render();
}

function ClickExtrude(mode) {
  ToolOp.call(this);
  
  this.name = "Click Extrude"
  this.is_modal = true;
  
  var mode_vals = ["add", "subtract"];
  
  this.inputs = {trans: new Vec3Property(new Vector3(), "translation", "translation", "translation"), rot: new Vec4Property(new Vector3(), "rotation", "rotation", "rotation")}
}

inherit(ClickExtrude, ToolOp);

ClickExtrude.prototype.on_mousedown = function(event) {
  console.log("click");
  var ctx = this.modal_ctx;
  var mpos = new Vector3([ctx.view3d.mpos[0], ctx.view3d.mpos[1], 0.0]);
  var cent = new Vector3();
  var totsel = 0;
  var mesh = ctx.mesh;
  
  var meshop = new ExtrudeAllOp(mesh.ops.gen_flag_iter(MeshTypes.FACE|MeshTypes.VERT|MeshTypes.EDGE, Flags.SELECT));
  
  mesh.ops.call_op(meshop);
  
  for (var v in mesh.verts) {
    if (v.flag & Flags.SELECT) {
      if (isNaN(v.co[0]) || isNaN(v.co[1]) || isNaN(v.co[2]))
          continue;
      totsel++;
      cent.add(v.co);
    }
  }
  
  if (totsel == 0) {
    for (var v in mesh.verts) {
      if (isNaN(v.co[0]) || isNaN(v.co[1]) || isNaN(v.co[2]))
        continue;
      cent.add(v.co);
      totsel++;
    }
    
    cent.mulScalar(1.0/totsel);
    
    var v2 = mesh.make_vert(cent, new Vector3());
    mesh.verts.select(v2);
  } else {
    cent.mulScalar(1.0/totsel);
  }
  
  var projmat = ctx.view3d.drawmats.rendermat;
  var scent = new Vector3(cent);
  scent.multVecMatrix(projmat);
  
  mpos[0] = (mpos[0]/ctx.view3d.size[0])*2.0 - 1.0;
  mpos[1] = (mpos[1]/ctx.view3d.size[1])*2.0 - 1.0;
  mpos[2] = scent[2];
  
  var smpos = new Vector3(mpos);
  smpos[2] = 0.0;
  
  var iprojmat = new Matrix4(ctx.view3d.drawmats.rendermat)
  iprojmat.invert();
  
  mpos.multVecMatrix(iprojmat);
  
  var off = new Vector3(mpos).sub(cent);
  var mat = new Matrix4();
  
  var soff = new Vector3(cent);
  soff.multVecMatrix(projmat);
  soff[2] = 0.0;
  soff = new Vector3(smpos).sub(soff);
  soff[2] = 0.0;
  
  var n1 = new Vector3(soff);
  n1.normalize();
  
  var cameramat = ctx.view3d.drawmats.cameramat;
  var origin = new Vector3([cameramat.$matrix.m41, cameramat.$matrix.m42, cameramat.$matrix.m43]);
  
  var viewvec = new Vector3(scent);
  viewvec[2] = 0.0;
  
  viewvec.multVecMatrix(iprojmat);
  viewvec.sub(origin)
  
  viewvec.normalize()
  
  var tanvec = mesh_find_tangent(mesh, viewvec, n1, projmat);
  tanvec.normalize();
  
  console.log("tanvec: ", tanvec);
  console.log("offvec: ", soff);
  console.log("norvec: ", n1);
  
  var angle = Math.acos(n1.dot(tanvec));
  
  var w = winding(scent, new Vector3(scent).add(tanvec), smpos);
  
  console.log("w", w)
  if (!w)
    angle = -angle;
  
  console.log("angle: ", angle);
  
  if (isNaN(angle))
    angle = 0;
    
  var q = new Quat()
  q.axisAngleToQuat(viewvec, angle);
  var rmat = q.toMatrix();
  
  var rmat = new Matrix4();
  rmat.rotate(angle, viewvec);
  
  mat = new Matrix4()
  mat.translate(off[0], off[1], off[2]);
  mat.translate(cent[0], cent[1], cent[2]);
  mat.multiply(rmat);
  mat.translate(-cent[0], -cent[1], -cent[2]);
  
  for (var v in mesh.verts) {
    if (v.flag & Flags.SELECT) {
      v.co.multVecMatrix(mat);
    }
  }
  
  mesh.api.recalc_normals();
  mesh.regen_normals();
  mesh.regen_positions();
}

ClickExtrude.prototype.on_mouseup = function(event) {
  console.log("end modal")
  this.end_modal();
}


ClickExtrude.prototype.can_call = function(ctx) {
  return true;
}

ClickExtrude.prototype.exec = function(ctx) {
  ctx.mesh.regen_positions();
}

function ToggleSubSurfOp() {
  ToolOp.call(this);
  
  this.undoflag = UndoFlags.IGNORE_UNDO;
  
  this.is_modal = false;
  this.name = "Toggle Subsurf"
  self.uiname = "Subsurf"
  
  this.inputs = {}                 
  this.outputs = {}
}

inherit(ToggleSubSurfOp, ToolOp);

ToggleSubSurfOp.prototype.can_call = function(ctx) {
  return true;
}

ToggleSubSurfOp.prototype.exec = function(ctx) {
  console.log("subsurf");
  
  if (ctx.view3d.ss_mesh == null) {
    ctx.mesh.regen_render();
    ctx.view3d.ss_mesh = gpu_subsurf(ctx.view3d.gl, ctx.mesh, ctx.view3d.get_ss_steps());
  } else {
    destroy_subsurf_mesh(ctx.view3d.gl, ctx.view3d.ss_mesh);
    ctx.view3d.ss_mesh = null;
    ctx.mesh.regen_render();
  }
}

