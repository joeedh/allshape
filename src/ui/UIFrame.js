"use strict";

/************** ui frame **************/
var _static_mat = new Matrix4();
var _ufbd_v1 = new Vector3();

//hack for spreading updates across frames
var _canvas_threshold = 1.0;
class UIFrame extends UIElement {
  constructor(ctx, canvas, path, pos, size) { //path, pos, size are optional
    super(ctx, path, pos, size);
    
    this.dirty_rects = new GArray();
    
    this.bgcolor = undefined;
    this._pan_cache = {};
    this.pan_bounds = [[0, 0], [0, 0]];
    
    this.depth = 0;
    this.ctx = ctx;
    this._children = new GArray([])
    this.active = undefined;
    this.velpan = new VelocityPan();
    this.tick_timer = new Timer(90);
    
    //current mouse position relative to this.pos
    this.mpos = [0, 0];
    
    this.draw_background = false;
    this.has_hidden_elements = false;
    
    if (canvas != undefined) {
      this.canvas = canvas;
    }
    
    this.leafcount = 0;
    this.framecount = 0;
    this.rcorner = 16.0;
    this.keymap = undefined;
  }
  
  get children() : GArray<UIElement> {
    return this._children;
  }
  
  //setter for .children, will hopefully
  //avoid GC leaks in edge cases
  set children(GArray<UIElement> cs) {
    var cset = new set();
    for (var c of cs) {
      cset.add(c);
    }
    
    for (var c of list(this._children)) {
      if (!cset.has(c)) {
        c.on_remove(this);
        c.parent = undefined;
        c.canvas = undefined;
      }
    }
    
    this._children.reset();
    for (var c of cs) {
      if (!cset.has(c)) {
        this.add(c);
      } else {
        this._children.push(c);
      }
    }
  }
  
  /*these next two are used to save/load ui data
    in hidden elements, e.g. collapsed panels,
    inactive tabs*/
  on_saved_uidata(Function visit_func) {
    for (var c of this.children) {
      visit_func(c);
    }
  }
  
  on_load_uidata(Function visit) {
    for (var c of this.children) {
      visit(c);
    }
  }
  
  on_gl_lost(WebGLRenderingContext new_gl) {
    if (this.canvas != undefined && !(this.canvas.gl === new_gl)) {
      this.canvas.on_gl_lost(new_gl);
    }
    
    if (this.children == undefined)
      return;
    
    for (var c of this.children) {
      c.on_gl_lost(new_gl);
    }
    
    this.do_full_recalc();
  }
  
  start_pan(Array<float> start_mpos=undefined, int button=0, Array<float> last_mpos=undefined) {
    if (!(this.state & UIFlags.HAS_PAN)) {
      if (this.parent == undefined) {
        console.trace();
        console.log("Warning: UIFrame.start_pan: no parent frame with pan support");
      } else {
        if (start_mpos != undefined) {
          start_mpos[0] += this.pos[0];
          start_mpos[1] += this.pos[1];
        }
        if (last_mpos != undefined) {
          last_mpos[0] += this.pos[0];
          last_mpos[1] += this.pos[1];
        }
        this.parent.start_pan(start_mpos, button, last_mpos);
      }
    } else {
      this.start_pan_main(start_mpos, button, last_mpos);
    }
  }
  
  /*callback functions to start or 
    end panning, enable with UIFlags.HAS_PAN*/
  start_pan_main(Array<float> start_mpos, int button=0, Array<float> last_mpos=start_mpos) {
    if (start_mpos != undefined) {
      this.mpos[0] = start_mpos[0]; this.mpos[1] = start_mpos[1];
    }
    
    if (this.velpan == undefined)
      this.velpan = new VelocityPan();
    
    var mpos = [this.mpos[0], this.mpos[1]];
    var lastmpos;
    
    this.abs_transform(mpos);
    
    if (last_mpos != undefined) {
      last_mpos = [last_mpos[0], last_mpos[1]];
      this.abs_transform(last_mpos);
    } else {
      last_mpos = mpos;
    }

    if (DEBUG.touch)
      console.log("sy", mpos[1]);
    
    var f = this;
    while (f.parent != undefined) {
      f = f.parent;
    }
    
    this.velpan.start(mpos, last_mpos, this);
    f.push_modal(this.velpan);
  }
  
  /*forcibly exit pan mode*/
  end_pan() {
    if (this.modalhandler == this.velpan) {
      this.velpan.end();
      this.pop_modal();
    } else {
      console.trace();
      console.log("Warning: UIFrame.end_pan called when not in panning mode");
      return;
    }
  }
  
  get_keymaps() {
    return this.keymap != undefined ? [this.keymap] : [];
  }
  
  do_full_recalc()
  {
    this.do_recalc();
    
    for (var c of this.children) {
      if (c instanceof UIFrame) 
        c.do_full_recalc();
      else
        c.do_recalc();
    }
  }

  on_resize(Array<int> newsize, Array<int> oldsize)
  {
    if (this.canvas != undefined) {
      this.canvas.on_resize(newsize, oldsize);
    }
    
    this.do_recalc();
    
    for (var c of this.children) {
      c.do_recalc();
      c.on_resize(newsize, oldsize);
    }
  }

  on_inactive() {
    if (this.active != undefined) {
      this.active.state &= ~UIFlags.HIGHLIGHT;
      this.active.do_recalc();
      this.active.on_inactive();
      this.active = undefined;
      this.do_recalc();
    }
  }

  push_modal(e) {
    UIElement.prototype.push_modal.call(this, e);
  }
  
  pop_modal() {
    UIElement.prototype.pop_modal.call(this);
  }
 
  _offset_mpos(MouseEvent event) {
    if (this.modalhandler != null && this.modalhandler instanceof UIElement) {
      event.x -= this.modalhandler.pos[0];
      event.y -= this.modalhandler.pos[1];
    }
    
    if ((this.state & UIFlags.HAS_PAN) && this.velpan != undefined) {
      event.x -= this.velpan.pan[0];
      event.y -= this.velpan.pan[1];
    }
  }
  
  _unoffset_mpos(MouseEvent event) {
    if (this.state & UIFlags.HAS_PAN) {
      event.x += this.velpan.pan[0];
      event.y += this.velpan.pan[1];
    }
  }
  
  set_pan() {
    if (this.state & UIFlags.PAN_CANVAS_MAT)
      this.on_pan(this.velpan.pan, this.velpan.pan);
  }
  
  on_pan(Array<float> pan, Array<float> old_pan) {
    if (this.state & UIFlags.PAN_CANVAS_MAT) {
      var mat = this.canvas.global_matrix
      var s = this.canvas.viewport[1];
      
      var x = (pan[0]/s[0])*2.0;
      var y = (pan[1]/s[1])*2.0;
      
      mat.makeIdentity();
      mat.translate(x, y, 0);
    } else {
      this.do_full_recalc();
    }
    
    this.pan_do_build();
  }
  
  _on_mousemove(MouseEvent event) {
    if (this.bad_event(event)) return;
  
    if (this.modalhandler != null) {
      this._offset_mpos(event);
      this.modalhandler._on_mousemove(event);
      
      return true;
    } else {
      return this.on_mousemove(event);
    }
  }
  
  //assumes event has had this._offset_mpos called on it
  _find_active(MouseEvent e) {
    var mpos = [e.x, e.y];
    
    var found = false;
    for (var i=this.children.length-1; i >= 0; i--) {
      var c = this.children[i];
      
      if (inrect_2d(mpos, c.pos, c.size)) {
        found = true;
        if (this.active != c && this.active != undefined) {
          this.active.state &= ~UIFlags.HIGHLIGHT;
          this.active.on_inactive();
          this.active.do_recalc();
        }
        
        if (this.active != c) {
          //console.log("active", c.constructor.name);
          
          c.state |= UIFlags.HIGHLIGHT;
          c.on_active();
          c.do_recalc();
          this.active = c;      
        }
        
        break;
      }
    }
    
    if (!found && this.active != undefined) {
      //console.log("inactive", get_type_name(this))
      this.active.state &= ~UIFlags.HIGHLIGHT;
      this.active.on_inactive();
      this.active.do_recalc();
      this.active = undefined;
    }
  }
  
  on_mousemove(MouseEvent e) {
    if (this.bad_event(e)) return;
    
    this._offset_mpos(e);
  
    //current mouse position relative to this.pos
    var mpos = this.mpos = [e.x, e.y];
    var found = false;
    
    this._find_active(e);
    
    if (this.active != undefined) {
      e.x -= this.active.pos[0];
      e.y -= this.active.pos[1];
      
      this.active._on_mousemove(e)
      
      e.x += this.active.pos[0];
      e.y += this.active.pos[1];
    }
    
    this._unoffset_mpos(e);
    return this.active != undefined;
  }

  _on_mousedown(MouseEvent event) {
    if (this.bad_event(event)) return;
    
    if (this.modalhandler != null) {
      this._offset_mpos(event);
      
      this.modalhandler._on_mousedown(event);
    } else {
      this.on_mousedown(event);
    }
  }

  on_mousedown(MouseEvent e, Boolean feed_mousemove=false) {
    if (this.bad_event(e)) return;
    
    if (feed_mousemove)
      this.on_mousemove(e);
    else
      this._offset_mpos(e);
    
    var mpos = this.mpos = [e.x, e.y];
    this._find_active(e);
    
    if (this.active != undefined) {
      e.x -= this.active.pos[0];
      e.y -= this.active.pos[1];
      
      this.active._on_mousedown(e);
    }
    
    if ((this.state & UIFlags.USE_PAN) && this.active == undefined) {
      console.log("panning");
      this.start_pan([e.x, e.y]);
    }
    
    this._unoffset_mpos(e);
    return this.active != undefined;
  }


  _on_mouseup(MouseEvent event) {
    if (this.bad_event(event)) return;
    
    if (this.modalhandler != null) {
      this._offset_mpos(event);
      this.modalhandler._on_mouseup(event);
    } else {
      this.on_mouseup(event);
    }
  }

  on_mouseup(MouseEvent e) {
    if (this.bad_event(e)) return;
    
    this._offset_mpos(e);
    
    if (this.active != undefined) {
      e.x -= this.active.pos[0];
      e.y -= this.active.pos[1];
      
      this.active._on_mouseup(e);
    }
    
    this._unoffset_mpos(e);
    return this.active != undefined;
  }


  _on_mousewheel(MouseEvent event, float delta) {
    if (this.bad_event(event)) return;

    if (this.modalhandler != null) {
      if (this.modalhandler["pos"] != undefined) {
        event.x -= this.modalhandler.pos[0]
        event.y -= this.modalhandler.pos[1]
      }
      this.modalhandler._on_mousewheel(event, delta);
    } else {
      this.on_mousewheel(event, delta);
    }
  }

  on_mousewheel(MouseEvent e, float delta) {
    if (this.active != undefined) {
      if (this.modalhandler != null && this.modalhandler["pos"] != undefined) {
        event.x -= this.modalhandler.pos[0]
        event.y -= this.modalhandler.pos[1]
      }
      
      this.active._on_mousewheel(e, delta);
    }
    
    return this.active != undefined;
  }

  on_textinput(e) {
    if (this.active != undefined) {
      this.active._on_textinput(e);
    }
    
    return this.active != undefined;
  }
  
  on_keydown(KeyboardEvent e) {
    if (this.active != undefined) {
      this.active._on_keydown(e);
    }
    
    return this.active != undefined;
  }


  on_keyup(KeyboardEvent e) {
    if (this.active != undefined) {
      this.active._on_keyup(e);
    }
    
    return this.active != undefined;
  }

  on_charcode(KeyboardEvent e) {
    if (this.active != undefined) {
      this.active._on_charcode(e);
    }
    
    return this.active != undefined;
  }
  
  get_uhash() : String {
    var s = "";
    
    var p = this;
    while (p != undefined) {
      s += p.constructor.name;
      
      //don't go above Area, which isn't
      //when fromSTRUCT is called
      if (p instanceof Area) 
        break;
      //if (p instanceof Area) {
      //  s += p.parent.parent.areas.indexOf(p.parent);
      //}
      
      p = p.parent;
    }
    
    return s;
  }

  prepend(UIElement e, int packflag) {
    e.defunct = false;
    this.children.prepend(e);
    
    if (!(e instanceof UIFrame)) {
      this.leafcount++;
    } else {
      this.framecount++;
    }
    
    if (packflag != undefined)
      e.packflag |= packflag;
    
    e.parent = this;
    if (e.canvas == undefined)
      e.canvas = this.canvas;
    
    e.on_add(this);
    
    this.do_recalc();
    this.update_depth();
  }
  
  _set_pan(UIElement e) {
    e.state |= UIFlags.USE_PAN;
    if (e instanceof UIFrame) {
      for (var c of e.children) {
        this._set_pan(c);
      }
    }
  }
  
  update_depth(UIElement e) {
    return;
    
    var p = this;
    this.depth = 0;
    
    while (p.parent != undefined) {
      p = p.parent;
      this.depth++;
    }
    
    function rec(f, depth=0) {
      f.depth = depth;
      for (var c of f.children) {
        if (c instanceof UIFrame) {
          rec(c, depth+1);
        }
      }
    }
    
    //rec(p);
  }
  
  add(UIElement e, int packflag) { //packflag is optional
    if (e instanceof UIFrame && (e.state & UIFlags.HAS_PAN) && 
        e.velpan == undefined) 
    {
      e.velpan = new VelocityPan();
    }
    
    if (this.state & (UIFlags.HAS_PAN|UIFlags.USE_PAN)) {
      this.state |= UIFlags.USE_PAN;
      this._set_pan(e);
    }
    
    e.defunct = false;
    this.children.push(e);
    
    if (!(e instanceof UIFrame)) {
      this.leafcount++;
    } else {
      this.framecount++;
    }
    
    if (packflag != undefined)
      e.packflag |= packflag;
    
    e.parent = this;
    if (e.canvas == undefined)
      e.canvas = this.canvas;
    
    e.on_add(this);
    e.do_recalc();
    
    this.update_depth();
  }

  replace(UIElement a, UIElement b) {
    if (a == this.modalhandler) {
      a.pop_modal();
    }
    
    this.dirty_rects.push([[a.abspos[0], a.abspos[1]], [a.size[0], a.size[1]]]);
    
    a.on_remove(this);
    this.children.replace(a, b);
    
    if (this.canvas != undefined)
      this.canvas.remove_cache(a);
    if (a == this.active)
      this.active = b;
    
    b.parent = this;
    if (b.canvas == undefined)
      b.canvas = this.get_canvas();
    if (b.ctx == undefined)
      b.ctx = this.ctx;
    
    b.on_add(this);
    b.do_recalc();
    
    this.update_depth();
  }

  remove(UIElement e) {
    e.defunct = true;
    
    this.dirty_rects.push([[e.abspos[0], e.abspos[1]], [e.size[0], e.size[1]]]);
    
    if (!(e instanceof UIFrame)) {
      this.leafcount--;
    } else {
      this.framecount--;
    }
    
    if (e == this.modalhandler) {
      e.pop_modal();
    }
    
    this.children.remove(e);
    e.on_remove(this);
    
    if (this.canvas != undefined)
      this.canvas.remove_cache(e);
    
    if (e == this.active)
      this.active = undefined;

    this.update_depth();
  }

  on_draw(gl) {
    function descend(n, canvas) {
      for (var c of n.children) {
        if (c.canvas != undefined) continue;
        
        c.canvas = canvas;
        if (c instanceof UIFrame)
          descend(c, canvas);
      }
    }
    
    if (this.recalc && this.is_canvas_root() && this.get_canvas() != undefined) {
      if (this.canvas == undefined)
        this.canvas = this.get_canvas();
      if (this.canvas != undefined)
        descend(this, this.canvas);
      
      this.canvas.reset();
      if (DEBUG.ui_canvas)
        console.log("------------->Build draw call in " + this.constructor.name + ".on_draw()");
      
      //if (this instanceof UIPackFrame)
      //  this.pack(this.canvas, false);
      this.build_draw(this.canvas, false);
    }
    
    if (this.canvas != undefined) {
      this.canvas.on_draw(gl);
    }
  }

  set_context(ctx)
  {
    this.ctx = ctx;
    for (var c of this.children) {
      c.set_context(ctx);
    }
  }
  
  load_filedata(ObjectMap obj) {
    if (obj.pan) {
      this.velpan = new VelocityPan();
      this.velpan.pan.load(obj.pan);
    }
  }
  
  get_filedata() : String {
    if (this.state & UIFlags.HAS_PAN && this.velpan != undefined) {
      return {pan : this.velpan.pan};
    }
    
    return undefined;
  }
  
  pan_do_build() {
    var cache = this._pan_cache;
    var cache2 = {};
    var i = 0;
    var viewport = g_app_state.raster.viewport;
    
    for (var c of this.children) {
      c.abspos[0] = 0; c.abspos[1] = 0;
      c.abs_transform(c.abspos);
      
      var hidden = !aabb_isect_2d(c.abspos, c.size, viewport[0], viewport[1]);
      
      if (!this.recalc && !hidden && (!(i in cache) || cache[i] != hidden)) {
        console.log("pan recalc");
        this.do_recalc();
      }
      
      cache2[i] = hidden;
      i++;
     }
     
     this._pan_cache = cache2;
  }
  
  calc_dirty() {
    var d = this.last_dirty;
    var ret = [[0, 0], [0, 0]]; //[d[0][0], d[0][1]], [d[1][0], d[1][1]]];
    var first = true;
    
    for (var r of this.dirty_rects) {
      if (first) {
        first = false;
        ret[0][0] = r[0][0];
        ret[0][1] = r[0][1];
        ret[1][0] = r[1][0]+r[0][0];
        ret[1][1] = r[1][1]+r[0][1];
      } else {
        ret[0][0] = Math.min(ret[0][0], r[0][0]);
        ret[0][1] = Math.min(ret[0][1], r[0][1]);
        ret[1][0] = Math.max(ret[1][0], r[0][0]+r[1][0]);
        ret[1][1] = Math.max(ret[1][1], r[0][1]+r[1][1]);
      }
    }
    
    for (var c of this.children) {
      if (!(c instanceof UIFrame) && !c.recalc)
        continue;
      
      var ret2;
      
      if (c instanceof UIFrame) {
        ret2 = c.calc_dirty();
      } else {
        ret2 = c.last_dirty;
      }
      
      if (first) {
        ret[0][0] = ret2[0][0]
        ret[0][1] = ret2[0][1]
        ret[1][0] = ret2[1][0]+ret2[0][0]
        ret[1][1] = ret2[1][1]+ret2[0][1]
        first = false;
      } else {
        for (var i=0; i<2; i++) {
          ret[0][i] = Math.min(ret[0][i], ret2[0][i]);
          ret[1][i] = Math.max(ret[1][i], ret2[1][i]+ret2[0][i]);
        }
      }
    }
    
    ret[1][0] -= ret[0][0];
    ret[1][1] -= ret[0][1];
    
    return ret;
  }
  
  build_draw(canvas, isVertical, cache_frame=undefined) {
    var mat = _static_mat;
    this.has_hidden_elements = false;
    
    if (this.is_canvas_root()) {
      if (DEBUG.use_2d_uicanvas) {
        var d = this.calc_dirty();
        
        for (var c of this.children) {
          if (aabb_isect_2d(c.pos, c.size, d[0], d[1])) {
            c.do_recalc();
          }
        }
        
        this.canvas.clear(d[0], d[1]);
      }
      
      this.canvas.push_transform();
      this.canvas.translate(this.pos);
    }
    
    if (cache_frame == undefined) {
      cache_frame = !(this.state & UIFlags.NO_FRAME_CACHE);
    }
    
    if (cache_frame && this.depth == 4) {
      canvas.frame_begin(this);
    }
    
    if (this.parent == undefined) {
      this.abspos[0] = this.abspos[1] = 0.0;
      this.abs_transform(this.abspos);
      //this.abspos[0] = this.pos[0]; this.abspos[1] = this.pos[1];
    }
    
    if (this.state & UIFlags.HAS_PAN && this.velpan != undefined) {
      if (!(this.state & UIFlags.PAN_CANVAS_MAT)) {
        canvas.push_transform();
        canvas.translate(this.velpan.pan);
      }
    }
    
    if (this.pos == undefined) {
      this.pos = [0,0];
      console.log("eek");
      console.trace();
    }
    
    if (this.draw_background) {
      canvas.simple_box([0, 0], this.size, this.bgcolor, this.rcorner);
    }
    
    var retag_recalc = false;
    this.recalc = 0;
    
    var viewport = g_app_state.raster.viewport;
    static zero = [0, 0];
    
    for (var c of this.children) {
      c.abspos[0] = 0; c.abspos[1] = 0;
      c.abs_transform(c.abspos);
      
      /*build dirty rects*/
      var t = c.dirty;
      c.dirty = c.last_dirty;
      c.last_dirty = t;
      
      c.dirty[0][0] = c.abspos[0];
      c.dirty[0][1] = c.abspos[1];
      c.dirty[1][0] = c.size[0];
      c.dirty[1][1] = c.size[0];
      
      var isect = aabb_isect_2d(c.abspos, c.size, viewport[0], viewport[1]);
      var pos;
      
      if (this.state & UIFlags.HAS_PAN)
        pos = this.velpan.pan;
      else
        pos = zero;
      
      isect = isect || aabb_isect_2d(c.pos, c.size, pos, this.size);
      if (!isect) {
         //if (c instanceof UITextBox) {
          //console.log(c.pos, c.size, pos, this.size);
         //}
         this.has_hidden_elements = true;
         continue;
      }
      
      if (c.pos == undefined) {
        c.pos = [0,0];
        c.size = [0, 0];
        console.log("eek2");
        console.trace();
      }
      
      mat.makeIdentity();
      _ufbd_v1.zero(); _ufbd_v1[0] = c.pos[0]; _ufbd_v1[1] = c.pos[1];
      
      mat.translate(_ufbd_v1);
      
      //child draws itself; make sure it gets repacked
      if ((c.canvas != undefined && c.canvas != this.get_canvas()) ||
           c.is_canvas_root())
      {
        if (c.recalc && !(c.packflag & PackFlags.NO_REPACK)) {
          var canvas2 = c.get_canvas();
          
          canvas2.push_transform();
          canvas2.translate(c.pos);
          c.pack(canvas2, false);
          c.build_draw(canvas2, isVertical);
          canvas2.pop_transform();
        }
        
        if (c instanceof UITextBox) {
          console.log("eek!!", this.get_canvas(), c.canvas, c.is_canvas_root());
        }
        continue;
      }
      
      var do_skip = !c.recalc;
      
      if (!(c instanceof UIFrame) && this.constructor.name != UIMenu.name) {
        do_skip = !c.recalc || Math.random() > _canvas_threshold;
      }
      
      if (canvas.has_cache(c) && do_skip) {
        if (c.recalc) {
          retag_recalc = true;
          c.do_recalc();
        }
        
        canvas.use_cache(c);
      } else {
        var r = this.recalc;
        
        if (c.recalc && !(c.packflag & PackFlags.NO_REPACK))
          c.pack(canvas, false);
          
        canvas.push_transform(mat);
        
        try {
          c.build_draw(canvas, isVertical);
        } catch (_err) {
          print_stack(_err);
          
          //ensure borked element isn't modal
          if (c == this.modalhandler)
            c.pop_modal();
          console.log("Error occured while drawing element ", c);
        }
        
        canvas.pop_transform(mat);
        c.recalc = 0;
      }
    }

    if (cache_frame && this.depth == 4) {
      canvas.frame_end(this);
    }
    
    if (retag_recalc)
      this.do_recalc();
      
    if (this.state & UIFlags.HAS_PAN && this.velpan != undefined) {
      if (!(this.state & UIFlags.PAN_CANVAS_MAT)) {
        canvas.pop_transform();
      }
    }
    
    if (this.is_canvas_root()) {
      this.canvas.pop_transform();
    }
    
    this.dirty_rects.reset();
  }

  //pre_func is optional, and is called before each child's on_tick is executed
  on_tick(pre_func) {
    if (!this.tick_timer.ready())
      return;
    
    prior(UIFrame, this).on_tick.call(this);
    
    if (this.state & UIFlags.HAS_PAN && this.valpan == undefined) {
      this.valpan = new VelocityPan();
     
      this.state |= UIFlags.USE_PAN;
      function recurse(f) {
        for (var c of f.children) {
          c.state |= UIFlags.USE_PAN;
          if (c instanceof UIFrame)
            recurse(c);
        }
      }
      
      recurse(this);
    }
    
    if (this.velpan != undefined) {
      this.velpan.on_tick();
    }
    
    for (var c of this.children) {
      try {
        if (pre_func != undefined)
          pre_func(c);
        
        c.on_tick();
        
        if (c.status_timer != undefined) {
          c.inc_flash_timer();
          c.do_recalc();
        }
      } catch (_err) {
        print_stack(_err);
        
        //ensure borked element isn't modal
        if (c == this.modalhandler)
          c.pop_modal();
        console.log("Error occured in UIFrame.on_tick ", c);
      }
    }
  }

  pack(UICanvas canvas, Boolean isVertical) {
    for (var c of this.children) {
      if (c.recalc && !(c.packflag & PackFlags.NO_REPACK))
        c.pack(canvas, isVertical);
    }  
  }
  
  add_floating(e, modal=false, center=false)//center is optional, defaults to true
  {
    var off = [e.pos[0], e.pos[1]];
    var frame = this;
    
    this.abs_transform(off);
    while (frame.parent != undefined) {
      frame = frame.parent;
    }
    
    if (e.canvas == undefined)
      e.canvas = frame.get_canvas();
    
    e.do_recalc();
    
    if (center) {
      off[0] -= e.size[0]/3
      off[1] -= e.size[1]/3
    }
    
    e.pos[0] = off[0];
    e.pos[1] = off[1];
    
    frame.add(e);
    if (modal) {
      frame.push_modal(e);
      //frame._on_mousemove({"x": e.pos[0]-frame.pos[0], "y":e.pos[1]-frame.pos[1]})
    }
  }
}
