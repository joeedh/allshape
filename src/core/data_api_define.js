var selectmode_enum = new EnumProperty("FACE", 
  {
    VERT : EditModes.VERT, 
    EDGE : EditModes.EDGE,
    FACE : EditModes.FACE,
    OBJECT : EditModes.OBJECT
  }, 
  "selmode", "Select Mode", "Selection mode");

selectmode_enum.add_icons({
  VERT : Icons.VERT_SEL,
  EDGE : Icons.EDGE_SEL,
  FACE : Icons.FACE_SEL,
  OBJECT : Icons.OBJECT_SEL
});

selectmode_enum.ui_value_names = {
  VERT: "Vertices", 
  EDGE: "Edges", 
  FACE: "Faces",
  OBJECT : "Object"
 };

var csg_mode_enum = new EnumProperty("SUBTRACT",
  {
    SUBTRACT : CsgModes.SUBTRACT,
    INTERSECT : CsgModes.INTERSECT,
    UNION : CsgModes.UNION
  },
  "csg_mode", "CSG Mode", "CSG Mode");

csg_mode_enum.ui_value_names = {
    SUBTRACT : "Subtract",
    INTERSECT : "Intersect",
    UNION : "Union"
}

function api_define_view3d() {
  var selmode = selectmode_enum.copy();
  
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

    view3d.gen_rendermats();
    view3d.update_selbuf();
  }
  
  var use_backbuf_sel = new BoolProperty(false, "use_backbuf_sel", "Cull Select", "Cull backface geometry when selecting");
  
  use_backbuf_sel.update = function() {
    this.ctx.view3d.use_backbuf_sel = this.data;
  }
  
  var framerate_prop = new FloatProperty(0, "framerate", "Frame Rate", 
                                            "Number of frames rendered each secon", 
                                            [0, 250], [0, 250]);
  
  var test_flagprop = new FlagProperty(1, {FLAG_1 : 1, FLAG_2 : 2, FLAG_3 : 4, FLAG_4 : 3}, undefined, "flagprop", "Flag Property", "");
  
  View3DStruct = new DataStruct([
    new DataPath(selmode, "selectmode", "selectmode", true),
    new DataPath(zoomfac, "zoomfac", "zoomfac", true),
    new DataPath(framerate_prop, "framerate", "framerate", true),
    new DataPath(use_backbuf_sel, "use_backbuf_sel", "use_backbuf_sel", 
    true)
  ])
  
  return View3DStruct;
}

function api_define_mesh() {

  var totvert = new IntProperty(0, "totvert", "Verts", 
                                            "Number of vertices in this mesh", 
                                            [0, 60000000], [0, 60000000]);

  var totedge = new IntProperty(0, "totedge", "Edges", 
                                            "Number of edges in this mesh", 
                                            [0, 60000000], [0, 60000000]);

  var totface = new IntProperty(0, "totface", "Faces", 
                                            "Number of faces in this mesh", 
                                            [0, 60000000], [0, 60000000]);
  var tottri = new IntProperty(0, "tottri", "Tris", 
                                            "Number of triangles in this mesh", 
                                            [0, 60000000], [0, 60000000]);

                                            
  MeshStruct = new DataStruct([
    new DataPath(totvert, "totvert", "verts.length", true),
    new DataPath(totedge, "totedge", "edges.length", true),
    new DataPath(totface, "totface", "faces.length", true),
    new DataPath(tottri, "tottri", "looptris.length", true)
  ]);
  
  return MeshStruct;
}

var SceneStruct = undefined;
function api_define_scene() {
  var name = new StringProperty("", "name", "name", "Name", TPropFlags.LABEL);
  var SceneStruct = new DataStruct([
    new DataPath(name, "name", "name", true)
  ]);
  
  return SceneStruct;
}

var ObjectStruct = undefined;
function api_define_object() {
  
  var name = new StringProperty("", "name", "name", "Name", TPropFlags.LABEL);
  var use_subsurf = new BoolProperty(false, "use_subsurf", "Use Subsurf", "Enable subdivision surface rendering");
  var use_csg = new BoolProperty(false, "use_csg", "Enable CSG", "Enable CSG rendering")
  var csg_mode = csg_mode_enum.copy();
  
  csg_mode.update = function() {
    this.ctx.object.csg_mode = this.values[this.data];
  }
  
  var ObjectStruct = new DataStruct([
    new DataPath(name, "name", "name", true),
    new DataPath(use_subsurf, "use_subsurf", "subsurf", true),
    new DataPath(use_csg, "use_csg", "csg", true),
    new DataPath(csg_mode, "csg_mode", "csg_mode", true)
  ]);
  
  return ObjectStruct;
}

var AppStateStruct = undefined;
function api_define_appstate() {
  var sel_multiple_mode = new BoolProperty(false, "select_multiple", "Multiple", "Select multiple elements");
  var sel_inverse_mode = new BoolProperty(false, "select_inverse", "Deselect", "Deselect Elements");
    
  AppStateStruct = new DataStruct([
    new DataPath(sel_multiple_mode, "select_multiple", "select_multiple", true),
    new DataPath(sel_inverse_mode, "select_inverse", "select_inverse", true)
  ]);
  
  return AppStateStruct;
}

var ContextStruct = undefined;
function api_define_context() {
  ContextStruct = new DataStruct([
    new DataPath(api_define_view3d(), "view3d", "ctx.view3d", false),
    new DataPath(api_define_mesh(), "mesh", "ctx.mesh", false),
    new DataPath(api_define_object(), "object", "ctx.object", false),
    new DataPath(api_define_scene(), "scene", "ctx.scene", false),
    new DataPath(new DataStruct([]), "last_tool", "", false, false, DataFlags.RECALC_CACHE),
    new DataPath(api_define_appstate(), "appstate", "ctx.appstate", false)
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
      return new TranslateOp(EditModes.GEOMETRY, ctx.object);
    },
    
    "mesh.rotate": function(ctx, args) {
      return new RotateOp(EditModes.GEOMETRY, ctx.object);
    },
    
    "mesh.scale": function(ctx, args) {
      return new ScaleOp(EditModes.GEOMETRY, ctx.object);
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
      macro.description = op.description;
      macro.icon = op.icon;
      
      var transop = new TranslateOp(EditModes.GEOMETRY)
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
      
      macro.description = meshop.description;
      
      macro.add_tool(op);
      macro.icon = meshop.icon;
      
      var transop = new TranslateOp(EditModes.GEOMETRY)
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
    "mesh.edgeloop_select" : function(ctx, args) {
      return new EdgeLoopOp();
    },
    "mesh.edgeloop_select_modal" : function(ctx, args) {
      return new EdgeLoopOpModal();
    },
    "mesh.faceloop_select" : function(ctx, args) {
      return new FaceLoopOp();
    },
    "mesh.faceloop_select_modal" : function(ctx, args) {
      return new FaceLoopOpModal();
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
    "mesh.normals_outside" : function(ctx, args) {
      if (!("faces" in args))
        throw TinyParserError;
      
      return new MeshToolOp(new OutsideNormalsOp(args["faces"]));
    },
    "view3d.circle_select" : function(ctx, args) {
      return new CircleSelectOp(ctx.view3d.selectmode);
    },
    "appstate.open" : function(ctx, args) {
      return new FileOpenOp();
    },
    "appstate.export_stl" : function(ctx, args) {
      return new FileSaveSTLOp();
    },
    "appstate.save" : function(ctx, args) {
      return new FileSaveOp();
    },
    "appstate.save_as" : function(ctx, args) {
      return new FileSaveAsOp();
    },
    "appstate.new" : function(ctx, args) {
      return new FileNewOp();
    },
    "screen.area_split_tool" : function(ctx, args) {
      return new SplitAreasTool(g_app_state.screen);
    },
    
    "screen.hint_picker" : function(ctx, args) {
      return new HintPickerOp();
    },
    
    "object.toggle_select_all" : function(ctx, args) {
      return new ToggleSelectObjOp("auto");
    },
    
    "object.translate": function(ctx, args) {
      return new TranslateOp(EditModes.OBJECT, ctx.object);
    },
    
    "object.rotate": function(ctx, args) {
      return new RotateOp(EditModes.OBJECT);
    },  
    
    "object.scale": function(ctx, args) {
      return new ScaleOp(EditModes.OBJECT);
    },
    
    "object.duplicate": function(ctx, args) {
      //XXX someday, will need to support passing in a list of objects
      //through the data api, too
      return new ObjectDuplicateOp(ctx.scene.objects.selected);
    },
    
    "object.set_parent": function(ctx, args) {
      //XXX someday, will need to support passing in a list of objects too
      var op = new ObjectParentOp();
      op.flag |= ToolFlags.USE_DEFAULT_INPUT;
      
      return op;
    },
    
    //XXX someday, will need to support passing in a list of objects too
    "object.delete_selected" : function(ctx, args) {
      var op = new ObjectDeleteOp();
      op.flag |= ToolFlags.USE_DEFAULT_INPUT;
      
      return op;
    }
  }
}