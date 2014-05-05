"use strict";

//private static variable
//var __td_last_startcos = [new Vector3()];

class TransDataType {
  static get_aabb(TransData tdata, int i)       : Array<Vector3>     {}
  static reset(TransData tdata, int i)                               {}
  static get_co(TransData tdata, int i)         : Vector3            {}
  static update(TransData tdata)                                     {}
  static get_rot_euler(TransData tdata, int i)  : Vector3            {}
  static get_size(TransData tdata, int i)       : Vector3            {}
  static get_imat(TransData tdata, int i)       : Matrix4            {}
  static get_mat(TransData tdata, int i)        : Matrix4            {}
  
  static undo_pre(TransformOp top, TransData tdata, ToolContext ctx) {}
  static undo(TransformOp top, TransData tdata, ToolContext ctx)     {}
}

class TransMeshType extends TransDataType {
  static get_aabb(TransData tdata, int i) : Array<Vector3> {
    var ret = objcache.array(2);
    
    if (tdata.mesh.flag & MeshFlags.USE_MAP_CO) {
      ret[0] = tdata.verts[i].mapco;
      ret[1] = tdata.verts[i].mapco;
    } else {
      ret[0] = tdata.verts[i].co;
      ret[1] = tdata.verts[i].co;
    }
    
    return ret;
  }
  
  static undo_pre(TransformOp top, TransData tdata, ToolContext ctx) {
    var mesh = ctx.mesh
    
    top._undo = {}
    for (var v in mesh.verts.selected) {
      top._undo[v.eid] = new Vector3(v.co);
    }
  }

  static undo(TransformOp top, TransData tdata, ToolContext ctx) {
    var mesh = ctx.mesh
    
    var _undo = top._undo;
    for (var k in _undo) {
      var v = mesh.verts.get(k)
      
      if (v == undefined) {
        console.log("undefined vert in undo!")
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
    
    g_app_state.jobs.queue_replace(job);
  }
  
  static get_rot_euler(TransData tdata, int i) : Vector3 {
    var ret = objcache.array(3);
    ret[0] = 0; ret[1] = 0; ret[2] = 0;
    
    return ret;
  }
  
  static get_size(TransData tdata, int i) : Vector3 {
    var ret = objcache.array(3);
    ret[0] = 1.0; ret[2] = 1.0; ret[3] = 1.0;
    
    return ret;
  }
  
  static reset(TransData tdata, int i) {
    tdata.verts[i].co.load(tdata.startcos[i]);
  }
  
  static update(TransData tdata) {
    tdata.mesh.regen_positions();
    tdata.mesh.regen_normals();
  }
  
  static get_co(TransData tdata, int i) : Vector3 {
    if (tdata.mesh.flag & MeshFlags.USE_MAP_CO) {
      return tdata.verts[i].mapco;
    } else {
      return tdata.verts[i].co;
    }
  }
  
  static get_imat(TransData tdata, int i) : Matrix4 {
    return tdata.imat;
  }
  
  static get_mat(TransData tdata, int i) : Matrix4 {
    tdata.object.matrix;
  }
}

class TransObjectType {
  static get_aabb(TransData tdata, int i) : Array<Vector3> {
    return tdata.objects[i].aabb;
  }
  
  static get_co(TransData tdata, int i) : Vector3 {
    return tdata.objects[i].loc;
  }
  
  static get_rot_euler(TransData tdata, int i) : Vector3 {
    return tdata.objects[i].rot_euler;
  }
  
  static undo_pre(TransformOp top, TransData tdata, ToolContext ctx) {
    var undo;
    top._undo = undo = [new GArray(), new GArray()];
    var active = top.inputs.object.data;
    
    if (active != undefined) 
      active = ctx.datalib.get(active);
      
    for (var ob in top.inputs.objects.data) {
      if (ob == active)
        continue;
      
      undo[0].push(ob)
    }
    
    //make sure active object goes last
    if (top.inputs.object.data)
      undo[0].push(active);
    
    //store vectors in a flat array, this lets us avoid
    //one level of object caching
    for (var ob in undo[0]) {
      undo[1].push(new Vector3(ob.loc));
      undo[1].push(new Vector3(ob.rot_euler));
      undo[1].push(new Vector3(ob.size));
    }
    
    for (var i=0; i<undo[0].length; i++) {
      undo[0][i] = new DataRef(undo[0][i]);
    }
  }
  
  static undo(TransformOp top, TransData tdata, ToolContext ctx) {
    var undo = top._undo;
    
    for (var i=0; i<undo[0].length; i++) {
      var ob = ctx.datalib.get(undo[0][i]);
      
      ob.loc.load(undo[1][i*3]);
      ob.rot_euler.load(undo[1][i*3+1]);
      ob.size.load(undo[1][i*3+2]);
      
      ob.dag_update();
    }
  }
  
  static get_size(TransData tdata, int i) : Vector3 {
    return tdata.objects[i].size;
  }
  
  static get_imat(TransData tdata, int i) : Matrix4 {
    return tdata.imats[i];
  }
  
  static get_mat(TransData tdata, int i) : Matrix4 {
    return tdata.objects[i].matrix;
  }
  
  static update(TransData tdata, int i) {
    for (var ob in tdata.objects) {
      ob.recalc(RecalcFlags.TRANSFORM);
    }
  }
}

class TransData {
  //objlist is only valid for objectmode transforms
  constructor(Context ctx, TransformOp top, Object obj, Object objlist, int datamode) {
    if (obj == undefined) {
      console.trace();
      console.log("warning: bad obj in TransData.constructor()");
      obj = ctx.object;
    }
    
    if (ctx.constructor == Context) {
      this.projmat = new Matrix4(ctx.view3d.drawmats.rendermat);
      this.iprojmat = new Matrix4(this.projmat);
      this.iprojmat.invert();
      this.start_mpos = new Vector2(ctx.view3d.mpos);
      this.start_mpos[0] = this.start_mpos[0]/(ctx.view3d.size[0]/2) - 1.0;
      this.start_mpos[1] = this.start_mpos[1]/(ctx.view3d.size[1]/2) - 1.0;
    } else {
      this.projmat = this.iprojmat = new Matrix4();
      this.projmat.makeIdentity();
      this.start_mpos = [0, 0];
    }
    
    //XXX hack bugfix
    if (datamode == undefined) {
      this.datamode = top.datamode;
    } else {
      if (datamode & EditModes.GEOMETRY)
        this.datamode = TransMeshType;
      else
        this.datamode = TransObjectType;
    }
    
    this.length = 0;
    this.center = new Vector3([0, 0, 0]);
    this.ctx = ctx;
    
    this.object = obj; //current active object
    
    if (obj.data instanceof Mesh) this.mesh = obj.data;
    else this.mesh = undefined;
    
    if (datamode & EditModes.GEOMETRY) {
      this.load_mesh(ctx, obj);
    } else if (datamode == EditModes.OBJECT) {
      this.load_objects(ctx, obj, objlist);
    }
    
    this.scenter = new Vector3(this.center);
    this.scenter.multVecMatrix(this.projmat);
    
    this.min = undefined : Vector3;
    this.max = undefined : Vector3;
    
    this.imat = new Matrix4(obj.matrix);
    this.imat.invert();
  }
  
  load_objects(ToolContext ctx, ASObject active_ob, Iterator<ASObject> objlist) {
    //load passed in obj, as well as the objects in ctx.scene.selected
    
    var obj = active_ob;
    
    //passed in (active) object always goes first
    var objs = this.objects = new GArray();
    var imats = this.imats = new GArray();
    var scos = this.startcos = new GArray();
    var srots = this.startrots = new GArray();
    var ssizes = this.startsizes = new GArray();
    
    var add_obj = true;
    for (var ob in objlist) {
      var imat = new Matrix4(ob.matrix);
      imat.invert();
      
      //passed in (active) object always goes first
      if (ob == obj) {
        objs.prepend(ob);
        imats.prepend(imat);
        scos.prepend(new Vector3(ob.loc));
        srots.prepend(new Vector3(ob.rot_euler));
        ssizes.prepend(new Vector3(ob.size));
        add_obj = false;
      } else {
        objs.push(ob);
        imats.push(imat);
        scos.prepend(new Vector3(ob.loc));
        srots.prepend(new Vector3(ob.rot_euler));
        ssizes.prepend(new Vector3(ob.size));
      }
    }
    
    //active object always goes first
    if (add_obj) {
      var imat = new Matrix4(obj.matrix);
      imat.invert();
      var mat = obj.basic_matrix();
      
      objs.prepend(obj);
      imats.prepend(imat);
      scos.prepend(new Vector3(obj.loc));
      srots.prepend(new Vector3(obj.rot_euler));
      ssizes.prepend(new Vector3(obj.size));
    }
    
    var center = this.center;
    var loc = new Vector3();
    for (var ob in this.objects) {
      ob.matrix.decompose(loc);
      center.add(loc);
    }
    if (this.objects.length > 0)
      center.divideScalar(1.0/this.objects.length);
    
    this.length = objs.length;
  }
  
  load_mesh(ToolContext ctx, ASObject obj) {
    this.mesh = obj.data;
    this.verts = new GArray<Vertex>();
    this.startcos = new GArray<Vector3>();
    this.faces = new set<Face>();
    this.loops = new set<Face>();
    
    var faces = this.faces;
    var loops = this.loops;
    
    var i = 0;
    var scos = this.startcos;
    var is_static = false;
    for (var v in this.mesh.verts.selected) {
      v.td_sco.load(v.co);
      
      if ((v.flag & Flags.SELECT) == 0) continue;
      this.center.add(v.co);
      this.verts.push(v);
      
      scos.push(new Vector3(v.co));
    
      for (var l in v.loops) {
        faces.add(l.f);
        loops.add(l);
      }
      i++;
    }
    
    this.loops = g_list<Loop>(this.loops);

    this.center.divideScalar(this.verts.length);
    this.length = this.verts.length;
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
var float c = 1.0;
var Array<float> xclr = [c, 0.0, 0.0, 0.5];
var Array<float> yclr = [0.0, c, 0.0, 0.5];
var Array<float> zclr = [0.0, 0.0, c, 0.5];
var Array<Array<float>> axclrs = [xclr, yclr, zclr];

class TransformOp extends ToolOp {
  constructor(String apiname, String uiname, int mode, String description, int icon) {
    ToolOp.call(this, apiname, uiname, description, icon);
    
    if (mode & EditModes.GEOMETRY)
      this.datatype = TransMeshType;
    else
      this.datatype = TransObjectType;
    
    this.selecting_axis = false;
    this.constrain_plane = false;
    
    //called in on_mousemove, used to implement things like switching 
    //from drag translate to multitouch rotate/zoom
    //prototype: function(transformop, event, function_to_cancel_op);
    this.cancel_callback = undefined;
    this.cached_cancel_func = undefined;
    
    this.first_mdown = true;
    
    this.axis_drawlines = new GArray<drawline>();
    this.axis_scent = null;
    this.axis_line1 = null;
    this.axis_line2 = null;
    this._undo = {};
  }

  static default_slots(ASObject obj, int mode, ASObject asob) {
    obj.inputs.datamode = selectmode_enum.copy();
    obj.inputs.datamode.flag |= TPropFlags.PRIVATE;
    obj.inputs.object = new DataRefProperty(asob, DataTypes.OBJECT, "object", "Object", "Object to transform", undefined);
    obj.inputs.objects = new RefListProperty([], DataTypes.OBJECT, "objects", "Objects", "Objects to transform, if applicable", undefined);
    
    if (mode != 0)
      obj.inputs.datamode.set_data(mode);
  } 
  
  exec_pre(ToolContext ctx) {
    if (this.inputs.datamode.get_value() & EditModes.GEOMETRY)
      this.datatype = TransMeshType;
    else
      this.datatype = TransObjectType;
  }
  
  cancel(ctx) {
    g_app_state.toolstack.toolop_cancel(this);
  }
  
  gen_transdata(ToolContext ctx) : TransData {
    if (this.inputs.datamode.get_value() & EditModes.GEOMETRY)
      this.datatype = TransMeshType;
    else
      this.datatype = TransObjectType;
    
    if (DEBUG.transform) {
      console.log("1-", ctx.object);
      console.log("2-", this.inputs.object.data);
      console.log("3-", this.inputs.object.get_block(ctx));
    }
    return new TransData(ctx, this, this.inputs.object.get_block(ctx), 
                          this.inputs.object.data, this.inputs.datamode.data);
  }
 
  undo_pre(Context ctx) {
    this.datatype.undo_pre(this, this.transdata, ctx);
  }

  undo(Context ctx) {
    this.datatype.undo(this, this.transdata, ctx);
  }
  
  do_normals(ToolContext ctx) {
    var td = this.transdata;
    var verts = td.verts;
    var mesh = ctx.mesh;
    
    for (var l in td.loops) {
      l.v.flags |= Flags.DIRTY;
      l.flags |= Flags.DIRTY;
      l.e.flags |= Flags.DIRTY;
      l.f.flag |= Flags.DIRTY;
      if (l.f.totvert > 4 || verts.length < 20)
          l.f.recalc_normal();    
    }
    
    if (verts.length > 20 && this.modal_ctx != undefined) {
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
      
      g_app_state.jobs.queue_replace(job, start_func);
    } else {
      for (var i=0; i<verts.length; i++) {
        verts[i].recalc_normal(false);
      }
    }
  }
  
  modal_init(Context ctx) {
    this.first_mdown = true;
    this.inputs.object.set_data(ctx.object);
    this.inputs.datamode.set_data(ctx.view3d.selectmode);
  }
  
  on_mousemove(MouseEvent event) {
    var this2 = this;
    function cancel_func() {
      this2.cancel_callback = undefined; //ensure no double calls
      this2.end_modal();
      this2.cancel();
    }
    
    if (this.cancel_callback != undefined) {
      this.cancel_callback(this, event, cancel_func);
    }
    
    if (this.first_call == true) {
      this.first_call = false;
      this.start_mpos = new Vector3([event.x, event.y, 0]);
      this.start_mpos[0] = (this.start_mpos[0]/(this.modal_ctx.view3d.size[0]/2)) - 1.0;
      this.start_mpos[1] = (this.start_mpos[1]/(this.modal_ctx.view3d.size[1]/2))  - 1.0;
    }

    var mstart = new Vector3(this.start_mpos);

    var mend = new Vector3([event.x, event.y, 0.0]);
    mend[0] = (mend[0]/(this.modal_ctx.view3d.size[0]/2)) - 1.0;
    mend[1] = (mend[1]/(this.modal_ctx.view3d.size[1]/2)) - 1.0;

    this.mv1 = mstart;
    this.mv2 = mend;
    
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
          var dis = (1.0 - Math.abs(n1.dot(n2)));
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
        this.inputs.axis.data = new Vector3([1.0, 1.0, 1.0]);
        this.inputs.axis.data[apick] = 0.0;
      } else {
        this.inputs.axis.data = new Vector3();
        this.inputs.axis.data[apick] = 1.0;
      }      
    }
    
    this.exec(this.modal_tctx);
  }

  gen_axis(Vector3 axis, Vector3 center) : Array<drawline> {
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

  set_selecting_axis() {
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

    var cent = new Vector3(this.mv2);
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

  on_mousedown(MouseEvent event) {
    if (g_app_state.was_touch && this.first_mdown) {
      this.first_mdown = false;
      this.first_call = false;
      this.start_mpos = new Vector3([event.x, event.y, 0]);
      this.start_mpos[0] = (this.start_mpos[0]/(this.modal_ctx.view3d.size[0]/2)) - 1.0;
      this.start_mpos[1] = (this.start_mpos[1]/(this.modal_ctx.view3d.size[1]/2)) - 1.0;
      if (this.transdata != undefined)
        this.transdata.start_mpos = this.start_mpos;
      //this.mv1 = [this.start_mpos[0], this.start_mpos[1]];
    }
    
    if (event.button == 1) {
      this.selecting_axis = 1;
      this.set_selecting_axis();
    }
  }

  end_modal() {
    if (this.inputs.datamode.data & EditModes.GEOMETRY) 
      this.do_normals(this.modal_ctx);
    
    for (var dl in this.axis_drawlines) {
      this.modal_ctx.view3d.kill_drawline(dl);
    }
    
    if (this.axis_line1 != null) this.modal_ctx.view3d.kill_drawline(this.axis_line1);
    if (this.axis_line2 != null) this.modal_ctx.view3d.kill_drawline(this.axis_line2);
      
    this.axis_drawlines = new GArray();
    
    prior(TransformOp, this).end_modal.call(this);
    //prior.end_modal.call(this);
  }

  on_keydown(MouseEvent event) {
    this.constrain_plane = event.shiftKey;
    var apick = -1;
    
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
        this.inputs.axis.data = new Vector3([1.0, 1.0, 1.0]);
        this.inputs.axis.data[apick] = 0.0;
      } else {
        var ret = this.gen_axis(apick, this.transdata.center);
        this.axis_line1 = ret[0];
        this.axis_line2 = ret[1];
        this.axis_line1.clr = axclrs[apick];
        this.axis_line2.clr = axclrs[apick];
        
        
        this.inputs.axis.data = new Vector3();
        this.inputs.axis.data[apick] = 1.0;
      }
    }
  }

  on_keyup(MouseEvent event) {
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

  on_mouseup(MouseEvent event) {
    if (DEBUG.modal)
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
}
