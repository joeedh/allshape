"use strict";

/******************* main area struct ********************************/

class SettingsEditor extends Area {
  do_theme_color(int i) : UIFrame {
    var ctx=this.ctx;
    var path = "theme.ui.colors["+i+"]";
    
    var type = this.ctx.api.get_prop(ctx, path+".type");
    
    if (type == "Simple") {
      var ret = new UIColorPicker(ctx);
      ret.state |= UIFlags.USE_PATH;
      ret.data_path = path + ".color";
      
      return ret;
    } else if (type == "Weighted") {
      var ret = new UIBoxWColor(ctx, path);
      return ret;
    } else {
      var ret = new UIBoxWColor(ctx, path);
      return ret;
      return new UILabel(ctx, "invalid theme entry");
    }
  }
  
  theme_panel() {
    var ctx = this.ctx;
    
    var panel = new RowFrame(ctx);
    var listbox = new UIListBox(ctx, undefined, [200, 200]);
    var theme = g_theme;
    for (var j=0; j<g_theme.ui.flat_colors.length; j++) {
      listbox.add_item(theme.ui.flat_colors[j][0], j);
    }
    
    var this2 = this;
    listbox.callback = function(listbox, text, id) {
      var e = this2.do_theme_color(id);
      
      if (this2.themebox != undefined) {
      panel.replace(this2.themebox, e);
      } else {
        panel.add(e);
      }
      
      this2.themebox = e;
    }
    
    panel.add(listbox);
    this.themebox = this.do_theme_color(0);
    panel.add(this.themebox);
    
    return panel;
  }
  
  constructor(Context ctx, Array<float> pos, Array<float> size) {
    Area.call(this, SettingsEditor.name, SettingsEditor.uiname, new Context(), pos, size);
    
    this.mm = new MinMax(2);
    this.keymap = new KeyMap();
    this.define_keymap();
    
    this.drawlines = new GArray<drawlines>();
    this.pan_bounds = [[0, 0], [0, 0]];

    this._filter_sel = false;
    this.gl = undefined;
    this.ctx = new Context();
    this.themebox = undefined;
    
    this.subframe = new UITabPanel(new Context(), [size[0], size[1]]);
    this.subframe.size[0] = this.size[0];
    this.subframe.size[1] = this.size[1];
    this.subframe.pos = [0, Area.get_barhgt()];
    this.subframe.canvas = new UICanvas([this.pos, this.size]);
    this.subframe.state |= UIFlags.HAS_PAN|UIFlags.IS_CANVAS_ROOT|UIFlags.PAN_CANVAS_MAT;
    this.subframe.velpan = new VelocityPan();
    
    this.subframe.add_tab("Theme", this.theme_panel());
    
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
    
    this.mm.reset();
    var arr = [0, 0];
    for (var c in this.children) {
      this.mm.minmax(c.pos);
      arr[0] = c.pos[0]+c.size[0];
      arr[1] = c.pos[1]+c.size[1];
      
      this.mm.minmax(c.pos);
      this.mm.minmax(arr);
    }
    
    this.pan_bounds[1][1] = this.mm.max[1]-this.mm.min[1]-this.size[1];
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
    var sx = this.size[0];
    var sy = this.size[1]-this.subframe.pos[1]-Area.get_barhgt();
    var s1 = this.size, s2=this.subframe.size;
    
    if (s2[0] != sx || s2[1] != sy) {
      console.log("resizing subframe");
      this.subframe.size[0] = this.size[0];
      this.subframe.size[1] = sy;
      this.subframe.on_resize(this.size, this.subframe.size);
    }
    
    this.subframe.canvas.viewport = this.canvas.viewport;
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
    
    /*if (obj.pan != undefined) {
      obj.subframe.velpan = new VelocityPan();
      obj.subframe.velpan.pan = new Vector2(obj.pan);
    }*/
    
    return obj;
  }
  
  data_link(DataBlock block, Function getblock, Function getblock_us) {
    
  }
}

SettingsEditor.STRUCT = STRUCT.inherit(SettingsEditor, Area) + """
  }
"""
SettingsEditor.uiname = "Settings";
