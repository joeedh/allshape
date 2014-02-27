__td_last_startcos = [new Vector3()];

class TransData {
  constructor(Context ctx) {
    this.projmat = new Matrix4(ctx.view3d.drawmats.rendermat);
    this.iprojmat = new Matrix4(this.projmat);
    this.iprojmat.invert();
    
    this.mesh = ctx.mesh;
    this.center = new Vector3([0, 0, 0]);
    this.verts = new GArray<Vertex>();
    this.startcos = new GArray<Vector3>();
    this.ctx = ctx;
    this.start_mpos = new Vector2(ctx.view3d.mpos);
    this.faces = new set<Face>();
    this.loops = new set<Face>();
    
    this.start_mpos[0] = this.start_mpos[0]/(ctx.view3d.size[0]/2) - 1.0;
    this.start_mpos[1] = this.start_mpos[1]/(ctx.view3d.size[1]/2) - 1.0;
    
    var faces = this.faces;
    var loops = this.loops;
    
    var i = 0;
    this.startcos = __td_last_startcos;
    var scos = this.startcos;
    var is_static = false;
    for (var v in this.mesh.verts.selected) {
      v.td_sco.load(v.co);
      
      if ((v.flag & Flags.SELECT) == 0) continue;
      this.center.add(v.co);
      this.verts.push(v);
      
      if (i < __td_last_startcos.length) {
        scos[i].load(v.co);
      } else {
        scos.push(new Vector3(v.co));
      }
      
      for (var l in v.loops) {
        faces.add(l.f);
        loops.add(l);
      }
      i++;
    }
    
    this.loops = g_list<Loop>(this.loops);
    
    this.center.divideScalar(this.verts.length);
    
    this.scenter = new Vector3(this.center);
    this.scenter.multVecMatrix(this.projmat);
    
    this.min = undefined : Vector3;
    this.max = undefined : Vector3;
  }

  calc_aabb() {
    var mm = new MinMax(3);
    
    for (var v in this.verts) {
      mm.minmax(v.co);
    }
    
    this.min = new Vector3(mm.min);
    this.max = new Vector3(mm.max);
  }
}

function TransformOp() {
  ToolOp.call(this);
 
  this.selecting_axis = false;
  this.constrain_plane = false;
  
  this.axis_drawlines = new GArray<drawline>();
  this.axis_scent = null;
  this.axis_line1 = null;
  this.axis_line2 = null;
  this._undo = {} : ObjectMap
}

inherit(TransformOp, ToolOp);

TransformOp.prototype.undo_pre = function(ctx) {
  var mesh = ctx.mesh
  
  this._undo = {}
  for (var v in mesh.verts.selected) {
    this._undo[v.eid] = new Vector3(v.co);
  }
}

TransformOp.prototype.undo = function(ctx) {
  var mesh = ctx.mesh
  
  var _undo = this._undo;
  for (var k in _undo) {
    var v = mesh.verts.get(k)
    
    if (v == undefined) {
      console.log("undefined vert in TransformOp.prototype.undo!")
      continue;
    }
    
    v.co.load(_undo[k]);
    
    if (mesh.flag & MeshFlags.USE_MAP_CO) {
      v.flag |= Flags.DIRTY;
      for (var l in v.loops) {
        l.e.flag |= Flags.DIRTY;
        l.f.flag |= Flags.DIRTY;        
      }
    }
  }
  
  mesh.regen_positions();
  mesh.regen_normals();
  
  var iter = new recalc_normals_job(mesh, false);
  var job = new Joblet(mesh, iter, function() { }, 1);
  
  ctx.appstate.jobs.queue_replace(job);
}

TransformOp.prototype.do_normals = function()
{
  var td = this.transdata;
  var verts = td.verts;
  var mesh = this.modal_ctx.mesh;
  
  for (var l in td.loops) {
    l.v.flags |= Flags.DIRTY;
    l.flags |= Flags.DIRTY;
    l.e.flags |= Flags.DIRTY;
    l.f.flag |= Flags.DIRTY;
    if (l.f.totvert > 4 || verts.length < 20)
        l.f.recalc_normal();    
  }
  
  if (verts.length < 20) {
    for (var i=0; i<verts.length; i++) {
      verts[i].recalc_normal(false);
    }
  }
  
  if (verts.length > 20) {
    var view3d = this.modal_ctx.view3d
    
    var iter = new recalc_normals_job(mesh, true);
    var ival = 1;
    var job = new Joblet(mesh, iter, function() { }, ival)
    
    function start_func(job) {
      for (var i1=0; i1<td.verts.length; i1++) {
        var v = td.verts[i1];
        v.td_sco.load(v.co);
      }
    }
    
    this.modal_ctx.appstate.jobs.queue_replace(job, start_func);
  }
}

TransformOp.prototype.on_mousemove = function(event) 
{
  if (this.first_call == true) {
    this.first_call = false;
    this.start_mpos = new Vector3([event.x, event.y, 0]);
    this.start_mpos[0] = (this.start_mpos[0]/(this.modal_ctx.view3d.size[0]/2)) - 1.0;
    this.start_mpos[1] = (this.start_mpos[1]/(this.modal_ctx.view3d.size[1]/2))  - 1.0;
  }

  mstart = new Vector3(this.start_mpos);

  var mend = new Vector3([event.x, event.y, 0.0]);
  mend[0] = (mend[0]/(this.modal_ctx.view3d.size[0]/2)) - 1.0;
  mend[1] = (mend[1]/(this.modal_ctx.view3d.size[1]/2)) - 1.0;

  this.inputs.MV1.data = mstart;
  this.inputs.MV2.data = mend;
  
  if (this.selecting_axis) {
    var td = this.transdata;
    var axis = this.axis_drawlines[this.axis_drawlines.length-1]
    
    axis.v1[2] = 0.0;
    
    axis.v2 = new Vector3(mend);
    
    for (var dl in this.axis_drawlines) {
      dl.clr = dl.oldclr;
    }
    
    var npick = null, npick2 = null, ndis = 0.0;
    var n2 = new Vector3(axis.v2).sub(axis.v1);
    n2.normalize();
    var apick = 0;
    
    for (var i=0; i<this.axis_drawlines.length-1; i++) {
      var dl = this.axis_drawlines[i];
      var n1 = new Vector3(dl.v2).sub(dl.v1);
      
      //console.log(i, n1.vectorLength());
      if (n1.vectorLength() <= 0.08) {
        continue;
      }
      
      n1.normalize();
      if (npick == null || (1.0 - Math.abs(n1.dot(n2))) < dis) {
        dis = (1.0 - Math.abs(n1.dot(n2)));
        npick = dl;
        
        if (i < 3) {
          apick = i;
          npick2 = this.axis_drawlines[i+3];
        } else {
          apick = i - 3;
          npick2 = this.axis_drawlines[i-3];
        }
      }
    }
    
    var pick_clr = [1.0, 1.0, 1.0, 0.7];
    npick.clr = pick_clr;
    npick2.clr = pick_clr;
    
    this.axis_line1 = npick;
    this.axis_line2 = npick2;
    
    if (this.constrain_plane) {
      this.inputs.AXIS.data = new Vector3([1.0, 1.0, 1.0]);
      this.inputs.AXIS.data[apick] = 0.0;
    } else {
      this.inputs.AXIS.data = new Vector3();
      this.inputs.AXIS.data[apick] = 1.0;
    }      
  }
  
  this.exec(this.modal_ctx);
}

var c = 1.0;
xclr = [c, 0.0, 0.0, 0.5]
yclr = [0.0, c, 0.0, 0.5]
zclr = [0.0, 0.0, c, 0.5]
axclrs = [xclr, yclr, zclr]

TransformOp.prototype.gen_axis = function(axis, center) 
{
  var dl1 = this.modal_ctx.view3d.new_drawline();
  var dl2 = this.modal_ctx.view3d.new_drawline();
  
  dl1.v1[axis] = 4.0;
  dl1.v2[axis] = 0.0;
  dl2.v1[axis] = -4.0;
  dl2.v2[axis] = 0.0;
  
  dl1.v1.add(center);
  dl1.v2.add(center);
  dl2.v1.add(center);
  dl2.v2.add(center);
  
  dl1.v1.multVecMatrix(this.transdata.projmat);
  dl1.v2.multVecMatrix(this.transdata.projmat);
  dl2.v1.multVecMatrix(this.transdata.projmat);
  dl2.v2.multVecMatrix(this.transdata.projmat);
  return [dl1, dl2];
}

TransformOp.prototype.set_selecting_axis = function() 
{
  var ctx = this.modal_ctx;
  
  if (!this.selecting_axis) {
    for (var dl in this.axis_drawlines) {
      if (dl != this.axis_line1 && dl != this.axis_line2)
        ctx.view3d.kill_drawline(dl);
      else
        dl.clr = dl.oldclr;
    }
    
    this.axis_drawlines = new GArray();    
    return;
  }
  
  if (this.axis_line1 != null) ctx.view3d.kill_drawline(this.axis_line1);
  if (this.axis_line2 != null) ctx.view3d.kill_drawline(this.axis_line2);
  
  var td = this.transdata;
  
  console.log("Axis select!");
  var dx = ctx.view3d.new_drawline(); dx.clr = xclr;
  var dy = ctx.view3d.new_drawline(); dy.clr = yclr;
  var dz = ctx.view3d.new_drawline(); dz.clr = zclr;
  
  var d = 4.0;
  dx.v1 = new Vector3([0.0, 0.0, 0.0]);
  dx.v2 = new Vector3([d, 0.0, 0.0]);
  dy.v1 = new Vector3([0.0, 0.0, 0.0]);
  dy.v2 = new Vector3([0.0, d, 0.0]);
  dz.v1 = new Vector3([0.0, 0.0, 0.0]);
  dz.v2 = new Vector3([0.0, 0.0, d]);
  
  this.axis_drawlines.push(dx);
  this.axis_drawlines.push(dy);
  this.axis_drawlines.push(dz);
  dx = ctx.view3d.new_drawline(); dx.clr = xclr;
  dy = ctx.view3d.new_drawline(); dy.clr = yclr;
  dz = ctx.view3d.new_drawline(); dz.clr = zclr;

  dx.v1 = new Vector3([0.0, 0.0, 0.0]);
  dx.v2 = new Vector3([-d, 0.0, 0.0]);
  dy.v1 = new Vector3([0.0, 0.0, 0.0]);
  dy.v2 = new Vector3([0.0, -d, 0.0]);
  dz.v1 = new Vector3([0.0, 0.0, 0.0]);
  dz.v2 = new Vector3([0.0, 0.0, -d]);
  this.axis_drawlines.push(dx);
  this.axis_drawlines.push(dy);
  this.axis_drawlines.push(dz);

  var cent = new Vector3(this.inputs.MV2.data);
  cent[2] = 0.0;
  this.axis_scent = cent;
  
  for (var dl in this.axis_drawlines) {
    dl._v1 = new Vector3(dl.v1);
    dl._v2 = new Vector3(dl.v2);
    
    dl.v1.add(td.center);
    dl.v2.add(td.center);
    dl.v1.multVecMatrix(td.projmat);
    dl.v2.multVecMatrix(td.projmat);

    dl._v1.multVecMatrix(td.projmat);
    dl._v2.multVecMatrix(td.projmat);
    dl._v1.add(cent);
    dl._v2.add(cent);
    
    dl.v1[2] = 0.0; dl.v2[2] = 0.0;
    dl._v1[2] = 0.0; dl._v2[2] = 0.0;
    dl.oldclr = dl.clr;
  }
  
  var axis = ctx.view3d.new_drawline()
  
  axis.clr = [1.0, 1.0, 0.289, 0.5];
  axis.oldclr = axis.clr;
  this.axis_drawlines.push(axis);
}

TransformOp.prototype.on_mousedown = function(event) {
  if (event.button == 1) {
    this.selecting_axis = 1;
    this.set_selecting_axis();
  }
}

TransformOp.prototype.end_modal = function() {
  this.do_normals();
  
  for (var dl in this.axis_drawlines) {
    this.modal_ctx.view3d.kill_drawline(dl);
  }
  
  if (this.axis_line1 != null) this.modal_ctx.view3d.kill_drawline(this.axis_line1);
  if (this.axis_line2 != null) this.modal_ctx.view3d.kill_drawline(this.axis_line2);
    
  this.axis_drawlines = new GArray();
  
  prior(TransformOp, this).end_modal.call(this);
  //TransformOp.prototype.prior.end_modal.call(this);
}

TransformOp.prototype.on_keydown = function(event) {
  this.constrain_plane = event.shiftKey;
  apick = -1;
  
  if (event.keyCode == "X".charCodeAt(0)) {
    apick = 0;
  } else if (event.keyCode == "Y".charCodeAt(0)) {
    apick = 1;
  } else if (event.keyCode == "Z".charCodeAt(0)) {
    apick = 2;
  }
  
  if (apick != -1) {
    if (this.axis_line1 != null) this.modal_ctx.view3d.kill_drawline(this.axis_line1);
    if (this.axis_line2 != null) this.modal_ctx.view3d.kill_drawline(this.axis_line2);
    
    if (this.constrain_plane) {
      this.inputs.AXIS.data = new Vector3([1.0, 1.0, 1.0]);
      this.inputs.AXIS.data[apick] = 0.0;
    } else {
      var ret = this.gen_axis(apick, this.transdata.center);
      this.axis_line1 = ret[0];
      this.axis_line2 = ret[1];
      this.axis_line1.clr = axclrs[apick];
      this.axis_line2.clr = axclrs[apick];
      
      
      this.inputs.AXIS.data = new Vector3();
      this.inputs.AXIS.data[apick] = 1.0;
    }
  }
}

TransformOp.prototype.on_keyup = function(event) {
  this.shift = event.shiftKey;
  this.alt = event.altKey;
  this.ctrl = event.ctrlKey;
  
  if (event.keyCode == 27) { //escape key
    this.end_modal();
    this.cancel();
  } else if (event.keyCode == 13) { //enter key
    this.end_modal();
  }
}

TransformOp.prototype.on_mouseup = function(event) {
  console.log("modal end");
  
  if (event.button == 0) {
    this.end_modal();
  } else if (event.button == 1) {
    this.selecting_axis = 0;
    this.set_selecting_axis();
  } else if (event.button == 2) {
    this.end_modal();
    this.cancel();
  }
}

function TranslateOp() {
  TransformOp.call(this);
  
  this.uiname = "Translate"
  this.name = "translate"
  
  this.transdata = null;
  this.is_modal = true;
  
  this.inputs = {TRANSLATION: new Vec3Property(new Vector3(), "translation", "Translation", "Amount of translation."), 
           MV1: new Vec3Property(new Vector3(), "mvector1", "mvector1", "mvector1", TPropFlags.PRIVATE),
           MV2: new Vec3Property(new Vector3(), "mvector2", "mvector2", "mvector2", TPropFlags.PRIVATE), 
           AXIS: new Vec3Property(new Vector3(), "cons_axis", "Constraint Axis", "Axis to constrain too during transform", TPropFlags.PRIVATE)}
  this.outputs = {TRANSLATION: new Vec3Property(new Vector3(), "translation", "Translation", "Amount of translation.")}
}

inherit(TranslateOp, TransformOp);

TranslateOp.prototype.can_call = function(ctx) {
  var totsel = 0;
  
  for (var v in ctx.mesh.verts) {
    if ((v.flag & Flags.SELECT) != 0)
      totsel++;
  }
  
  return totsel > 0;
}

TranslateOp.prototype.modal_init = function(ctx) {
  this.transdata = new TransData(ctx);
  this.first_call = true;
  
  if (this.inputs.AXIS.data.vectorLength() > 0) {
    var axis = new Vector3(this.inputs.AXIS.data)
    
    var center = this.transdata.center
    var scenter = this.transdata.scenter
    
    axis.mulScalar(4.0);
    axis.add(center)
    axis.multVecMatrix(ctx.view3d.drawmats.rendermat);
    
    this.axis_line1 = ctx.view3d.new_drawline()
    
    this.axis_line1.v1.load(axis)
    this.axis_line1.v2.load(scenter)
  }
}

TranslateOp.prototype.cancel = function(ctx) {
  var td = this.transdata;
  
  for (var i=0; i<td.verts.length; i++) {
    td.verts[i].co.load(td.startcos[i]);
  }
  
  td.mesh.regen_positions();
  td.mesh.regen_normals();
}

TranslateOp.prototype.exec = function(ctx) {
  if (!this.is_modal)
    this.transdata = new TransData(ctx);

  var td = this.transdata;
  var vec = this.inputs.TRANSLATION.data;
  
  for (var i=0; i<td.verts.length; i++) {
    var v = td.verts[i];
    var co = new Vector3(td.startcos[i]);
    co.add(vec);
    
    v.co = co;
  }
  
  this.do_normals();
  
  ctx.mesh.regen_positions();
  ctx.mesh.regen_normals();
}

TranslateOp.prototype.on_mousemove = function(event) {
  var td = this.transdata;
  
  TransformOp.prototype.on_mousemove.call(this, event);
  
  mstart = new Vector3(td.start_mpos);
  var mstart2d = new Vector3(mstart)
  mstart[2] = td.scenter[2];
  
  mstart.multVecMatrix(td.iprojmat)
  
  var mpos = new Vector3([event.x, event.y, td.scenter[2]]);
  mpos[0] = mpos[0]/(td.ctx.view3d.size[0]/2) - 1.0;
  mpos[1] = mpos[1]/(td.ctx.view3d.size[1]/2) - 1.0;

  mend = new Vector3(mpos);
  var mend2d = new Vector3(mend)
  mend[2] = td.scenter[2];
  
  if (this.inputs.AXIS.data.dot(this.inputs.AXIS.data) > 0) {
    var viewvec = new Vector3(mpos);
    viewvec[2] = td.scenter[2];
    
    viewvec.multVecMatrix(td.iprojmat);
    var m = new Matrix4(this.modal_ctx.view3d.drawmats.cameramat);
    var origin = new Vector3([0, 0, -100.0]);
    m.invert();
    origin.multVecMatrix(m);
    
    viewvec.sub(origin);
    //viewvec.mulScalar(-1.0);
    viewvec.normalize();
    
    var n = this.inputs.AXIS.data;
    var axis = new Vector3(this.inputs.AXIS.data);
    
    if (!this.consrain_plane) {
    var cross = new Vector3(viewvec);
        cross.normalize(); 
        cross.cross(axis)
        axis.cross(cross);
    }
    
    axis.normalize();
    
    var ret = isect_ray_plane(td.center, axis, origin, viewvec);
    
    ret.multVecMatrix(td.projmat);
    //console.log(ret);
    //mend.load(ret);
    mend[2] = ret[2];
    
    mend2d.load(mend);
  }
  
  mend.multVecMatrix(td.iprojmat);
  
  if (!this.constrain_plane && this.inputs.AXIS.data.dot(this.inputs.AXIS.data) != 0.0) {
      var axis = new Vector3(this.inputs.AXIS.data);
      axis.add(td.center);
      axis.multVecMatrix(td.projmat)
      
      axis.sub(td.scenter);
      axis.normalize();
      
      var cent = new Vector3(td.scenter);
      mend2d.sub(mstart2d)
      mend2d.add(cent)
      
      var t1 = closest_point_on_line(mstart2d, cent, new Vector3(axis).add(cent));
      var t2 = closest_point_on_line(mend2d, cent, new Vector3(axis).add(cent));
      
      var t = new Vector3(t1[0]).sub(t2[0])
      
      if (t.dot(axis) < 0.0)
        t = -t.vectorLength()
      else
        t = t.vectorLength()

      t1[0][2] = cent[2]
      t2[0][2] = cent[2]
      
      t1[0].multVecMatrix(td.iprojmat);
      t2[0].multVecMatrix(td.iprojmat);
      t1 = t1[0]
      t2 = t2[0]
      
      t1.sub(cent);
      t2.sub(td.center);
      //console.log(t1, t2.vectorLength())
      
      //t2.load(mend);
      //t2.sub(td.center)
      t = t2.vectorLength()
      if (t2.dot(this.inputs.AXIS.data) < 0.0)
        t = -t;
      
      vec = new Vector3(this.inputs.AXIS.data)
      vec.mulScalar(t)
      //vec.add(td.center)
      
      //vec = t1[1];
      //vec = new Vector3(t2[0]);
      //vec.sub(t1[0]);
      //vec.mulScalar(15.0);
  } else {
      vec = new Vector3(mend);
      vec.sub(mstart);
  }
  
  this.inputs.TRANSLATION.data = vec;
  this.exec(td.ctx);
}

function RotateOp() {
  TransformOp.call(this);
  
  this.uiname = "Rotate"
  this.name = "rotate"
  
  this.transdata = null;
  this.is_modal = true;
  this.trackball = 0;
  this.rot_sum = 0.0;
  this.first = true;
  this.add_matrix = new Matrix4();
  this.cur_matrix = new Matrix4();
  
  this.inputs = {ROTATION: new Vec4Property(new Vector4(), "rotation", "Rotation", "Amount of rotation."), 
  MV1: new Vec3Property(new Vector3(), "mvector1", "mvector1", "mvector1", TPropFlags.PRIVATE),
  MV2: new Vec3Property(new Vector3(), "mvector2", "mvector2", "mvector2", TPropFlags.PRIVATE),
  MV3: new Vec3Property(new Vector3(), "mvector2", "mvector2", "mvector2", TPropFlags.PRIVATE),
  RAXIS: new Vec3Property(new Vector3(), "axis", "axis", "axis", TPropFlags.PRIVATE),
  ASP: new FloatProperty(1.0, "aspect_ration", "aspect ratio", "aspect ratio", undefined, undefined, TPropFlags.PRIVATE),
  AXIS: new Vec3Property(new Vector3(), "cons_axis", "Constraint Axis", "Axis to constrain too during transform", TPropFlags.PRIVATE)}
  
  this.outputs = {ROTATION: new Vec4Property(new Vector3(), "rotation", "Rotation", "Amount of rotation.")}
}

inherit(RotateOp, TransformOp);

RotateOp.prototype.can_call = function(ctx) {
  var totsel = 0;
  
  for (var v in ctx.mesh.verts) {
    if ((v.flag & Flags.SELECT) != 0)
      totsel++;
  }
  
  return totsel > 0;
}

RotateOp.prototype.end_modal = function() {
  if (this.drawline1 != null)
    this.modal_ctx.view3d.kill_drawline(this.drawline1);
    
  if (this.drawline2 != null)
    this.modal_ctx.view3d.kill_drawline(this.drawline2);
  
  this.drawline1 = this.drawline2 = null;
  
  TransformOp.prototype.end_modal.call(this);
}

RotateOp.prototype.modal_init = function(ctx) {
  this.transdata = new TransData(ctx);
  this.first_call = true;
  
  this.drawline1 = ctx.view3d.new_drawline(new Vector3(), new Vector3());
  this.drawline2 = ctx.view3d.new_drawline(new Vector3(), new Vector3());
}

RotateOp.prototype.cancel = function(ctx) {
  var td = this.transdata;
  
  for (var i=0; i<td.verts.length; i++) {
    td.verts[i].co.load(td.startcos[i]);
  }
  
  td.mesh.regen_positions();
  td.mesh.regen_normals();
}

RotateOp.prototype.on_mousemove = function(event) {
  TransformOp.prototype.on_mousemove.call(this, event);

  if (this.first) {
    this.first = false;
    this.inputs.MV3.data = this.inputs.MV1.data;
  }
   
  var ctx = this.modal_ctx;
  
  var matrix = new Matrix4(ctx.view3d.drawmats.cameramat);
  matrix.invert();
  
  this.inputs.RAXIS.data = new Vector3([matrix.$matrix.m31, matrix.$matrix.m32, matrix.$matrix.m33]);
  this.inputs.ASP.data = this.modal_ctx.view3d.asp
  
  this.exec(this.modal_ctx);
}

RotateOp.prototype.on_keyup = function(event) {
  TransformOp.prototype.on_keyup.call(this, event);
  
  this.shift = event.shiftKey;
  this.alt = event.altKey;
  this.ctrl = event.ctrlKey;
  
  if (event.keyCode == "R".charCodeAt(0)) {
    console.log("Toggling trackball mode")
    this.trackball ^= 1;
    
    if (this.trackball) {
      this.add_matrix = this.cur_matrix;
    } else {
      this.add_matrix = new Matrix4();
    }
    
    this.inputs.MV3.data.load(this.inputs.MV2.data);
    this.inputs.MV1.data.load(this.inputs.MV2.data);
    this.start_mpos = this.inputs.MV2.data;
  } else if (event.keyCode == 27) { //escape key
    this.end_modal();
    this.cancel();
  } else if (event.keyCode == 13) { //enter key
    this.end_modal();
  }
}

RotateOp.prototype.exec = function(ctx) {
  if (!this.is_modal)
    this.transdata = new TransData(ctx);
    
  var v1 = new Vector3(this.inputs.MV1.data);
  var v2 = new Vector3(this.inputs.MV2.data);
  
  if (this.is_modal && v1.vectorDistance(v2) < 0.01)
    return;
  
  var mat, q;
  if (this.trackball) {
    var perp, q;
    var vec = new Vector3(v2);
    vec.sub(v1);
    
    if (this.drawline1 != null) {
      this.drawline1.v1.zero();
      this.drawline1.v2.zero();
    }
    
    perp = new Vector3([-vec[1], vec[0], 0.0]);
    q = new Quat()
    q.axisAngleToQuat(perp, vec.vectorLength()*2)
    mat = q.toMatrix();
    this.cur_matrix = mat;
  } else {
    v1 = new Vector3(this.inputs.MV3.data);
    var cent = new Vector3(this.transdata.scenter);
    v1[2] = 0.0; v2[2] = 0.0;
    cent[2] = 0.0;
    
    if (this.drawline1 != null) {
      this.drawline1.v1.load(v1);
      this.drawline1.v2.load(cent);
      /*this.drawline2.v1.load(v2);
      this.drawline2.v2.load(cent);*/
    }
    
    var asp = this.inputs.ASP.data;
    
    v1[1] /= asp;
    v2[1] /= asp;
    cent[1] /= asp;

    v1.sub(cent);
    v2.sub(cent);
    v1.normalize();
    v2.normalize();
    
    if (this.is_modal) {
      if (v1.vectorDistance(v2) < 0.005)
        return
        
      this.inputs.MV3.data = this.inputs.MV2.data;
    }
    
    var axis = this.inputs.RAXIS.data
    q = new Quat();
    
    if (winding(v1, v2, cent)) {
      this.rot_sum += Math.acos(v1.dot(v2));
    } else {
      this.rot_sum -= Math.acos(v1.dot(v2));
    }

    q.axisAngleToQuat(axis, this.rot_sum);
    mat = q.toMatrix(); 
    
    if (this.is_modal)
      this.cur_matrix = mat;
  }
  var td = this.transdata;
  
  for (var i=0; i<td.verts.length; i++) {
    var v = td.verts[i];
    
    v.co.load(td.startcos[i]);
    v.co.sub(td.center);
    v.co.multVecMatrix(this.add_matrix);
    v.co.multVecMatrix(mat);
    v.co.add(td.center);
  }
  
  this.do_normals();
  
  ctx.mesh.regen_positions();
  ctx.mesh.regen_normals();
}

function ScaleOp() {
  TransformOp.call(this);
  
  this.uiname = "Scale"
  this.name = "scale"
  
  this.transdata = null;
  this.is_modal = true;
  this.first = true;
  
  this.inputs = {SCALE: new Vec3Property(new Vector3(), "scale", "Scale", "Amount of scale."),
  MV1: new Vec3Property(new Vector3(), "mvector1", "mvector1", "mvector1", TPropFlags.PRIVATE),
  MV2: new Vec3Property(new Vector3(), "mvector2", "mvector2", "mvector2", TPropFlags.PRIVATE),
  AXIS: new Vec3Property(new Vector3(), "cons_axis", "Constraint Axis", "Axis to constrain too during transform", TPropFlags.PRIVATE)};
  
  this.outputs = {SCALE: new Vec4Property(new Vector3(), "scale", "Scale", "Amount of scaling.")}
}

inherit(ScaleOp, TransformOp);

ScaleOp.prototype.can_call = function(ctx) {
  var totsel = 0;
  
  for (var v in ctx.mesh.verts) {
    if ((v.flag & Flags.SELECT) != 0)
      totsel++;
  }
  
  return totsel > 0;
}

ScaleOp.prototype.end_modal = function() {
  this.modal_ctx.view3d.kill_drawline(this.drawline1);
  this.modal_ctx.view3d.kill_drawline(this.drawline2);
  TransformOp.prototype.end_modal.call(this);
}

ScaleOp.prototype.modal_init = function(ctx) {
  this.transdata = new TransData(ctx);
  this.first_call = true;
  
  this.drawline1 = ctx.view3d.new_drawline(new Vector3(), new Vector3());
  this.drawline2 = ctx.view3d.new_drawline(new Vector3(), new Vector3());
}

ScaleOp.prototype.cancel = function(ctx) {
  var td = this.transdata;
  
  for (var i=0; i<td.verts.length; i++) {
    td.verts[i].co.load(td.startcos[i]);
  }
  
  td.mesh.regen_positions();
  td.mesh.regen_normals();
}

ScaleOp.prototype.on_mousemove = function(event) {
  TransformOp.prototype.on_mousemove.call(this, event);
  
  var ctx = this.modal_ctx;
  
  var v1 = new Vector3(this.inputs.MV1.data);
  var v2 = new Vector3(this.inputs.MV2.data);
  
  if (v1.vectorDistance(v2) < 0.01) {
    this.inputs.SCALE.data = new Vector3([1.0, 1.0, 1.0]);
    this.exec(this.modal_ctx);
    return;
  }
  
  var cent = new Vector3(this.transdata.scenter);
  this.drawline1.v1.load(cent);
  this.drawline1.v2.load(v1);
  
  this.drawline1.v1.load(cent);
  this.drawline1.v2.load(v2);
  
  v2[1] /= ctx.view3d.asp;
  v1[1] /= ctx.view3d.asp;
  cent[1] /= ctx.view3d.asp;
  v1[2] = v2[2] = cent[2] = 0.0;
  
  var mat, fac;
  
  if (v1.vectorDistance(v2) < 0.001) {
    fac = 1.0;
  } else if (v1.vectorDistance(cent) < 0.001) {
    fac = v2.vectorDistance(cent)/(v1.vectorDistance(cent)+0.05);
  } else {
    fac = v2.vectorDistance(cent)/v1.vectorDistance(cent);
  }
  
  var cons_axis = new Vector3(this.inputs.AXIS.data);
  if (cons_axis[0]+cons_axis[1]+cons_axis[2] != 3.0) {
    if (cons_axis[0] == 1.0) {
      cons_axis[1] = 1.0/fac;
      cons_axis[2] = 1.0/fac;
    } else if (cons_axis[1] == 1.0) {
      cons_axis[0] = 1.0/fac;
      cons_axis[2] = 1.0/fac;
    } else if (cons_axis[2] == 1.0) {
      cons_axis[1] = 1.0/fac;
      cons_axis[0] = 1.0/fac;
    } else {
      cons_axis[0] = cons_axis[1] = cons_axis[2] = 1.0;
    }    
  }
  
  this.inputs.SCALE.data = new Vector3([fac, fac, fac]);
  this.inputs.SCALE.data.mul(cons_axis);
  this.exec(this.modal_ctx);
}

ScaleOp.prototype.exec = function(ctx) {
  if (!this.is_modal)
    this.transdata = new TransData(ctx);
  
  var fac = this.inputs.SCALE.data;
  
  mat = new Matrix4();
  mat.scale(fac[0], fac[1], fac[2]);
  
  var td = this.transdata;
  
  for (var i=0; i<td.verts.length; i++) {
    var v = td.verts[i];
    var co = new Vector3(td.startcos[i]);
    
    v.co.load(co);
    v.co.sub(td.center);
    v.co.multVecMatrix(mat);
    v.co.add(td.center);
  }
  
  this.do_normals();
  
  ctx.mesh.regen_positions();
  ctx.mesh.regen_normals();
}
