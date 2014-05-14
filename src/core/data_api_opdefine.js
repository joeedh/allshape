"use strict";

var data_ops_list = undefined;
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
      
      var macro = new ToolMacro("smooth_subdivide", "Smooth Subdivide")
      
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
      macro.icon = Icons.INSET_REGIONS;
      
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

      macro.connect_tools(op.outputs.group_no, transop.inputs.axis);
      
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
      
      return new MeshToolOp(new BridgeOp(args["edges"], args["faces"]));
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
    "appstate.export_al3_b64" : function(ctx, args) {
      return new FileSaveB64Op();
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