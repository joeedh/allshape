"use strict";

/******************* main area struct ********************************/
class SettingsEditor extends Area {
  constructor(Context ctx, Array<float> pos, Array<float> size) {
    Area.call(this, SettingsEditor.name, SettingsEditor.uiname, new Context(), pos, size);

    this.keymap = new KeyMap();
    this.define_keymap();
    
    this.drawlines = new GArray<drawlines>();
    
    this._filter_sel = false;
    this.gl = undefined;
    this.ctx = new Context();
    
    this.subframe = new UITabPanel(new Context(), [size[0], size[1]]);
    this.subframe.pos = [0, 0]; //XXX this should work: [0, Area.get_barhgt()];
    this.subframe.canvas = new UICanvas([this.pos, this.size]);
    this.subframe.state |= UIFlags.HAS_PAN|UIFlags.IS_CANVAS_ROOT|UIFlags.PAN_CANVAS_MAT;
    this.subframe.velpan = new VelocityPan();
    
    var panel = new RowFrame(ctx);
    panel.label("Yay");
    panel.label("Label");
    panel.add(new UIButton(ctx, "a buttton"));
    panel.add(new UIColorField(ctx));
    
    var panel2 = new ColumnFrame(ctx);
    panel2.packflag |= PackFlags.INHERIT_WIDTH;
    panel2.label("Yay2");
    panel2.add(new UIButton(ctx, "a buttton"));
    panel2.label("Label");
    panel2.add(new UIButton(ctx, "a buttton"));
    
    var panel3 = new ColumnFrame(ctx);
    panel3.packflag |= PackFlags.INHERIT_WIDTH;
    panel3.label("Yay3");
    panel3.add(new UIButton(ctx, "a buttton2"));
    panel3.label("Label2");
    panel3.add(new UIButton(ctx, "a buttton"));
    
    this.subframe.add_tab("TRANSLATE", panel);
    this.subframe.add_tab("Tab two", panel2);
    this.subframe.add_tab("Tab three", panel3);
    
    this.add(this.subframe);
  }
  
  define_keymap() {
  }
  
  static default_new(Context ctx, ScreenArea scr, WebGLRenderingContext gl, 
                     Array<float> pos, Array<float> size) : SettingsEditor
  {
    var ret = new SettingsEditor(ctx, pos, size);
    return ret;
  }
  
  on_mousedown(MouseEvent event) {
    if (event.button == 1 && !g_app_state.was_touch) {
      this.subframe.start_pan(event, 1);
    } else {
      prior(SettingsEditor, this).on_mousedown.call(this, event);
    }
  }

  on_area_inactive() {
    this.destroy();
    prior(SettingsEditor, this).on_area_inactive.call(this);
  }
    
  area_duplicate() : SettingsEditor {
    var ret = new SettingsEditor(this.pos[0], this.pos[1], this.size[0], this.size[1]);
    
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
    
    //add items here
    
    this.rows.push(col);
    this.add(col);
  }
  
  build_bottombar() {
    var ctx = new Context();
    var col = new ColumnFrame(ctx);
    
    col.packflag |= PackFlags.ALIGN_LEFT;
    col.default_packflag = PackFlags.ALIGN_LEFT;
    
    col.draw_background = true;
    col.rcorner = 100.0
    col.pos = [0, 2]
    col.size = [this.size[0], Area.get_barhgt()];
    
    col.add(gen_editor_switcher(this.ctx, this));
    
    this.rows.push(col);
    this.add(col);
  }
  
  build_draw(UICanvas canvas, Boolean isVertical) {
    prior(SettingsEditor, this).build_draw.call(this, canvas, isVertical);
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
  
  static fromSTRUCT(reader) {
    var obj = new SettingsEditor(new Context(), [0,0], [1,1]);
    reader(obj);
    
    if (obj.pan != undefined) {
      obj.subframe.velpan = new VelocityPan();
      obj.subframe.velpan.pan = new Vector2(obj.pan);
    }
    
    return obj;
  }
  
  data_link(DataBlock block, Function getblock, Function getblock_us) {
    
  }
}

SettingsEditor.STRUCT = STRUCT.inherit(SettingsEditor, Area) + """
    pan : array(float) | obj.subframe.velpan != undefined ? obj.subframe.velpan.pan : [0, 0];
  }
"""
SettingsEditor.uiname = "Settings";
