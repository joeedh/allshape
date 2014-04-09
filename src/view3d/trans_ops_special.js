//stupid statics
_static_ilp_po = new PlaneOps(new Vector3([0,0,1]));
_static_ilp_n1 = new Vector3(); _static_ilp_n2 = new Vector3()
_static_ilp_n3 = new Vector3(); _static_ilp_n4 = new Vector3()
_static_ilp_c1 = new Vector3(); _static_ilp_v1 = new Vector3()
_static_ilp_v2 = new Vector3(); _static_ilp_v3 = new Vector3()
_static_ilp_v4 = new Vector3()
function inset_loop(loop, ispartial, no, fac) 
{
  var planeop = _static_ilp_po;
  planeop.reset_axis(no);
  
  var newcos = new GArray();
  for (var i=0; i<loop.length; i++) {
    var i0 = (i+loop.length-1) % loop.length;
    var i1 = i;
    var i2 = (i+1)%loop.length;
    
    var v0 = loop[i0];
    var v1 = loop[i1];
    var v2 = loop[i2];
    
    var co = new Vector3(v1.co);
    newcos.push(co);
    
    var n1 = _static_ilp_n1, n2=_static_ilp_n2, n3=_static_ilp_n3, n4=_static_ilp_n4;
    
    n1.load(v1.co).sub(v0.co).normalize();
    n2.load(v2.co).sub(v1.co).normalize();
    
    var c1 = _static_ilp_v1.zero(), c2=_static_ilp_v2.zero(), c3=_static_ilp_v3.zero(), c4=_static_ilp_v4.zero();
    n3.zero(); n4.zero();
    
    n3.load(n1).cross(no).normalize();
    n4.load(n2).cross(no).normalize();
    n3.mulScalar(-fac); n4.mulScalar(-fac);
    
    c1.load(v0.co); c2.load(v1.co); c3.load(v1.co); c4.load(v2.co);
    c1.add(n3); c2.add(n3); c3.add(n4); c4.add(n4);
    
    var ret = planeop.line_isect(c1, c2, c3, c4)
    
    if (ret[1] == LINECROSS) {
      co.load(ret[0]);
    } else {
      co.zero();
      co.add(c2).add(c3).mulScalar(0.5);
    }
  }
  
  for (var i=0; i<loop.length; i++) {
    loop[i].co.load(newcos[i]);
  }
}

class InsetOp extends TransformOp {
  constructor() {
    TransformOp.call(this, EditModes.GEOMETRY);
    
    this.uiname = "Inset"
    this.name = "inset"
    
    this.transdata = null;
    this.is_modal = true;
    this.first = true;
    
    this.inputs = {SCALE: new FloatProperty(0, "inset", "Inset", "Amount of insetting, in -1...1 range."),
    MV1: new Vec3Property(new Vector3(), "mvector1", "mvector1", "mvector1", TPropFlags.PRIVATE),
    MV2: new Vec3Property(new Vector3(), "mvector2", "mvector2", "mvector2", TPropFlags.PRIVATE),
    AXIS: new Vec3Property(new Vector3(), "cons_axis", "Constraint Axis", "Axis to constrain too during transform", TPropFlags.PRIVATE)};
    
    this.inputs.SCALE.range = [-2.0, 2.0];
    this.inputs.SCALE.ui_range = [-1.0, 1.0];
    
    TransformOp.default_slots(this, EditModes.GEOMETRY);
    
    this.outputs = {SCALE: new Vec4Property(new Vector3(), "inset", "Inset", "Amount of insetting, in -1..1 range.")}
    
    this._loops = new GArray();
    this.rangefac = 1.0;
  }

  can_call(ctx) {
    var totsel = 0;
    
    for (var e in ctx.mesh.edges) {
      if ((e.flag & Flags.SELECT) != 0)
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
    prior(InsetOp, this).modal_init.call(this, ctx);
    
    this.transdata = new TransData(ctx);
    this.first_call = true;
    
    this.drawline1 = ctx.view3d.new_drawline(new Vector3(), new Vector3());
    this.drawline2 = ctx.view3d.new_drawline(new Vector3(), new Vector3());
    
    this.find_loops(ctx);
  }

  find_loops(ctx) {
    var vdone = new set();
    var loops = new GArray();
    var mesh = ctx.mesh;
    var td = this.transdata;
    var vset = new set(td.verts);
    
    //note: the ends of the loops may or may not be connected
    for (var v1 in td.verts) {
      if (vdone.has(v1))
        continue;
      
      var v = v1;
      var vloop = new GArray([v1]); //loops may be partial loops
      var i =0;
      var cure = null;
      var e2;
      var no = new Vector3();
      var is_closed = false;
      do {
        var nv = null;
        
        if (cure != null && cure.loop != null) {
          var found = false;
          for (var l in cure.loops) {
            if (l.f.flag & Flags.SELECT) {
              found = true;
              no.add(l.f.no);
              break;
            }
          }
          if (!found) {
            no.add(cure.loop.f.no);
          }
        }
        
        vdone.add(v);
        
        var totfound=0;
        e2 = null;
        for (var e in v.edges) {
          var v2 = e.other_vert(v); 
          if (e != cure && vset.has(v2) && v2 == v1) {
            is_closed = true;
          }
          if (e != cure && !vdone.has(v2) && vset.has(v2)) {
            nv = v2;
            cure = e;
            break;
          }
        }
        
        if (nv == null) {
          break;
        }
        
        i++;
        if (i > 1000) { //XXX should be bigger value
          console.log("infinite loop");
          break;
        }
        
        vloop.push(nv);
        v = nv;
      } while (v != v1);
      
      if (vloop.length > 1) {
        if (!is_closed) {
          no.zero();
          for (var i=0; i<vloop.length; i++) {
            no.add(vloop[i].no);
          }
          no.normalize();
        }
        
        if (no.dot(no) == 0.0)  {
          no[2] = 1.0; //if no normal was found, use the global z axis
        }
        
        var cent = new Vector3();
        for (var i=0; i<vloop.length; i++) {  
          cent.add(vloop[i].co);
        }
        
        cent.mulScalar(1.0/vloop.length);
        
        var no2 = new Vector3();
        for (var i=0; i<vloop.length; i++) {
          var v1 = vloop[(i+vloop.length-1)%vloop.length];
          var v2 = vloop[i];
           
          no2.add(normal_tri(v1.co, v2.co, cent));
        }
        no2.normalize();
        if (no2.dot(no) > 0.0) {
          vloop.reverse();
        }
        
        if (no2.dot(no2) > feps*100) {
          no = no2.mulScalar(-1.0);
        }
        
        loops.push([vloop, is_closed, no]); //[vloop, is_partial_loop] pair
      }
    }
    
    console.log(loops.length)
    this._loops = loops;
    
    td.calc_aabb();
    var size = new Vector3(td.max).sub(td.min);
    
    this.rangefac = Math.pow(size[0]*size[1], 1.0/2.0);
    this.rangefac = (this.rangefac+Math.pow(size[1]*size[2], 1.0/2.0))*0.5;
    this.rangefac = 1.0; //XXX
    console.log(this.rangefac);
  }

  cancel(ctx) {
    var td = this.transdata;
    
    for (var i=0; i<td.verts.length; i++) {
      td.verts[i].co.load(td.startcos[i]);
    }
    
    td.mesh.regen_positions();
    td.mesh.regen_normals();
  }

  on_mousemove(event) {
    TransformOp.prototype.on_mousemove.call(this, event);
    
    var ctx = this.modal_ctx;
    
    var v1 = new Vector3(this.inputs.MV1.data);
    var v2 = new Vector3(this.inputs.MV2.data);
    
    if (v1.vectorDistance(v2) < 0.01)
      return;
    
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
    
    if (v1.vectorDistance(cent) < 0.001) {
      fac = v2.vectorDistance(cent)/(v1.vectorDistance(cent)+0.05);
    } else {
      fac = v2.vectorDistance(cent)/v1.vectorDistance(cent);
    }
    
    var n1 = new Vector3(v1).sub(cent);
    var n2 = new Vector3(v2).sub(cent);
    
    fac = 1.0 - fac;
    if (n1.dot(n2) < 0.0) {
      fac = -fac;
    }
    
    //clamp to -2, 1 range
    fac = Math.min(Math.max(fac, -2), 2); //XXX 2 should be 1
    
    this.inputs.SCALE.data = fac;
    this.exec(this.modal_ctx);
  }

  exec(ctx) {
    if (!this.is_modal) {
      this.transdata = new TransData(ctx);
      this.find_loops(ctx);
    }
    
    var fac = this.inputs.SCALE.data;
    var td = this.transdata;
    
    //clamp to -2, 2 range
    fac = Math.min(Math.max(fac, -2), 2);
    
    var verts = td.verts;
    var startcos = td.startcos
    for (var i=0; i<verts.length; i++) {
      verts[i].co.load(startcos[i]);
    }
    
    for (var l in this._loops) {
      var loop = l[0];
      var is_partial = l[1];
      var no = l[2];
      
      inset_loop(loop, is_partial, no, fac)
    }
    
    this.do_normals();
    
    ctx.mesh.regen_positions();
    ctx.mesh.regen_normals();
  }
}
