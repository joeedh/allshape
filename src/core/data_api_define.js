var mesh_selectmode_enum = new EnumProperty("FACE", {"VERT":MeshTypes.VERT, "EDGE":MeshTypes.EDGE, "FACE":MeshTypes.FACE}, "selmode", "Select Mode", "Selection mode")
mesh_selectmode_enum.ui_value_names = {"VERT": "Vertices", "EDGE": "Edges", "FACE": "Faces"}

function api_define_view3d() {
  var selmode = mesh_selectmode_enum.copy();
  
  selmode.update = function() {
    this.ctx.view3d.selectmode = this.values[this.data];
  }
  
  var zoomfac = new FloatProperty(0, "zoomfac", "Zoom", "Zoom Factor", [-7, 7], [-7, 7]);
  zoomfac.update = function() {
    var view3d = this.ctx.view3d;
    
    var zf = view3d.zoomfac;
    var r1 = view3d.zoom_wheelrange[0];
    var r2 = view3d.zoom_wheelrange[1];
    var r3 = view3d.zoom_range[0];
    var r4 = view3d.zoom_range[1];
    
    view3d.zoomwheel = (-r1*r4 + r1*zf + r2*r3 - r2*zf) / (r3 - r4);

    this.ctx.view3d.gen_rendermats();
  }
  
  var use_backbuf_sel = new BoolProperty(false, "use_backbuf_sel", "Cull Select", "Cull backface geometry when selecting");
  
  use_backbuf_sel.update = function() {
    this.ctx.view3d.use_backbuf_sel = this.data;
  }
  
  var framerate_prop = new FloatProperty(0, "framerate", "Frame Rate", 
                                            "Number of frames rendered each secon", 
                                            [0, 250], [0, 250]);
  
  var test_flagprop = new FlagProperty(1, {FLAG_1 : 1, FLAG_2 : 2, FLAG_3 : 4, FLAG_4 : 3}, undefined, "flagprop", "Flag Property", "");
  
  var subsurf_prop = new BoolProperty(false, "use_subsurf", "Subsurf", "Enable subdivision surfaces");
  
  subsurf_prop.update = function() {
    var ctx = this.ctx
    
    if (this.data) {
      if (!ctx.view3d.editor.ss_mesh) {
        ctx.mesh.flag |= MeshFlags.USE_MAP_CO;
        
        ctx.view3d.editor.ss_mesh = gpu_subsurf(ctx.view3d.gl, ctx.mesh, ctx.view3d.editor.get_ss_steps());
        
        ctx.mesh.regen_render();
        ctx.view3d.editor.use_subsurf = true;
      }
    } else {
      if (ctx.view3d.editor.ss_mesh) {
        ctx.mesh.flag &= ~MeshFlags.USE_MAP_CO;
        
        destroy_subsurf_mesh(ctx.view3d.gl, ctx.view3d.editor.ss_mesh);
        
        ctx.view3d.editor.ss_mesh = null;
        ctx.mesh.regen_render();
        ctx.view3d.editor.use_subsurf = false;
      }
    }    
  }
  
  View3DStruct = new DataStruct([
    new DataPath(selmode, "selectmode", "selectmode", true),
    new DataPath(zoomfac, "zoomfac", "zoomfac", true),
    new DataPath(framerate_prop, "framerate", "framerate", true),
    new DataPath(use_backbuf_sel, "use_backbuf_sel", "use_backbuf_sel", 
    true),
    new DataPath(subsurf_prop, "use_subsurf", "use_subsurf", true)
  ])
  
  return View3DStruct;
}

function api_define_mesh() {

  var totvert_prop = new IntProperty(0, "totvert", "Verts", 
                                            "Number of vertices in this mesh", 
                                            [0, 60000000], [0, 60000000]);

  var totedge_prop = new IntProperty(0, "totedge", "Edges", 
                                            "Number of edges in this mesh", 
                                            [0, 60000000], [0, 60000000]);

  var totface_prop = new IntProperty(0, "totface", "Faces", 
                                            "Number of faces in this mesh", 
                                            [0, 60000000], [0, 60000000]);
  var tottri_prop = new IntProperty(0, "tottri", "Tris", 
                                            "Number of triangles in this mesh", 
                                            [0, 60000000], [0, 60000000]);

  MeshStruct = new DataStruct([
    new DataPath(totvert_prop, "totvert", "verts.length", true),
    new DataPath(totedge_prop, "totedge", "edges.length", true),
    new DataPath(totface_prop, "totface", "faces.length", true),
    new DataPath(tottri_prop, "tottri", "looptris.length", true)
  ])
  
  return MeshStruct;
}

var AppStateStruct = undefined;
function api_define_appstate() {
  AppStateStruct = new DataStruct([
  ]);
  
  return AppStateStruct;
}

var ContextStruct = undefined;
function api_define_context() {
  ContextStruct = new DataStruct([
    new DataPath(api_define_view3d(), "view3d", "ctx.view3d", false),
    new DataPath(api_define_mesh(), "mesh", "ctx.mesh", false),
    new DataPath(new DataStruct([]), "last_tool", "", false, false),
    new DataPath(api_define_appstate(), "appstate", "appstate", false, false)
  ]);
}

function gen_path_maps(strct, obj, path1, path2) {//path is private, optional
  if (obj == undefined)
    obj = {}
  if (path1 == undefined) {
    path1 = "";
    path2 = "";
  }
  
  if (path1 != "")
    obj[path1] = strct;
  
  for (var p in strct.paths) {
    if (!(p.data instanceof DataStruct)) {
      if (p.use_path) {
        obj[path1+"."+p.path] = "r = " + path2+"."+p.path+"; obj["+path1+"].pathmap["+p.path+"]"
      } else {
        obj[path1+"."+p.path] = "r = undefined; obj["+path1+"].pathmap["+p.path+"]"
      }
    } else {
      gen_path_maps(p, obj, path1+p.name, path2+p.path);
    }
  }
}

data_ops_list = undefined;
function api_define_ops() {
  data_ops_list = {
    "mesh.subdivide": function(ctx, args) {
      if (!("faces" in args))
        throw TinyParserError;
        
      return new MeshToolOp(new QuadSubdOp(args["faces"], 1))
    },
    
    "mesh.inset": function(ctx, args) {
      if (!("faces" in args))
        throw TinyParserError;
      
      return new MeshToolOp(new InsetRegionsOp(args["faces"]))
    },
    
    "mesh.vertsmooth": function(ctx, args) {
      if (!("verts" in args))
        throw TinyParserError;
      
      return new MeshToolOp(new VertSmoothOp(args["verts"]));
    },
    
    "mesh.translate": function(ctx, args) {
      return new TranslateOp();
    },
    
    "mesh.rotate": function(ctx, args) {
      return new RotateOp();
    },
    
    "mesh.scale": function(ctx, args) {
      return new ScaleOp();
    },
    
    "mesh.inset_loops": function(ctx, args) {
      return new InsetOp();
    },
    
    "mesh.flip_normals": function(ctx, args) {
      if (!("faces" in args))
        throw TinyParserError;
      
      return new MeshToolOp(new FlipNormalsOp(args["faces"]));      
    },
    
    "mesh.kill_verts": function(ctx, args) {
      if (!("verts" in args))
        throw TinyParserError;
        
      return new MeshToolOp(new DeleteVertsOp(args["verts"]))
    },
    
    "mesh.kill_edges": function(ctx, args) {
      if (!("edges" in args))
        throw TinyParserError;
        
      return new MeshToolOp(new DeleteEdgesOp(args["edges"]))
    },
    
    "mesh.kill_faces": function(ctx, args) {
      if (!("faces" in args))
        throw TinyParserError;
        
      return new MeshToolOp(new DeleteFacesOp(args["faces"]))
    },
    
    "mesh.kill_regions": function(ctx, args) {
      if (!("faces" in args))
        throw TinyParserError;
        
      return new MeshToolOp(new DeleteFaceRegionOp(args["faces"]))
    },
    
     "mesh.split_edges": function(ctx, args) {
      if (!("edges" in args))
        throw TinyParserError;
        
      return new MeshToolOp(new ESubdivideOp(args["edges"], 1))
    },
    
    "mesh.smooth_subdivide" : function(ctx, args) {
      if (!("faces" in args))
        throw TinyParserError;
      
      var macro = new ToolMacro("Smooth Subdivide")
      
      var meshop = new QuadSubdOp(args["faces"], 1);
      var smoothop = new VertSmoothOp(new element_iter_convert(args["faces"], MeshTypes.VERT), 1);
      
      macro.add_tool(new MeshToolOp(meshop));
      macro.add_tool(new MeshToolOp(smoothop));
      
      return macro;
    },
    "mesh.vert_connect" : function(ctx, args) {
      if (!("verts" in args))
        throw TinyParserError;
        
      var meshop = new VertexConnectOp(args["verts"], 1);
      
      var op = new MeshToolOp(meshop);
      
      return op;
    },
    "mesh.remove_doubles" : function(ctx, args) {
      if (!("verts" in args))
        throw TinyParserError;
        
      var meshop = new RemoveDoublesOp(args["verts"]);
      
      var op = new MeshToolOp(meshop);
      return op;
    },    
    "mesh.inset_transform" : function(ctx, args) {
      if (!("faces" in args))
        throw TinyParserError;
        
      var meshop = new InsetRegionsOp(args["faces"]);
      
      var op = new MeshToolOp(meshop);
      var macro = new ToolMacro("inset", "Inset Regions");
      
      macro.add_tool(op);
      
      var transop = new InsetOp()
      macro.add_tool(transop);

      return macro;  
    },  
    "mesh.extrude" : function(ctx, args) {
      if (!("geometry" in args))
        throw TinyParserError;
      
      var meshop = new ExtrudeAllOp(args["geometry"]);
      
      var op = new MeshToolOp(meshop);
      var macro = new ToolMacro("extrude_grab", "Extrude");
      
      macro.add_tool(op);
      
      var transop = new TranslateOp()
      macro.add_tool(transop);

      macro.connect_tools(op.outputs.group_no, transop.inputs.AXIS);
      
      return macro;
    },
    "mesh.duplicate_transform" : function(ctx, args) {
      var meshop = new MeshDuplicateOp(ctx.mesh.selected);
      meshop.inputs.deselect_old.data = true;
      
      var op = new MeshToolOp(meshop);
      op.inputs.deselect_old.data = true;

      var macro = new ToolMacro("duplicate_transform", "Duplicate");
      
      macro.add_tool(op);
      
      var transop = new TranslateOp()
      macro.add_tool(transop);
      
      return macro;
    },
    "mesh.toggle_select_all" : function(ctx, args) {
      var op = new ToggleSelectAllOp();
      op.inputs.selmode.set_data(ctx.view3d.selectmode)
      
      return op;
    },
    "mesh.triangulate" : function(ctx, args) {
      if (!("faces" in args))
        throw TinyParserError;
        
      return new MeshToolOp(new TriangulateOp(args["faces"]));
    },
    "mesh.tri2quad" : function(ctx, args) {
      if (!("faces" in args))
        throw TinyParserError;
        
      return new MeshToolOp(new Tri2QuadOp(args["faces"]));
    }, 
    "mesh.add_cube" : function(ctx, args) {
      return new MeshToolOp(new AddCubeOp());
    }, 
    "mesh.add_circle" : function(ctx, args) {
      return new MeshToolOp(new AddCircleOp());
    },
    "mesh.dissolve_faces" : function(ctx, args) {
      if (!("faces" in args))
          throw TinyParserError;
          
      return new MeshToolOp(new DissolveFacesOp(args["faces"]));
    },
    "mesh.loopcut" : function(ctx, args) {
      return new LoopCutOp();
    },
    "mesh.context_create" : function(ctx, args) {
      if (!("verts" in args))
        throw TinyParserError;
        
      return new MeshToolOp(new ContextCreateOp(args["verts"]));
    },
    "mesh.toggle_subsurf" : function(ctx, args) {
      return new ToggleSubSurfOp();
    },
    "mesh.bridge_edges" : function(ctx, args) {
      if (!("edges" in args))
        throw TinyParserError;
      
      return new MeshToolOp(new BridgeOp(args["edges"]));
    },
    "view3d.circle_select" : function(ctx, args) {
      return new CircleSelectOp();
    },
    "appstate.open" : function(ctx, args) {
      return new FileOpenOp();
    },
    "appstate.save" : function(ctx, args) {
      return new FileSaveOp();
    },
    "appstate.save_as" : function(ctx, args) {
      return new FileSaveAsOp();
    },
    "screen.area_split_tool" : function(ctx, args) {
      return new SplitAreasTool(ctx.appstate.screen);
    }
  }
}