"use strict";

function MeshEditor(view3d) {
  var keymap = new KeyMap();
  ObjectEditor.call(this, "Geometry", EditModes.GEOMETRY, DataTypes.MESH, keymap);
  
  this.selectmode = MeshTypes.VERT;
  this.last_selectmode = 0;
  
  var sm = this.selectmode;
  if (sm!= 2 && sm != 4 && sm != 8) this.selectmode = MeshTypes.VERT;

  this.view3d = view3d;
  
  this.use_subsurf = 0 : Boolean;
  this.ss_mesh = undefined : Mesh;
  this.ctx = undefined : Context;
  this.gl = undefined : WebGLRenderingContext;
  this.drawmats = undefined : DrawMats;
  
  this.define_keymap();
}
inherit(MeshEditor, ObjectEditor);

MeshEditor.STRUCT = """
  MeshEditor {
    selectmode : int;
    use_subsurf : int;
  }
"""

MeshEditor.fromSTRUCT = function(reader) {
  var m = new MeshEditor(undefined);
  reader(m);
  
  return m;
}

MeshEditor.prototype.render_selbuf = function(gl, view3d, typemask) {
    if (this.ss_mesh) 
      subsurf_selbuf_render(this.gl, this.ss_mesh, this.mesh, this.drawmats, 
                            (this.selectmode|MeshTypes.FACE|typemask));
    else
      render_mesh_selbuf(this.gl, this.mesh, this.drawmats, 
                       (this.selectmode|MeshTypes.FACE|typemask));
}

MeshEditor.prototype.selbuf_changed = function(typemask) {
  return this.last_selectmode != (this.selectmode|typemask);
}

MeshEditor.prototype.reset_selbuf_changed = function(typemask) {
  this.last_selectmode = this.selectmode|typemask;
}

//returns number of selected items
MeshEditor.prototype.do_select = function(event, mpos, view3d) {
  
}

MeshEditor.prototype.gen_sidebar1 = function(view3d) {
}

MeshEditor.prototype.gen_bottombar = function(view3d) {
}


MeshEditor.prototype.check_subsurf = function(Context ctx) {
  if (this.use_subsurf && this.ss_mesh)
    return;
  if (!this.use_subsurf && this.ss_mesh == null)
    return;
    
  if (this.use_subsurf) {
      if (!this.ss_mesh) {
        ctx.mesh.regen_render();
        
        this.ss_mesh = gpu_subsurf(this.gl, ctx.mesh, this.get_ss_steps());
      }
    } else {
      if (ctx.view3d.ss_mesh) {
        destroy_subsurf_mesh(this.gl, this.ss_mesh);
        
        this.ss_mesh = null;
        ctx.mesh.regen_render();
      }
    }  
}

MeshEditor.prototype.draw_object = function(gl, view3d, object, is_active)
{
  this.ctx = new Context(view3d);
  this.mesh = this.ctx.mesh;
  this.gl = gl;
  
  this.drawmats = view3d.drawmats;
  this.check_subsurf(this.ctx);
  this.ss_steps = 24;
  
  this.mesh.update_callback(view3d, function(view3d, mesh, event) {
    if (event == MeshEvents.RECALC) {
      if (mesh.render.recalc & (RecalcFlags.REGEN_TESS|RecalcFlags.REGEN_COS)) 
      {
        view3d.redo_selbuf = true;
      }
    }
  });
  
  this.gl = gl;
  if (this.ss_mesh != null) {
    //console.log("face length: ", this.ss_mesh.faces.length);
    var steps = this.get_ss_steps();
    var ss_recalc = this.mesh.render.recalc;
    
    if (steps != this.last_steps) {
      this.last_steps = steps;
      ss_recalc |= RecalcFlags.REGEN_TESS;
    }
    
    if ((ss_recalc & RecalcFlags.REGEN_TESS)==0)
      this.mesh.render.recalc &= ~RecalcFlags.REGEN_NORS;

    if (ss_recalc != 0) {
      if (ss_recalc != RecalcFlags.REGEN_COLORS) {
        if (ss_recalc & RecalcFlags.REGEN_TESS) {
          destroy_subsurf_mesh(gl, this.ss_mesh);
          this.ss_mesh = gpu_subsurf(gl, this.mesh, steps);
        } else {
          this.ss_mesh = gpu_subsurf(gl, this.mesh, steps, this.ss_mesh);
        }
      }
      
      if (ss_recalc & RecalcFlags.REGEN_TESS)
        this.mesh.flag |= MeshFlags.USE_MAP_CO;
      
      gen_mesh_render(gl, this.mesh, this.mesh.render.drawprogram, this.mesh.render.vertprogram, this.mesh.render.recalc);        
    }
    
    this.mesh.flag |= MeshFlags.USE_MAP_CO;
    
    if (0) {
      subsurf_selbuf_render(this.gl, this.ss_mesh, this.mesh, this.drawmats, 
                          (this.selectmode|MeshTypes.FACE));
    } else {
      subsurf_render(gl, view3d, this.ss_mesh, this.mesh, 
                     this.drawmats, !view3d.use_backbuf_sel);
    }
  } else {
    this.mesh.flag &= ~MeshFlags.USE_MAP_CO;
    render_mesh(gl, view3d, this.mesh, this.drawmats, !view3d.use_backbuf_sel); 
  }
}

MeshEditor.prototype.build_sidebar1 = function(view3d)
{
  var ctx = new Context(view3d);
  var row = new RowFrame(ctx);
  
  row.size = [115, view3d.size[1]-50]
  row.draw_background = true
  row.rcorner = 100.0
  row.pos = [0, 28]
  
  view3d.cols.push(row);
  view3d.add(row);
  
  row.toolop("screen.area_split_tool()", PackFlags.INHERIT_WIDTH);
  row.label("");
  
  row.toolop("mesh.subdivide(faces=mesh_selected(f))", PackFlags.INHERIT_WIDTH);
  row.toolop("mesh.translate()", PackFlags.INHERIT_WIDTH);
  row.toolop("mesh.extrude()", PackFlags.INHERIT_WIDTH);
  row.toolop("mesh.rotate()", PackFlags.INHERIT_WIDTH);
  row.toolop("mesh.scale()", PackFlags.INHERIT_WIDTH);
  row.toolop("mesh.flip_normals(faces=mesh_selected(f))", PackFlags.INHERIT_WIDTH);
  row.toolop("mesh.triangulate(faces=mesh_selected(f))", PackFlags.INHERIT_WIDTH);
  row.toolop("mesh.tri2quad(faces=mesh_selected(f))", PackFlags.INHERIT_WIDTH);
  row.toolop("mesh.duplicate_transform()", PackFlags.INHERIT_WIDTH);
  row.toolop("mesh.bridge_edges(edges=mesh_selected(e))", PackFlags.INHERIT_WIDTH);
  row.toolop("mesh.vertsmooth(verts=mesh_selected(v))", PackFlags.INHERIT_WIDTH);
  
  row.label("Last Tool:", false)
  row.add(new ToolOpFrame(ctx, "last_tool"), PackFlags.INHERIT_WIDTH);
}

MeshEditor.prototype.build_bottombar = function(view3d)
{
  var ctx = new Context(view3d);
  var col = new ColumnFrame(ctx);
  
  col.draw_background = true;
  col.rcorner = 100.0
  col.pos = [0,0]
  col.size = [view3d.size[0], 30];
  
  col.prop("view3d.use_subsurf");
  
  //col.add(new UIMenuLabel(this.ctx, "File", undefined, gen_file_menu));
  col.label("  |  Select Mode:  ");
  col.prop("view3d.selectmode");
  col.prop("view3d.use_backbuf_sel");
  col.label("  |   ");
  col.prop("view3d.zoomfac");
  
  view3d.rows.push(col);
  view3d.add(col);
}

MeshEditor.prototype.define_keymap = function() {
  var k = this.keymap;
  
  k.add_tool(new KeyHandler("F", [], "Create Face"),
             "mesh.context_create(verts=mesh_selected(v))");
  k.add_tool(new KeyHandler("D", ["SHIFT"], "Duplicate"), 
             "mesh.duplicate_transform()");
  k.add_tool(new KeyHandler("D", [], "Smooth Subdivide"), 
             "mesh.smooth_subdivide(faces=mesh_selected(f))");
  k.add_tool(new KeyHandler("Y", [], "Connect"), 
             "mesh.vert_connect(verts=mesh_selected(v))");
  k.add_tool(new KeyHandler("E", [], "Extrude"), 
             "mesh.extrude(geometry=mesh_selected(vef))");
  k.add_tool(new KeyHandler("L", [], "Remove Duplicate Verts"), 
             "mesh.remove_doubles(verts=mesh_selected(v))");
  k.add_tool(new KeyHandler("A", [], "Toggle Select All"), 
             "mesh.toggle_select_all()");
  k.add_func(new KeyHandler("A", ["SHIFT"], "Add"), 
             function(ctx) {
              ctx.view3d.add_menu();
             });
  k.add_tool(new KeyHandler("C", [], "Circle Select"), 
             "view3d.circle_select()");
  k.add(new KeyHandler("X", [], "Delete Menu"), new FuncKeyHandler(function (ctx) {
    ctx.view3d.delete_menu(new MyMouseEvent(ctx.keymap_mpos[0], ctx.keymap_mpos[1], 0));
  }));
  k.add(new KeyHandler("Delete", [], "Delete Menu"), new FuncKeyHandler(function (ctx) {
    ctx.view3d.delete_menu(new MyMouseEvent(ctx.keymap_mpos[0], ctx.keymap_mpos[1], 0));
  }));
  k.add(new KeyHandler("F", ["CTRL"], "Face Menu"), new FuncKeyHandler(function(ctx) {
    var mpos = ctx.keymap_mpos;
    ctx.view3d.rightclick_menu_face({x : mpos[0], y : mpos[1]});
  }));
  k.add(new KeyHandler("E", ["CTRL"], "Edge Menu"), new FuncKeyHandler(function(ctx) {
    var mpos = ctx.keymap_mpos;
    ctx.view3d.rightclick_menu_edge({x : mpos[0], y : mpos[1]});
  }));
  k.add(new KeyHandler("V", ["CTRL"], "Vertex Menu"), new FuncKeyHandler(function(ctx) {
    var mpos = ctx.keymap_mpos;
    ctx.view3d.rightclick_menu_vert({x : mpos[0], y : mpos[1]});
  }));
  k.add(new KeyHandler("W", [], "Tools Menu"), new FuncKeyHandler(function(ctx) {
    var mpos = ctx.keymap_mpos;
    ctx.view3d.tools_menu(ctx, mpos);
  }));
  k.add(new KeyHandler("E", ["SHIFT"], "Toggle Subsurf"), new FuncKeyHandler(function(ctx) {
    console.log("subsurf");
    if (ctx.view3d.ss_mesh == null) {
      ctx.mesh.regen_render();
      ctx.view3d.ss_mesh = gpu_subsurf(ctx.view3d.gl, ctx.mesh, ctx.view3d.get_ss_steps());
    } else {
      destroy_subsurf_mesh(ctx.view3d.gl, ctx.view3d.ss_mesh);
      ctx.view3d.ss_mesh = null;
      ctx.mesh.regen_render();
    }
  }));
  k.add(new KeyHandler("T", [], "Toggle Select Mode"), new FuncKeyHandler(function(ctx) {
    var mode = ctx.view3d.selectmode;
    if (mode == MeshTypes.VERT)
      mode = MeshTypes.EDGE;
    else if (mode == MeshTypes.EDGE)
      mode = MeshTypes.FACE;
    else if (mode == MeshTypes.FACE)
      mode = MeshTypes.VERT;
      
    ctx.view3d.set_selectmode(mode);
  }));
}
