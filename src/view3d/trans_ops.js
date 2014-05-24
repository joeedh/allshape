"use strict";

class TranslateOp extends TransformOp {
  constructor(int mode, Object ob_active=undefined) {
    TransformOp.call(this, "translate", "Translate", mode, "Move selection", Icons.TRANSLATE);
    
    this.transdata = null;
    this.is_modal = true;
    
    this.inputs = {translation: new Vec3Property(new Vector3(), "translation", "Translation", "Amount of translation."), 
                   axis: new Vec3Property(new Vector3(), "cons_axis", "Constraint Axis", "Axis to constrain too during transform", TPropFlags.PRIVATE)}
    this.outputs = {translation: new Vec3Property(new Vector3(), "translation", "Translation", "Amount of translation.")}
    
    //XXX should set some sort of uirange instead? or is range uirange?
    this.inputs.translation.range = [-150.0, 150.0];
    
    if (ob_active == undefined)
      ob_active = (new Context()).object;
    
    TransformOp.default_slots(this, mode, ob_active);
    if (ob_active != undefined)
      this.inputs.object.set_data(ob_active);
  }
  
  /*creates 3d widgets, that either
     a), create a new toolop of this type
          whenever they are clicked, or
     b), creates a toolop of this type if
         the active tool isn't one already,
         otherwise edits the active toolop.
  */
  static create_widgets(ManipulatorManager manager, Context ctx) {
    var widget = manager.create()
    
    widget.arrow([1, 0, 0], 0, [1, 0, 0, 1]);
    widget.arrow([0, 1, 0], 1, [0, 1, 0, 1]);
    widget.arrow([0, 0, 1], 2, [0, 0, 1, 1]);
    
    function widget_on_tick(widget) {
      var mat = widget.matrix;
      var mesh = ctx.mesh;
      
      var cent = new Vector3();
      var len = 0;
      for (var v in mesh.verts.selected) {
        cent.add(v.co);
        len++;
      }
      
      if (len > 0)
        cent.mulScalar(1.0/len);
      
      mat.makeIdentity();
      mat.translate(cent[0], cent[1], cent[2]);
      mat.multiply(ctx.object.matrix);
    }
    
    this._widget_on_tick = widget_on_tick;
    
    widget.on_tick = widget_on_tick;
    widget.on_click = function(widget, id) {
      console.log("widget click: ", id);
      
      //prevent drag transform
      ctx.view3d._mstart = null;
      
      var toolop = new TranslateOp(EditModes.GEOMETRY, ctx.object);
      toolop.widgets.push(widget);
      
      var axis = new Vector3();
      axis[id] = 1.0;
      
      toolop.inputs.axis.set_data(axis);
      toolop.on_modal_end = function(toolop) {
        toolop.widgets = new GArray();
        widget.on_tick = widget_on_tick;
      }
      
      widget.on_tick = function() {
        if (toolop.transdata == undefined) return;
        
        var c = toolop.transdata.center;
        var t = toolop.inputs.translation.data;
        var mat = widget.matrix;
        
        mat.makeIdentity();
        mat.translate(c[0], c[1], c[2]);
        mat.translate(t[0], t[1], t[2]);
        mat.multiply(ctx.object.matrix);
      }
      
      g_app_state.toolstack.exec_tool(toolop);
    }        
  }
  
  /*forcably resets widgets to "default" state (the meaning of which
    may vary from tool to tool).*/
  static reset_widgets(ToolOp op, Context ctx) {
    if (op.widgets.length == 0) return;
    
    op.widgets = new GArray();
    op.widgets[0].on_tick = this._widget_on_tick;
  }
  
  can_call(ctx) {
    var totsel = 0;
    
    if (this.inputs.datamode.data & EditModes.GEOMETRY) {
      for (var v in ctx.mesh.verts) {
        if ((v.flag & Flags.SELECT) != 0)
          totsel++;
      }
      return totsel > 0;
    } else {
      return true;
    }
  }

  modal_init(ctx) {
    prior(TranslateOp, this).modal_init.call(this, ctx);
    
    this.transdata = this.gen_transdata(ctx);
    this.first_call = true;
    
    if (this.inputs.axis.data.vectorLength() > 0) {
      var axis = new Vector3(this.inputs.axis.data)
      
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

  cancel(ctx) {
    var td = this.transdata;
    
    if (this.datatype.reset) {
      for (var i=0; i<td.length; i++) {
        this.datatype.reset(td, i);
      }
    }
    
    this.datatype.update(td);
    TransformOp.prototype.cancel.call(this, ctx);
  }

  exec(ctx) {
    if (!this.is_modal)
      this.transdata = this.gen_transdata(ctx);

    var td = this.transdata;
    var vec = this.inputs.translation.data;
    
    if (this.inputs.datamode.data & EditModes.GEOMETRY) {
      for (var i=0; i<td.verts.length; i++) {
        var v = td.verts[i];
        var co = new Vector3(td.startcos[i]);
        co.add(vec);
        
        v.co = co;
      }
      
      this.do_normals(ctx);
      
      this.datatype.update(td);
    } else if (this.inputs.datamode.data == EditModes.OBJECT) {
      for (var i=0; i<td.objects.length; i++) {
        var obj = td.objects[i];
        var co = obj.loc;
        
        co.load(td.startcos[i]);
        co.add(vec);
        
        obj.recalc(RecalcFlags.TRANSFORM);
      }
    }
  }

  on_mousemove(event) {
    var td = this.transdata;
    
    if (!TransformOp.prototype.on_mousemove.call(this, event))
      return;
    
    var mstart = new Vector3(td.start_mpos);
    var mstart2d = new Vector3(mstart)
    mstart[2] = td.scenter[2];
    
    mstart.multVecMatrix(td.iprojmat)
    
    var mpos = new Vector3([event.x, event.y, td.scenter[2]]);
    mpos[0] = mpos[0]/(td.ctx.view3d.size[0]/2) - 1.0;
    mpos[1] = mpos[1]/(td.ctx.view3d.size[1]/2) - 1.0;

    var mend = new Vector3(mpos);
    var mend2d = new Vector3(mend)
    mend[2] = td.scenter[2];
    
    if (this.inputs.axis.data.dot(this.inputs.axis.data) > 0) {
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
      
      var n = this.inputs.axis.data;
      var axis = new Vector3(this.inputs.axis.data);
      
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
    
    if (!this.constrain_plane && this.inputs.axis.data.dot(this.inputs.axis.data) != 0.0) {
        var axis = new Vector3(this.inputs.axis.data);
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
        if (t2.dot(this.inputs.axis.data) < 0.0)
          t = -t;
        
        var vec = new Vector3(this.inputs.axis.data)
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
    
    this.inputs.translation.data = vec;
    this.exec(td.ctx);
  }
}

class RotateOp extends TransformOp {
  constructor(int mode) {
    TransformOp.call(this, "rotate", "Rotate", mode, "Rotate selection", Icons.ROTATE);
    
    this.transdata = null;
    this.is_modal = true;
    this.trackball = 0;
    this.rot_sum = 0.0;
    this.first = true;
    this.add_matrix = new Matrix4();
    this.cur_matrix = new Matrix4();
    
    this.mv1 = new Vector3();
    this.mv2 = new Vector3();
    this.mv3 = new Vector3();
    this.raxis = new Vector3();
    this.asp = 1.0;
    
    this.inputs = {
      rotation: new Vec4Property(new Vector4(), "rotation", "Quaternion", "Amount of rotation."), 
      axis: new Vec3Property(new Vector3(), "cons_axis", "Constraint Axis", "Axis to constrain too during transform", TPropFlags.PRIVATE)
    };
    
    this.outputs = {
      rotation: new Vec4Property(new Vector3(), "rotation", "Rotation", "Amount of rotation.")
    };
    
    TransformOp.default_slots(this, mode);
  }

  can_call(ctx) {
    var totsel = 0;
    
    for (var v in ctx.mesh.verts) {
      if ((v.flag & Flags.SELECT) != 0)
        totsel++;
    }
    
    return totsel > 0;
  }

  end_modal() {
    if (this.drawline1 != null)
      this.modal_ctx.view3d.kill_drawline(this.drawline1);
      
    if (this.drawline2 != null)
      this.modal_ctx.view3d.kill_drawline(this.drawline2);
    
    this.drawline1 = this.drawline2 = null;
    
    TransformOp.prototype.end_modal.call(this);
  }

  modal_init(ctx) {
    prior(RotateOp, this).modal_init.call(this, ctx);
    this.transdata = this.gen_transdata(ctx);
    this.first_call = true;
    
    this.drawline1 = ctx.view3d.new_drawline(new Vector3(), new Vector3());
    this.drawline2 = ctx.view3d.new_drawline(new Vector3(), new Vector3());
  }

  cancel(ctx) {
    var td = this.transdata;
    
    for (var i=0; i<td.verts.length; i++) {
      td.verts[i].co.load(td.startcos[i]);
    }
    
    td.mesh.regen_positions();
    td.mesh.regen_normals();
    
    TransformOp.prototype.cancel.call(this, ctx);
  }

  on_mousemove(event) {
    if (!TransformOp.prototype.on_mousemove.call(this, event))
      return;

    if (this.first) {
      this.first = false;
      this.mv3.load(this.mv1);
    }
     
    var ctx = this.modal_ctx;
    
    var matrix = new Matrix4(ctx.view3d.drawmats.cameramat);
    matrix.invert();
    
    this.raxis = new Vector3([matrix.$matrix.m31, matrix.$matrix.m32, matrix.$matrix.m33]);
    this.asp = this.modal_ctx.view3d.asp;
    
    var v1 = new Vector3(this.mv1);
    var v2 = new Vector3(this.mv2);
    var v3 = new Vector3(this.mv3);
    
    if (this.is_modal && v1.vectorDistance(v2) < 0.01)
      return;
    
    if (this.trackball) { //trackball
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
      this.inputs.rotation.set_data(new Vector4(q));
    } else { //simple rotation
      v1 = new Vector3(this.mv3);
      var cent = new Vector3(this.transdata.scenter);
      v1[2] = 0.0; v2[2] = 0.0;
      cent[2] = 0.0;
      
      if (this.drawline1 != null) {
        this.drawline1.v1.load(v1);
        this.drawline1.v2.load(cent);
        /*this.drawline2.v1.load(v2);
        this.drawline2.v2.load(cent);*/
      }
      
      var asp = this.asp;
      
      v1[1] /= asp;
      v2[1] /= asp;
      cent[1] /= asp;

      v1.sub(cent);
      v2.sub(cent);
      
      v1.normalize();
      v2.normalize();
      
      if (v1.vectorDistance(v2) < 0.005)
        return
        
      var axis = this.raxis;
      var ang = Math.acos(v1.dot(v2));
      
      q = new Quat();
      
      if (winding(v1, v2, cent)) {
        this.rot_sum += ang;
      } else {
        this.rot_sum -= ang;
      }

      q.axisAngleToQuat(axis, this.rot_sum);
      this.inputs.rotation.set_data(new Vector4(q));
      this.mv3.load(this.mv2);
    }
    
    //execute
    this.exec(this.modal_tctx);
  }

  on_keyup(event) {
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
      
      this.mv3.load(this.mv2);
      this.mv1.load(this.mv2);
      this.start_mpos = this.mv2;
    } else if (event.keyCode == 27) { //escape key
      this.end_modal();
      this.cancel();
    } else if (event.keyCode == 13) { //enter key
      this.end_modal();
    }
  }

  exec(ctx) {
    if (!this.is_modal)
      this.transdata = this.gen_transdata(ctx);
      
    var mat, q = new Quat();
    var td = this.transdata;
    
    q.load(this.inputs.rotation.data);
    q.normalize();
    var mat = q.toMatrix();
    
    for (var i=0; i<td.verts.length; i++) {
      var v = td.verts[i];
      
      v.co.load(td.startcos[i]);
      v.co.sub(td.center);
      v.co.multVecMatrix(this.add_matrix);
      v.co.multVecMatrix(mat);
      v.co.add(td.center);
    }
    
    this.do_normals(ctx);
    
    ctx.mesh.regen_positions();
    ctx.mesh.regen_normals();
  }
}

class ScaleOp extends TransformOp {
  constructor(int mode) {
    TransformOp.call(this, "scale", "Scale", mode, "Scale selection", Icons.SCALE);
    
    this.transdata = null;
    this.is_modal = true;
    this.first = true;
    
    this.inputs = {
      scale: new Vec3Property(new Vector3(), "scale", "Scale", "Amount of scale."),
      axis: new Vec3Property(new Vector3(), "cons_axis", "Constraint Axis", "Axis to constrain too during transform", TPropFlags.PRIVATE)
    };
      
    this.outputs = {
      scale: new Vec4Property(new Vector3(), "scale", "Scale", "Amount of scaling.")
    };
    
    TransformOp.default_slots(this, mode);
  }

  can_call(ctx) {
    var totsel = 0;
    
    for (var v in ctx.mesh.verts) {
      if ((v.flag & Flags.SELECT) != 0)
        totsel++;
    }
    
    return totsel > 0;
  }

  end_modal() {
    this.modal_ctx.view3d.kill_drawline(this.drawline1);
    this.modal_ctx.view3d.kill_drawline(this.drawline2);
    TransformOp.prototype.end_modal.call(this);
  }

  modal_init(ctx) {
    prior(ScaleOp, this).modal_init.call(this, ctx);
    this.transdata = this.gen_transdata(ctx);
    this.first_call = true;
    
    this.drawline1 = ctx.view3d.new_drawline(new Vector3(), new Vector3());
    this.drawline2 = ctx.view3d.new_drawline(new Vector3(), new Vector3());
  }

  cancel(ctx) {
    var td = this.transdata;
    
    for (var i=0; i<td.verts.length; i++) {
      td.verts[i].co.load(td.startcos[i]);
    }
    
    td.mesh.regen_positions();
    td.mesh.regen_normals();
    
    TransformOp.prototype.cancel.call(this, ctx);
}

  on_mousemove(event) {
    if (!TransformOp.prototype.on_mousemove.call(this, event))
      return;
    
    var ctx = this.modal_ctx;
    
    var v1 = new Vector3(this.mv1);
    var v2 = new Vector3(this.mv2);
    
    if (v1.vectorDistance(v2) < 0.01) {
      this.inputs.scale.data = new Vector3([1.0, 1.0, 1.0]);
      this.exec(this.modal_tctx);
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
    
    var cons_axis = new Vector3(this.inputs.axis.data);
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
    
    this.inputs.scale.data = new Vector3([fac, fac, fac]);
    this.inputs.scale.data.mul(cons_axis);
    this.exec(this.modal_tctx);
  }

  exec(ctx) {
    if (!this.is_modal)
      this.transdata = this.gen_transdata(ctx);
    
    var fac = this.inputs.scale.data;
    var mat = new Matrix4();
    
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
    
    this.do_normals(ctx);
    
    ctx.mesh.regen_positions();
    ctx.mesh.regen_normals();
  }
}
