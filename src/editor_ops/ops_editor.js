"use strict";

class OpStackFrame extends RowFrame {
  constructor(Context ctx, Array<float> size) {
    RowFrame.call(this, ctx);
    
    this.pan_bounds = [[0, 0], [0, 0]];

    this.pos = [0, 0];
    this.size = size;
    this.build_ms = time_ms();
    this.last_undocur = g_app_state.toolstack.undocur;
    
    this.packflag |= PackFlags.IGNORE_LIMIT|PackFlags.ALIGN_TOP|PackFlags.NO_AUTO_SPACING;
    this.default_packflag |= PackFlags.INHERIT_WIDTH;
    
    //var test_panel = new UIPanel(ctx, "Test Panel");
    
    //test_panel.add(new UIButton(ctx, "test panel"));
    //test_panel.add(new UIButton(ctx, "test panel"));
    //test_panel.add(new UIButton(ctx, "test panel"));
    
    this.panelmap = new hashtable();
  }
  
  on_mousedown(MouseEvent event) {
    if (event.button == 1 && !g_app_state.was_touch) {
      this.start_pan(event, 1);
    } else {
      prior(OpStackFrame, this).on_mousedown.call(this, event);
    }
  }
  
  pack(UICanvas canvas, Boolean isVertical) {
    var minsize = this.get_min_size(canvas, isVertical);
    
    //this.pan_bounds[1][0] = minsize[0];
    this.pan_bounds[1][1] = Math.max(minsize[1]-this.size[1], 0);
    prior(OpStackFrame, this).pack.call(this, canvas, isVertical);
  }
  
  gen_panel(ToolOp tool, String path) {
    var panel = new UIPanel(this.ctx, tool.uiname);
     
    if (!(tool instanceof ToolMacro)) {
      var toolframe = new ToolOpFrame(this.ctx, path);
      toolframe.packflag |= PackFlags.INHERIT_WIDTH;
      panel.add(toolframe);
    } else {
      var i = 0;
      for (var t in tool.tools) {
        var subpanel = this.gen_panel(t, path+".tools["+i+"]");
        
        var col = panel.col();
        col.default_packflag &= ~PackFlags.INHERIT_WIDTH;
        col.packflag |= PackFlags.INHERIT_WIDTH; //default_packflag
        subpanel.packflag |= PackFlags.INHERIT_WIDTH;
        col.label(" "); 
        col.add(subpanel);
        //panel.add(subpanel);
        i++;
      }
    }
    
    return panel;
  }
  
  get_panel(ToolOp tool) {
    var undocur = g_app_state.toolstack.undocur;
    
    if (!this.panelmap.has(tool)) {
      var panel = this.gen_panel(tool, "operator_stack["+tool.stack_index+"]");
      this.add(panel);
      
      panel.collapsed = tool.stack_index != undocur-1;
      this.do_full_recalc();
      
      this.panelmap.set(tool, panel);
      return panel;
    }
    
    return this.panelmap.get(tool);
  }
  
  on_tick() {
    if (time_ms() - this.build_ms > 400) {
      this.build();
      this.build_ms = time_ms();
    }
    
    prior(OpStackFrame, this).on_tick.call(this);
  }
  
  is_selop(ToolOp op) : Boolean {
    var ret;
    
    if (op instanceof ToolMacro) {
      ret = true;
      
      for (var t in op.tools) {
        if (!this.is_selop(t)) {
          ret = false;
          break;
        }
      }
    } else {
      ret = op instanceof SelectOpAbstract;
      ret = ret || op instanceof SelectObjAbstract;
    }
    
    return ret;
  }
  
  build() {
    var oplist = g_app_state.toolstack.undostack;
    var pmap = this.panelmap;
    var keepset = new set();
    var undocur = g_app_state.toolstack.undocur;
    var reflow = false;
    var filter_sel = this.parent.filter_sel;
    
    /*update tool panels*/
    for (var tool in oplist) {
      if (filter_sel && this.is_selop(tool)) continue;
      //if (tool.undoflag & UndoFlags.UNDO_BARRIER) continue;
      //if (tool.flag & ToolFlags.HIDE_TITLE_IN_LAST_BUTTONS) continue;
      
      keepset.add(tool);
      if (!pmap.has(tool)) {
        reflow = true;
      }
      
      var panel = this.get_panel(tool);
      
      if (tool.stack_index == undocur-1) {
        //change panel color
        panel.color = uicolors["ActivePanel"];
      } else {
        panel.color = uicolors["CollapsingPanel"];
      }
      
      //auto-collapse panels
      if (tool.stack_index != undocur-1 && !panel.user_opened) {
        panel.collapsed = true;
      } else if (tool.stack_index == undocur-1 && !panel.user_closed) {
        panel.collapsed = false;
      }
    }
    
    /*remove any dead panels*/
    for (var tool in pmap) {
      if (!keepset.has(tool)) {
        var panel = pmap.get(tool);
        this.remove(panel);
        pmap.remove(tool);
      }
    }
    
    /*ensure panels are in correct order*/
    if (reflow) {
      for (var k in pmap) {
        var panel = pmap.get(k);
        this.remove(panel);
      }
      
      for (var tool in oplist) {
        if (!pmap.has(tool))
          continue;
         
        var panel = pmap.get(tool)
        this.add(panel);
      }
    }
  }
  
  build_draw(UICanvas canvas, Boolean isVertical) {
    prior(OpStackFrame, this).build_draw.call(this, canvas, isVertical);
  }
}


/******************* main area struct ********************************/
class OpStackEditor extends Area {
  constructor(x, y, width, height) {
    Area.call(this, OpStackEditor.name, OpStackEditor.uiname, new Context(), [x, y], [width, height]);

    this.keymap = new KeyMap();
    this.define_keymap();
    
    this.drawlines = new GArray<drawlines>();
    
    this._filter_sel = false;
    this.gl = undefined;
    this.ctx = new Context();
    
    this.subframe = new OpStackFrame(new Context(), this.size);
    this.subframe.pos = [0, 0]; //XXX this should work: [0, Area.get_barhgt()];
    this.subframe.canvas = new UICanvas([this.pos, this.size]);
    this.subframe.state |= UIFlags.HAS_PAN|UIFlags.IS_CANVAS_ROOT|UIFlags.PAN_CANVAS_MAT;
    this.subframe.velpan = new VelocityPan();
    
    this.prepend(this.subframe);
  }
  
  get filter_sel() : Boolean {
    return this._filter_sel;
  }
  
  set filter_sel(Boolean val) {
    this._filter_sel = !!val;
    this.subframe.do_full_recalc();
  }
  
  define_keymap() {
    var k = this.keymap;
    
    k.add(new KeyHandler("Z", ["CTRL", "SHIFT"], "Redo"), new FuncKeyHandler(function(ctx) {
      console.log("Redo")
      ctx.toolstack.redo();
    }));
    k.add(new KeyHandler("Y", ["CTRL"], "Redo"), new FuncKeyHandler(function(ctx) {
      console.log("Redo")
      ctx.toolstack.redo();
    }));
    k.add(new KeyHandler("Z", ["CTRL"], "Undo"), new FuncKeyHandler(function(ctx) {
      console.log("Undo");
      ctx.toolstack.undo();
    }));
  }
  
  static default_new(Context ctx, ScreenArea scr, WebGLRenderingContext gl, 
                     Array<float> pos, Array<float> size) : OpStackEditor
  {
    var ret = new OpStackEditor(pos[0], pos[1], size[0], size[1]);
    return ret;
  }
  
  on_area_inactive() {
    this.destroy();
    prior(OpStackEditor, this).on_area_inactive.call(this);
  }
    
  area_duplicate() : OpStackEditor {
    var ret = new OpStackEditor(this.pos[0], this.pos[1], this.size[0], this.size[1]);
    
    return ret;
  } 
  
  destroy() {
    this.subframe.canvas.destroy(g_app_state.gl);
    Area.prototype.destroy.call(this);
  }
  
  build_topbar()
  {
    this.ctx = new Context();
    
    var col = new ColumnFrame(this.ctx, undefined, PackFlags.ALIGN_LEFT);
    
    this.topbar = col;
    col.packflag |= PackFlags.IGNORE_LIMIT;
    
    col.size = [this.size[0], Area.get_barhgt()];
    col.draw_background = true
    col.rcorner = 100.0
    col.pos = [0, this.size[1]-Area.get_barhgt()]
    
    col.prop("opseditor.filter_sel", PackFlags.USE_SMALL_ICON);
    
    this.rows.push(col);
    this.add(col);
  }
  build_bottombar() {
    var ctx = new Context();
    var col = new ColumnFrame(ctx);
    
    col.packflag |= PackFlags.ALIGN_LEFT;
    col.default_packflag = PackFlags.ALIGN_LEFT;
    
      //IsMobile ? 12 : 12
    col.draw_background = true;
    col.rcorner = 100.0
    col.pos = [0, 2]
    col.size = [this.size[0], Area.get_barhgt()];
    
    col.add(gen_editor_switcher(this.ctx, this));
    
    this.rows.push(col);
    this.add(col);
  }
  
  build_draw(UICanvas canvas, Boolean isVertical) {
    prior(OpStackEditor, this).build_draw.call(this, canvas, isVertical);
  }
  
  set_canvasbox() {
    this.asp = this.size[0] / this.size[1];
    
    //Set the viewport and projection matrix for the scene
    gl.viewport(this.parent.pos[0], this.parent.pos[1], this.size[0], this.size[1]);
  }
  
  on_draw(WebGLRenderingContext gl, test) {
    this.subframe.set_pan();
    
    this.gl = gl;
    var ctx = this.ctx = new Context();
    
    //paranoid check
    this.subframe.size[0] = this.size[0];
    this.subframe.size[1] = this.size[1]-this.subframe.pos[1]-Area.get_barhgt();
    this.subframe.canvas.viewport = this.canvas.viewport; //set_viewport([this.parent.pos, this.parent.size]);
    
    //gl.getExtension("OES_TEXTURE_FLOAT");
    //this.draw_lines(gl)data;
    
    //scissor subframe seperately
    var p = [this.parent.pos[0] + this.subframe.pos[0], this.parent.pos[1] + this.subframe.pos[1]];
    var s = [this.parent.size[0] - this.subframe.pos[0], this.parent.size[1] - this.subframe.pos[1]];
    g_app_state.raster.push_scissor(p, s);
    this.subframe.on_draw(gl);
    g_app_state.raster.pop_scissor();
    
    g_app_state.raster.push_scissor(this.parent.pos, this.parent.size);
    Area.prototype.on_draw.call(this, gl);
    g_app_state.raster.pop_scissor();
  }
  
  on_keyup(KeyboardEvent event) {
    var ctx = new Context();
    var ret = this.keymap.process_event(ctx, event);
    
    if (ret != undefined) {
      ret.handle(ctx);
    }
    
    Area.prototype.on_keyup.call(this, event);
  }
  
  on_keydown(Keyboard event) {
    this.shift = event.shiftKey;
    this.alt = event.altKey;
    this.ctrl = event.ctrlKey;
    
    Area.prototype.on_keydown.call(this, event);
  }
 
  static fromSTRUCT(reader) {
    var obj = new OpStackEditor(0, 0, 1, 1);
    reader(obj);
    
    if (obj.pan != undefined) {
      obj.velpan = new VelocityPan();
      obj.velpan.pan = new Vector2(obj.pan);
    }
    
    return obj;
  }
  
  data_link(DataBlock block, Function getblock, Function getblock_us) {
    
  }
}

OpStackEditor.STRUCT = STRUCT.inherit(OpStackEditor, Area) + """
    pan : array(float) | obj.velpan != undefined ? obj.velpan.pan : [0, 0];
    filter_sel : int | obj._filter_sel;
  }
"""

OpStackEditor.uiname = "Operator Stack";
