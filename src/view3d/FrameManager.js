"use strict";

var Area_Types = new set(["View3DHandler"]);

//this should have been named ScreenEditor, ger
class Area extends UIFrame {
  constructor(type, ctx, pos, size) {
    UIFrame.call(this, ctx, undefined, undefined, pos, size);
    
    this.type = type;
    
    this.rows = new GArray();
    this.cols = new GArray();
    
    this.note_area = undefined;
  }
  
  //destroy GL data
  destroy() {
  }
  
  static fromSTRUCT(reader) {
    var ob = {};
    reader(ob);
    
    return ob;
  }

  on_gl_lost(WebGLRenderingContext new_gl) {
    for (var c in this.cols) {
      c.on_gl_lost();
    }
    for (var c in this.rows) {
      c.on_gl_lost();
    }
    
    prior(Area, this).on_gl_lost.call(this, new_gl);
  }
  
  on_add(parent)
  {
    this.build_topbar();
    this.build_sidebar1();
    this.build_bottombar();
  }

  toJSON() 
  {
    if (this.pos == undefined) {
      this.pos = [0,0];
    }
    if (this.size == undefined) {
      this.size = [0,0];
    }
    
    return {size : [this.size[0], this.size[1]], pos : [this.pos[0], this.pos[1]], type : this.constructor.name};  
  }

  area_duplicate()
  {
  }

  on_resize(Array<int> newsize, Array<int> oldsize)
  {
    oldsize = this.size;
    this.size = newsize;
    
    /*recalculate root scissor box*/
    g_app_state.raster.reset_scissor_stack();
    
    for (var c in this.rows) {
      if (c.pos[1] > 30)
        c.pos[1] = this.size[1] - 28;
        
      c.size[0] = this.size[0];
    }
    
    for (var c in this.cols) {
      c.size[1] = this.size[1]-28*2;
    }
    
    for (var c in this.children) {
      c.on_resize(newsize, oldsize);
    }
  }
  
  static get_barhgt() {
    if (IsMobile) {
      return 45;
    } else {
      return 35;
    }
  }
  
  build_bottombar()
  {
  }

  build_topbar()
  {
  }

  build_sidebar1()
  {
  }

  on_area_inactive()
  {
  }

  on_area_active()
  {
  }
}
Area.STRUCT = """
  Area { 
    pos  : vec2;
    size : vec2;
    type : string;
  }
"""

class ScreenArea extends UIFrame {
  constructor(area, ctx, pos, size, add_area) {
    UIFrame.call(this, ctx, undefined, undefined, pos, size);
    
    if (add_area == undefined)
      add_area = true;
    
    this.editors = {}
    this.editors[area.constructor.name] = area;
    
    this.area = area;
    area.pos[0] = 0; area.pos[1] = 0;
    
    if (add_area)
      this.add(area);
  }
  
  destroy() {
    for (var c in this.editors) {
      c.destroy();
    }
  }
  
  static fromSTRUCT(reader) {
    var ob = Object.create(ScreenArea.prototype);
    
    reader(ob);
    
    var editarr = new GArray(ob.editors);
    ob.area = editarr[0];
    
    var screens2 = {}
    for (var scr in editarr) {
      if (scr.constructor.name == ob.area) {
        ob.area = scr;
      }
      
      screens2[scr.constructor.name] = scr;
    }
    
    ScreenArea.call(ob, ob.area, new Context(), ob.pos, ob.size, false);
    ob.editors = screens2;
    
    return ob;
  }

  data_link(block, getblock, getblock_us) {
    this.ctx = new Context();
    this.area.ctx = new Context();
    
    for (var k in this.editors) {
      var area = this.editors[k];
      
      area.data_link(block, getblock, getblock_us);
      area.set_context(this.ctx);
    }
    
    this.add(this.area);
  }

  on_add(parent)
  {
    for (var c in this.children) {
      c.on_add(this);
    }
  }

  on_close()
  {
    this.area.on_area_inactive();
  }

  toJSON() 
  {
    var obj =  {size : [this.size[0], this.size[1]], pos : [this.pos[0], this.pos[1]], };
    
    var areas = [];
    obj.areas = areas;
    var active = 0;
    
    var i = 0;
    for (var k in this.editors) {
      var a = this.editors[k];
      
      areas.push(a.toJSON());
      if (a == this.area)
        active = i;
      i++;
    }
    
    return obj;
  }

  static fromJSON(scrarea)
  {
    var areas = {}
    
    var active = undefined;
    for (var i=0; i<scrarea.areas.length; i++) {
      var a = scrarea.areas[i];
      
      if (0) { // !(a.type in Area_Types)) {
        console.log("Error: bad area type " + a.type + " in ScreenArea.fromJSON()")
        console.trace();
        continue;
      }
      
      var area;
      if (1) { //a.type == View3DHandler.name)
        area = View3DHandler.fromJSON(a);
      } else {
        throw new Error("Invalid area " + a.type)
      }
      
      areas[a.type] = area;
      
      if (i == scrarea.active || active == undefined)
        active = area;
    }
    
    if (active == undefined)
      throw new Error("couldn't find any screens");
      
    var sa = new ScreenArea(active, undefined, scrarea.pos, scrarea.size);
    sa.areas = areas;
    
    return sa;
  }

  area_duplicate()
  {
    var screens = {}
    
    for (var k in this.editors) {
      var area = this.editors[k];
      screens[k] = area.area_duplicate();
    }
    
    var scr = new ScreenArea(screens[this.area.constructor.name], this.ctx, new Vector2(this.pos), new Vector2(this.size));
    scr.editors = screens;
    
    return scr;
  }

  build_draw(canvas, isVertical)
  {
    //var mat = new Matrix4();
    //mat.translate(this.pos[0], this.pos[1], 0.0);
    
    //canvas.push_transform(mat);
    prior(ScreenArea, this).build_draw.call(this, canvas, isVertical);
    //canvas.pop_transform();
  }
  
  on_gl_lost(WebGLRenderingContext new_gl) {
    this.gl = gl;
    
    this.canvas.on_gl_lost(new_gl);
    for (var c in this.children) {
      c.on_gl_lost(new_gl);
    }
  }
  
  on_draw(WebGLRenderingContext gl)
  {
    //reset internal 2d canvas object cache state
    //not finished yet -->> _reset_trilist_frame_counter();
    
    g_app_state.size = new Vector2(this.size);
    
    this.area.pos[0] = 0; this.area.pos[1] = 0;
    this.area.size[0] = this.size[0];
    this.area.size[1] = this.size[1];
    
    g_app_state.raster.push_viewport(this.area.pos, this.area.size);
    this.area.on_draw(gl);
    g_app_state.raster.pop_viewport();
    
    //prior(ScreenArea, this).on_draw.call(this, gl);
  }

  add(child, packflag) {
    if ((child instanceof Area) && this.type == undefined) {
      this.type = child.constructor.name;
      //XXX probably need more boilerplate code than this
    }
    
    prior(ScreenArea, this).add.call(this, child, packflag);
  }

  remove(child) {
    if ((child instanceof Area) && this.type == child.constructor.name) {
      this.type = undefined
      //XXX deal with this code, should switch to another editor
      //or perhaps raise an exception disallowing the removal of editors
      //altogether?
    }
  }

  on_resize(Array<int> newsize, Array<int> oldsize)
  {
    var oldsize = new Vector2(this.area.size);
    
    this.area.pos[0] = 0; this.area.pos[1] = 0;
    this.area.size[0] = this.size[0];
    this.area.size[1] = this.size[1];
    
    this.area.on_resize(this.area.size, oldsize);
    
    for (var c in this.children) {
      if (c != this.area)
        c.on_resize(newsize, oldsize);
    }
  }
}

ScreenArea.STRUCT = """
  ScreenArea { 
    pos     : vec2;
    size    : vec2;
    type    : string;
    editors : iter(k, abstract(Area)) | obj.editors[k];
    area    : string | obj.area.constructor.name;
  }
"""

class SplitAreasTool extends ToolOp {
  constructor(screen) {
    ToolOp.call(this, "area_split_tool", "Split Screen", "Split a screen editor");

    this.screen = screen;
    this.canvas = screen.canvas;
    
    this.is_modal = true;
    this.undoflag = UndoFlags.IGNORE_UNDO;
    
    this.mpos = [0, 0];
    this.split = undefined : Array<Object>;
    this.lines = undefined : Array1<Array2<float>>;
    
    this.inputs = {};
    this.outputs = {};
  }
    
  on_mousemove(event)
  {
    this.mpos = new Vector2([event.x, event.y])
    this.canvas.reset()
    
    var p = this.modal_ctx.view3d;
    while (p != undefined) {
      this.mpos.add(p.pos);
      p = p.parent;
    }
    
    var mpos = this.mpos;
    var active = undefined;
    for (var c in this.screen.children) {
      if (!(c instanceof ScreenArea))
        continue;
      
      if (inrect_2d(mpos, c.pos, c.size)) {
        active = c;
        break;
      }
    }
    
    if (active == undefined)
      return;
    
    var canvas = this.canvas;
    var clr = [0.1, 0.1, 0.1, 1.0];
    var rad = 15;

    var lines = [
      [c.pos, [c.pos[0], c.pos[1]+c.size[1]]],
      [c.pos, [c.pos[0]+c.size[0], c.pos[1]]],
      [[c.pos[0]+c.size[0], c.pos[1]], 
       [c.pos[0]+c.size[0], c.pos[1]+c.size[1]]],
      [[c.pos[0], c.pos[1]+c.size[1]], 
       [c.pos[0]+c.size[0], c.pos[1]+c.size[1]]]
    ];
    
    var line = undefined;
    var ldis = 0.0;
    
    for (var i=0; i<4; i++) {
      lines[i][0] = new Vector2(lines[i][0])
      lines[i][1] = new Vector2(lines[i][1])
      
      canvas.line(lines[i][0], lines[i][1], clr, clr, rad)
      
      var dis = dist_to_line_v2(mpos, lines[i][0], lines[i][1]);
      if (line == undefined || dis < ldis) {
        ldis = dis;
        line = i;
      }
    }
    
    if (line == undefined)
      return;
      
    var v1 = lines[line][0]
    var v2 = lines[line][1]
    var v3 = lines[(line+2)%4][0]
    var v4 = lines[(line+2)%4][1]
    
    var ret = closest_point_on_line(mpos, v1, v2);
    var p1 = ret[0]
    var t = ret[1]/v2.vectorDistance(v1);
    
    var p2 = new Vector2(v4).sub(v3).mulScalar(t).add(v3)
    
    canvas.line(p1, p2, clr, clr, 4.0);
    
    this.lines = lines;
    this.split = [active, line, (line+2)%4, t]
  }

  finish(event)
  {
    if (this.split == undefined) {
      this.cleanup();
      return;
    }
    
    var area = this.split[0];
    var i = this.split[1]
    var t = this.split[3]
    
    var oldsize = [area.size[0], area.size[1]];
    
    var area2 = area.area_duplicate();
    if (i == 0 || i == 2) {
      //horizontal
      area2.size[0] = area.size[0];
      
      area2.size[1] = area.size[1]*(1.0 - t);
      area.size[1] *= t;
      
      area2.pos[0] = area.pos[0];
      area2.pos[1] = area.pos[1]+area.size[1];
    } else {
      area2.size[1] = area.size[1];
      
      area2.size[0] = area.size[0]*(1.0 - t);
      area.size[0] *= t;
      
      area2.pos[1] = area.pos[1];
      area2.pos[0] = area.pos[0]+area.size[0];
    }
    
    this.screen.add(area2);
    
    area.on_resize(area.size, oldsize);
    area2.on_resize(area2.size, oldsize);
    this.cleanup();
  }

  cancel(event)
  {
    this.cleanup();
  }

  cleanup(event)
  {
    this.end_modal();
    this.canvas.reset();
  }

  on_mouseup(event)
  {
    if (event.button == 0)
      this.finish(); 
    else if (event.button == 2)
      this.cancel();
  }
  on_keydown(event)
  {
    if (event.keyCode == charmap["Escape"])
      this.cancel();  
    if (event.keyCode == charmap["Enter"])
      this.finish();   
  }

  on_draw(gl)
  {
    this.canvas.on_draw(gl);
  }
}

class CollapseAreasTool extends EventHandler {
  constructor(screen, border) {
    EventHandler.call(this);
    this.border = border;
    this.screen = screen;
    this.canvas = screen.canvas;
    
    this.mpos = [0, 0];
    this.active = undefined : ScreenArea;
    
    this.mesh = border.build_mesh();
    this.areas = this.mesh[1][border.hash_edge(border.v1, border.v2)];
    
    for (var i=0; i<this.areas.length; i++) {
      this.areas[i] = this.areas[i].area;
    }
  }

  on_mousemove(event)
  {
    this.mpos = new Vector2([event.x, event.y])
    this.canvas.reset()
    
    var mpos = this.mpos;
    var active = undefined;
    for (var c in this.areas) {
      if (inrect_2d(mpos, c.pos, c.size)) {
        active = c;
        break;
      }
    }
    
    if (active == undefined)
      return;
    
    this.active = active;
    
    var canvas = this.canvas;
    var clr1 = [0.1, 0.1, 0.1, 0.1];
    var clr2 = [0.1, 0.1, 0.1, 1.0];
    var rad = 15;

    var ps = get_rect_points(new Vector2(active.pos), active.size);
    
    canvas.quad(ps[0], ps[1], ps[2], ps[3], clr1, clr1, clr1, clr1);
    canvas.line(ps[0], ps[2], clr2, undefined, 6.0);
    canvas.line(ps[1], ps[3], clr2, undefined, 6.0);
  }

  finish(event)
  {
    this.screen.pop_modal();
    
    if (this.active == undefined)
      return;
    
    var keep = undefined;
    for (var area in this.areas) {
      if (area != this.active) {
        keep = area;
        break;
      }
    }
    
    if (keep == undefined) {
      console.log("eek! error in CollapseAreasTool.finish!")
      return;
    }
    
    var mm = new MinMax(2);
    
    var ps1 = get_rect_points(this.active.pos, this.active.size);
    for (var i=0; i<4; i++) {
      mm.minmax(ps1[i]);
    }
    
    var ps2 = get_rect_points(keep.pos, keep.size);
    for (var i=0; i<4; i++) {
      mm.minmax(ps2[i]);
    }
    
    mm.minmax(this.active.pos);  
    
    this.active.on_close();
    this.screen.remove(this.active);
    var oldsize = new Vector2(keep.size);
    
    keep.pos[0] = mm.min[0];
    keep.pos[1] = mm.min[1];
    keep.size[0] = mm.max[0] - mm.min[0];
    keep.size[1] = mm.max[1] - mm.min[1];
    
    for (var i=0; i<2; i++) {
      keep.size[i] = Math.ceil(keep.size[i]);
      keep.pos[i] = Math.floor(keep.pos[i]);
    }
    
    keep.on_resize(keep.size, oldsize);
    keep.do_recalc();
    
    this.screen.snap_areas();
    this.canvas.reset();
  }

  cancel(event)
  {
    this.cleanup();
  }

  cleanup(event)
  {
    this.canvas.reset();
    this.screen.pop_modal();
  }

  on_mouseup(event)
  {
    if (event.button == 0)
      this.finish(); 
    else if (event.button == 2)
      this.cancel();
  }
  on_keydown(event)
  {
    if (event.keyCode == charmap["Escape"])
      this.cancel();  
    if (event.keyCode == charmap["Enter"])
      this.finish();   
  }

  on_draw(gl)
  {
    this.canvas.on_draw(gl);
  }
}

var BORDER_WIDTH=8
var _screenborder_id_gen = 1;
class ScreenBorder extends UIElement {
  constructor(area, borderindex) {
    UIElement.call(this);
    this.area = area;
    this.start_mpos = [0, 0];
    this.moving = false;
    this.bindex = borderindex;
    
    this.areas = undefined : GArray;
    this.borders = undefined : GArray;
    this.ci = 0;
    this._id = _screenborder_id_gen++;
    
    this.v1 = undefined : Array<float>;
    this.v2 = undefined : Array<float>;
    this.mesh = undefined : Array<Object>;
  }

  __hash__() {
    return this.constructor.name + "|" + this._id;
  }

  movable_border() : Boolean {
    var count = 0;
    for (var c in this.parent.children) {
      if (!(c instanceof ScreenArea))
        continue;
      
      if (aabb_isect_2d(this.pos, this.size, c.pos, c.size))
        count++;
    }
    
    return count > 1;
  }

  get_edge() {
    var v1 = new Vector2(this.pos);
    var v2 = new Vector2(this.pos);
    
    if (this.size[0] > this.size[1]) {
      v2[0] += this.size[0];
      
      //v1[1] += Math.floor(BORDER_WIDTH/2.0);
      //v2[1] += Math.floor(BORDER_WIDTH/2.0);
    } else {
      v2[1] += this.size[1];
      
      //v1[0] += Math.floor(BORDER_WIDTH/2.0);
      //v2[0] += Math.floor(BORDER_WIDTH/2.0);
    }
    
    return [v1, v2];
  }

  hash_edge(v1, v2) {
    var a1 = [Math.floor(v1[0]), Math.floor(v2[0])]
    var a2 = [Math.floor(v1[1]), Math.floor(v2[1])]
    a1.sort()
    a2.sort();
    
    return ""+a1[0]+"|"+a1[1]+"|"+a2[0]+"|"+a2[1];
  }

  hash_vert(v1) {
    return ""+Math.floor(v1[0])+"|"+Math.floor(v1[1])
  }

  build_mesh() {
    this.borders = new GArray();
    var i = 0;
    for (var c in this.parent.children) {
      if (c instanceof ScreenBorder) {
        c.ci = i++;
        this.borders.push(c);
      }
    }
    
    var edges = {};
    var verts = {};
    var vert_edges = {};
    for (var b in this.borders) {
      var ret = b.get_edge();
      var v1 = ret[0];
      var v2 = ret[1];
      
      var h = this.hash_edge(v1, v2);
      
      if (!(h in edges)) {
        edges[h] = new GArray();
      }
      
      var hv1 = this.hash_vert(v1);
      var hv2 = this.hash_vert(v2);
      
      if (!(hv1 in verts))
        verts[hv1] = new set();
      if (!(hv2 in verts))
        verts[hv2] = new set();
      if (!(hv1 in vert_edges))
        vert_edges[hv1] = new set();
      if (!(hv2 in vert_edges))
        vert_edges[hv2] = new set();
      
      edges[h].push(b);
      
      verts[hv1].add(b);
      verts[hv2].add(b);
      
      vert_edges[hv1].add(h);
      vert_edges[hv2].add(h);
      
      b.v1 = v1;
      b.v2 = v2;
    }
    
    return [verts, edges, vert_edges];
  }

  at_screen_border(event) {
    var ret = true;
    
    //move members into local variables, to save on column space
    var size = this.size, pos=this.pos, parent=this.parent;
    
    for (var i=0; i<2; i++) {
      var ret2 = Math.abs(pos[i]) < BORDER_WIDTH*3.0;
      ret2 = ret2 || Math.abs(pos[i]+size[i] - parent.size[i]) < BORDER_WIDTH*3.0;
      
      ret = ret2 & ret;
    }
    
    return ret;
  }
    
  on_mousedown(event) {
    if (event.button == 0 
      && !this.moving 
      && !this.at_screen_border(event)) 
    {
      this.start(event);
    }
  }

  border_menu(event) {
    console.log("border menu")
    
    var this2 = this;
    function menucb(entry, id) {
      if (id == "collapse") {
        this.parent.push_modal(new CollapseAreasTool(this2.parent, this2));
      }
    }
    
    var menu = new UIMenu("", menucb);
    menu.add_item("Collapse", "", "collapse");
    menu.ignore_next_mouseup_event = 0;
    
    ui_call_menu(menu, this.parent, [event.x+this.pos[0], event.y+this.pos[1]]);
  }

  start(event) {

    this.parent.push_modal(this);
    this.start_mpos = [event.x, event.y]
    this.moving = true;
    
    this.areas = new set();
    this.mesh = this.build_mesh()
    
    var verts = this.mesh[0]
    var edges = this.mesh[1]
    var vert_edges = this.mesh[2]
    
    var v1 = this.v1
    var v2 = this.v2
    var he = this.hash_edge(v1, v2);
    
    var es = new GArray([edges[he]]);
    for (var i=0; i<2; i++) {
      var v = i==0 ? v1 : v2;
      
      var j=0;
      while (1) {
        var nv = null;
        for (var eh in vert_edges[this.hash_vert(v)]) {
          if (eh == he) continue;
          var b = edges[eh][0];
          if ((b.size[0] > b.size[1]) == (this.size[0] > this.size[1])) {
            es.push(edges[eh]);
            if (this.hash_vert(b.v1) == this.hash_vert(v)) {
              nv = b.v2;
            } else {
              nv = b.v1;
            }
            
            he = eh;
            break;
          }
        }
        
        if (nv != null) {
          v = nv;
        } else {
          break;
        }
        
        j++;
        if (j > 100) {
          console.log("Infinite loop")
          break;
        }
      }
    }
    
    for (var e in es) {
      for (var b in e) {
        this.areas.add([b.area, b.bindex]);
      }
    }
  }

  on_mouseup(event) {
    if (this.moving) {
      this.finish();
    } else {
      if (event.button == 2) {
        this.border_menu(event);
      }
    }
  }

  find_bindex(pair) {
    var area = pair[0];
    var bs = this.parent.child_borders.get(area);
    
    if (area != this.area)
      return pair[1];
    else
      return this.bindex;
  }

  on_mousemove(event) {
    if (!this.moving)
      return;
    
    var mpos = new Vector2([event.x, event.y]);
    var start = new Vector2(this.start_mpos);
    
    var axis = this.size[0]>this.size[1] ? 1 : 0;
    var areas = this.areas;
    
    var delta = mpos[axis] - start[axis];
    
    for (var p in areas) {
      var a = p[0];
      var oldsize = new Vector2(a.size);
      
      var b = this.find_bindex(p);
      if (b == undefined) {
        console.log("yeek, undefined b");
        continue;
      }
      
      switch (b) {
        case 0:
          a.pos[1] += delta;
          a.size[1] -= delta;
          break;
        case 1:
          a.size[0] += delta;
          break;
        case 2:
          a.size[1] += delta;
          break;
        case 3:
          a.pos[0] += delta;
          a.size[0] -= delta;
          break;
      }
      
      a.on_resize(a.size, oldsize);
      
      this.parent.snap_areas();
    }
  }

  finish() {
    if (this.moving) {
      this.parent.pop_modal();
    }
    
    this.moving = false;
  }

  on_keydown(event) {
    if (this.moving) {
      if (event.keyCode == charmap["Escape"])
        this.finish();
      
      if (event.keyCode == charmap["Enter"])
        this.finish();
    }
  }

  on_active() {
    //console.log("border active")
    
    if (!this.movable_border())
      return;
      
    var cursor;
    if (this.size[0] > this.size[1]) {
      cursor = "n-resize"
    } else {
      cursor = "w-resize"
    }
    
    g.canvas.style.cursor = cursor;
  }

  on_inactive() {
    //console.log("border inactive")
    g.canvas.style.cursor = "default"
  }

  build_draw(UICanvas canvas, Boolean isVertical)
  {
    canvas.begin(this);
    //XXX!!
    //canvas.line(this.pos, new Vector2(this.pos).add([100, 100]), undefined, undefined, 20.0);
    canvas.end(this);
  }
}

class Screen extends UIFrame {
  constructor(WebGLRenderingContext gl, 
                unused, int width, 
                int height)
  {
    UIFrame.call(this, undefined);
    
    this.size = [width, height];
    this.pos = [0, 0];
    this.use_old_size = false; //use old size on next on_resize call, but only that call
    
    this.gl = gl;
    
    this.touchstate = {};
    this.touch_ms = {};
    this.tottouch = 0;
    
    this.session_timer = new Timer(60000);
    
    //this is used to delay keyup events for modifiers
    //it stores events in a queue, and delays them
    this.modup_time_ms = new GArray();
    
    this.rows = new GArray();
    this.cols = new GArray();
    
    this.last_tick = time_ms();
    this.child_borders = new hashtable();
    
    this.shift = false;
    this.alt = false;
    this.ctrl = false;
    
    this.keymap = new KeyMap();
    this.last_sync = time_ms();
    
    this.areas = new GArray();
    
    var this2 = this;
    function handle_split_areas() {
      this2.split_areas();
    }
    
    var k = this.keymap;
    k.add_tool(new KeyHandler("O", ["CTRL"], "Open File"),
               "appstate.open()");
    k.add_tool(new KeyHandler("S", ["CTRL", "ALT"], "Open File"),
               "appstate.save_as()");
    k.add_tool(new KeyHandler("S", ["CTRL"], "Open File"),
               "appstate.save()");
    k.add_func(new KeyHandler("V", [], "Split Areas"), handle_split_areas)
    k.add_func(new KeyHandler("U", ["CTRL", "SHIFT"]), function() {
      console.log("saving new startup file.");
      g_app_state.set_startup_file();
    });
    
    this.canvas = new UICanvas({gl: g_app_state.gl}, [[0, 0], this.size]);
  }

  static fromSTRUCT(reader) {
    var ob = new Screen(gl, 0, 512, 512);
    
    reader(ob);
    
    ob.areas = new GArray(ob.areas);
    
    for (var c in ob.areas) {
      c.parent = ob;
    }
    
    return ob;
  }

  destroy() {
    this.canvas.destroy();
    
    for (var c in this.children) {
      if (c instanceof ScreenArea) {
        c.destroy();
      }
    }
  }
  
  split_areas() {
    console.log("split areas", this);
    
    g_app_state.toolstack.exec_tool(new SplitAreasTool(this));
    
    /*
    var c = this.children[0]
    
    var oldsize = [c.size[0], c.size[1]]
    var newsize = [c.size[0]*0.5, c.size[1]]
    
    c.size[0] = c.size[0]*0.5;
    c.on_resize(oldsize, newsize);
    
    var c2 = c.area_duplicate()
    c2.size = new Vector2(c.size)
    c2.pos = [c.size[0], 0]
    this.add(c2);
    
    //c.size[0] = c.size[0]*0.5;
    //c.set_canvasbox()
    // */
  }

  set_touchstate(MouseEvent event, String type) {
    for (var k in event.touches) {
      this.touch_ms[k] = time_ms();
      
      if (type == "down" || type == "move") {
        this.touchstate[k] = event.touches[k];
      } else if (type == "up") {
        delete this.touchstate[k];
      }
    }
    
    var threshold = 4000;
    this.tottouch = 0;
    for (var k in this.touchstate) {
      if (time_ms() - this.touch_ms[k] > threshold) {
        console.log("Destroying stale touch state");
        
        var event = new MyMouseEvent(event.x, event.y, 0, MyMouseEvent.MOUSEUP);
        event.touches = {k : this.touchstate[k]};
        
        //prevent infinite recursion
        this.touch_ms[k] = time_ms();
        this.on_mouseup(event);
        delete this.touchstate[k];
      }
      this.tottouch++;
    }
  }
  
  _on_mousemove(MouseEvent e)
  {
    if (DEBUG.mousemove)
      console.log("mmove", [e.x, e.y])
    
    this.mpos = [e.x, e.y];
    for (var c in this.children) {
      c.mpos = new Vector2([e.x-c.pos[0], e.y-c.pos[1]])
    }
    
    e = this.handle_event_modifiers(e);
    this.set_touchstate(e, "move");
    
    //console.log("t", e.touches, this.tottouch);
    UIFrame.prototype._on_mousemove.call(this, e);
  }

  get_active_view3d() {
    var view3d = undefined;
    
    if (this.active != undefined && this.active instanceof ScreenArea) {
      if (this.active.area instanceof View3DHandler) {
        view3d = this.active.area;
      }
    }
    
    //console.log("active view3d:", view3d._id, view3d);
    return view3d;
  }

  handle_active_view3d() {
    var view3d = this.get_active_view3d();
    if (view3d != undefined)
      g_app_state.active_view3d = view3d;
  }

  _on_mousedown(MouseEvent e)
  {
    this.handle_active_view3d();
    
    if (DEBUG.mouse)
      console.log("mdown", [e.x, e.y], e.button)
    
    this.mpos = [e.x, e.y];  
    for (var c in this.children) {
      c.mpos = new Vector2([e.x-c.pos[0], e.y-c.pos[1]])
    }
    
    e = this.handle_event_modifiers(e);
    this.set_touchstate(e, "down");
    
    //console.log("t", e.touches, this.tottouch);
    UIFrame.prototype._on_mousedown.call(this, e);
  }

  _on_mouseup(MouseEvent e)
  {
    this.handle_active_view3d();
    
    if (DEBUG.mouse)
      console.log("mouseup", [e.x, e.y], e.button)
    this.mpos = [e.x, e.y];
    for (var c in this.children) {
      c.mpos = new Vector2([e.x-c.pos[0], e.y-c.pos[1]])
    }
    
    e = this.handle_event_modifiers(e);
    this.set_touchstate(e, "up");
    
    //console.log("t", e.touches, this.tottouch);
    UIFrame.prototype._on_mouseup.call(this, e);
  }

  _on_mousewheel(MouseEvent e, float delta)
  {
    this.handle_active_view3d();
    
    this.mpos = [e.x, e.y];
    for (var c in this.children) {
      c.mpos = new Vector2([e.x-c.pos[0], e.y-c.pos[1]])
    }
    
    UIFrame.prototype._on_mousewheel.call(this, e, delta);
  }

  handle_event_modifiers(KeyboardEvent event) {
    var copy = false;
    var event2;
    
    if (event instanceof MyMouseEvent) {
        event2 = event.copy();
        event2.keyCode = event.keyCode;
        event2.shiftKey = event.shiftKey;
        event2.ctrlKey = event.ctrlKey;
        event2.altKey = event.altKey;
    } else {
      event2 = {
          x : event.x,
          y : event.y,
          button : event.button,
          keyCode : event.keyCode,
          shiftKey : event.shiftKey,
          ctrlKey : event.ctrlKey,
          altKey : event.altKey
       };
    }
    
    event = event2;
    
    for (var item in this.modup_time_ms) {
      if (item[2] == charmap["Shift"])
        event.shiftKey = true;
      if (item[2] == charmap["Alt"])
        event.altKey = true;
      if (item[2] == charmap["Ctrl"]) {
        event.ctrlKey = true;
      }
    }
    
    return event;
  }

  _on_keyup(KeyboardEvent event) {
    this.handle_active_view3d();
    
    switch (event.keyCode) {
      case charmap["Shift"]:
      case charmap["Alt"]:
      case charmap["Ctrl"]:
        event = {
          keyCode : event.keyCode,
          shiftKey : event.shiftKey,
          altKey : event.altKey,
          ctrlKey : event.ctrlKey
        };
        this.modup_time_ms.push([time_ms(), event, event.keyCode]);
        return;
        break;
    }
    
    event = this.handle_event_modifiers(event)
    
    prior(Screen, this)._on_keyup.call(this, event);
  }


  _on_keydown(KeyboardEvent event) {
    this.handle_active_view3d();
    
    event = this.handle_event_modifiers(event);
    
    this.shift = event.shiftKey;
    this.ctrl = event.ctrlKey;
    this.alt = event.altKey;
    
    prior(Screen, this)._on_keydown.call(this, event);
  }

  on_keyup(KeyboardEvent event) {
    this.handle_active_view3d();
    
    var ctx = new Context();
    var ret = this.keymap.process_event(ctx, event);
    
    if (ret != undefined) {
      ret.handle(ctx);
    } else {
      prior(Screen, this).on_keyup.call(this, event);
    }
  }

  on_draw(WebGLRenderingContext gl)
  {
    g_app_state.gl = gl;
    g_app_state.raster.begin_draw(gl, this.pos, this.size);
    
    //deal with delayed modifier key events
    var mod_delay = 60;
    
    for (var s in list(this.modup_time_ms)) {
      if (time_ms() - s[0] > mod_delay) {
        if (s[1].keyCode == charmap["Shift"]) {
          s[1].altKey = this.alt;
          s[1].ctrlKey = this.ctrl;
          this.shift = false;
        }
        
        if (s[1].keyCode == charmap["Alt"]) {
          s[1].shiftKey = this.shift;
          s[1].ctrlKey = this.ctrl;
          this.alt = false;
        }
        
        if (s[1].keyCode == charmap["Ctrl"]) {
          s[1].shiftKey = this.shift;
          s[1].altKey = this.alt;
          this.ctrl = false;
        }
        
        if (DEBUG.modifier_keys)
          console.log("delayed event");
        
        this.modup_time_ms.remove(s);
        prior(Screen, this)._on_keyup.call(this, s[1]);
      }
    }
    
    // Clear the canvas
    gl.colorMask(true, true, true, true);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);

    /*recalculate root scissor box*/
    gl.enable(gl.SCISSOR_TEST);
    
    /*if ((this.active instanceof ScreenArea) && this.active.area instanceof
        View3DHandler) 
    {
      g_app_state.active_view3d = this.active.area;
    }*/
    
    if (time_ms() - g_app_state.jobs.last_ms > g_app_state.jobs.ival) {
      g_app_state.jobs.run();
      g_app_state.jobs.last_ms = time_ms();
    }
    
    g_app_state.raster.reset_scissor_stack();
    g_app_state.raster.push_scissor([0, 0], this.size);

   //draw editors
    for (var c in this.children) {
      //only call draw for screenarea children
      if (!(c instanceof ScreenArea)) continue;
     
      g_app_state.raster.push_scissor(c.pos, c.size);
      
      this.recalc_child_borders(c);
      c.on_draw(gl);

      g_app_state.raster.pop_scissor();
    }
    
    gl.enable(gl.BLEND);
    gl_blend_func(gl);
     
    gl.viewport(0, 0, this.size[0], this.size[1]);
    prior(Screen, this).on_draw.call(this, gl);
    
    if (time_ms() - this.last_tick > 42) { //(IsMobile ? 500 : 150)) {
      this.on_tick();
      this.last_tick = time_ms();
    }
    
    if (this.modalhandler != null && !(this.modalhandler instanceof ScreenArea)) {
      this.modalhandler.on_draw(gl);
    }
    
    g_app_state.raster.pop_scissor();
    gl.disable(gl.SCISSOR_TEST);
  }

  //generates keyboard events from the canvas DOM element's
  //innerHTML
  do_mobile_input() { 
    var canvas = document.getElementById("canvas");
    
    if (canvas.textContent != "") {
      for (var c in canvas.textContent) {
        if (!(c in charmap_latin_1)) continue;
        
        c = charmap_latin_1[c];
        
        var event = new MyKeyboardEvent(c);
        this._on_keydown(event);
      }
      canvas.textContent = "";
    }
  }
  
  on_tick()
  {
    this.handle_active_view3d();
    
    if (IsMobile) {
      this.do_mobile_input();
    }
    
    g_app_state.notes.on_tick();
    
    if (time_ms() - this.last_sync > 700) {
      this.last_sync = time_ms();
    }
    
    if (this.modalhandler == null && 
        !g_app_state.session.is_logged_in) 
    {
      login_dialog(new Context());
    }
    
    if (this.session_timer.ready() && g_app_state.session.is_logged_in) 
    {
      g_app_state.session.validate_session();
    }
    
    prior(Screen, this).on_tick.call(this, function(c) {
      if (c instanceof ScreenArea && c.area instanceof View3DHandler) {
        //g_app_state.active_view3d = c.area;
      }
    });
  }

  on_resize(Array<int> newsize, Array<int> oldsize) 
  {
    g_app_state.size = new Vector2(newsize);
    
    if (oldsize == undefined || this.use_old_size)
      oldsize = [this.size[0], this.size[1]];
    
    if (newsize[0] < 100 || newsize[1] < 100) {
      this.use_old_size = true;
      newsize[0] = 100;
      newsize[1] = 100;
    }
    
    var ratio = (new Vector2(newsize)).divide(oldsize);
    
    this.size = [newsize[0], newsize[1]];
    this.canvas.viewport = [[0,0], newsize]
    
    if (oldsize[0] == 0.0 || oldsize[1] == 0.0)
      return;
    
    for (var c in this.children) {
      
      c.pos[0] *= ratio[0];
      c.pos[1] *= ratio[1];
      c.pos[0] = Math.floor(c.pos[0])
      c.pos[1] = Math.floor(c.pos[1])
      
      //don't resize dialogs and menus
      if (c instanceof Dialog || c instanceof UIMenu || c instanceof UIRadialMenu) continue;
      c.size[0] *= ratio[0];
      c.size[1] *= ratio[1];
      c.size[0] = Math.ceil(c.size[0])
      c.size[1] = Math.ceil(c.size[1])
    }
   
    this.snap_areas();
    
    for (var c in this.children) {
      //if (c instanceof ScreenArea && c.area instanceof View3DHandler)
      //  g_app_state.active_view3d = c.area;
      
      c.on_resize(newsize, oldsize);
    }
  }

  snap_areas() {
    //first ensure all areas are within the screen bounds
    for (var sa in this.children) {
      if (!(sa instanceof ScreenArea))
        continue;
      
      sa.pos[0] = Math.max(sa.pos[0], 0.0);
      sa.pos[1] = Math.max(sa.pos[1], 0.0);
      sa.size[0] = Math.min(sa.size[0]+sa.pos[0], this.size[0]) - sa.pos[0];
      sa.size[1] = Math.min(sa.size[1]+sa.pos[1], this.size[1]) - sa.pos[1];
    }
    
    //snapping code
    var dis = 6.0;
    for (var i=0; !found && i<128; i++) {
      var found = false;
      
      for (var c1 in this.children) {
        if (!(c1 instanceof ScreenArea))
          continue;
        for (var c2 in this.children) {
          if (!(c2 instanceof ScreenArea))
            continue;
          if (c1 == c2)
            continue;
          
          var oldsize = new Vector2(c2.size);

          var found2 = false;
          if (Math.abs(c1.pos[0]-c2.pos[0]) < dis) {
            c2.pos[0] = c1.pos[0];
            found2 = true;
          } else if (Math.abs(c1.pos[0]+c1.size[0]-c2.pos[0]) < dis) {
            c2.pos[0] = c1.pos[0] + c1.size[0];
            found2 = true;
          }
          
          if (Math.abs(c1.pos[1]-c2.pos[1]) < dis) {
            c2.pos[1] = c1.pos[1];
            found2 = true;
          } else if (Math.abs(c1.pos[1]+c1.size[1]-c2.pos[1]) < dis) {
            c2.pos[1] = c1.pos[1] + c1.size[1];
            found2 = true;
          }
          
          if (found2) {
            found = true;
            c2.on_resize(c2.size, oldsize);
          }
          
          if (found2)
            break;
        }
      }
    }
  }

  pop_modal()
  {
    UIFrame.prototype.pop_modal.call(this);
    
    if (this.modalhandler == null) {
      var e = new MyMouseEvent(this.mpos[0], this.mpos[1], 0, 0);
      e.shiftKey = this.shiftKey;
      e.altKey = this.altKey;
      e.ctrlKey = this.ctrlKey;
      
      this._on_mousemove(e);
    }
  }

  recalc_child_borders(ScreenArea child)
  {
    var ls = get_rect_lines(new Vector2(child.pos), child.size);
    var bs = this.child_borders.get(child);
    
    for (var i=0; i<4; i++) {
      var border = bs[i];
      var len = new Vector2(ls[i][1]).sub(ls[i][0]).vectorLength();
      
      border.pos = ls[i][0];
      for (var j=0; j<2; j++) {
        border.pos[j] = Math.min(ls[i][1][j], border.pos[j])
      }
      
      if ((i%2)==0) {
        border.size[0] = len;
        border.size[1] = BORDER_WIDTH;
        
        //border.pos[1] -= Math.floor(BORDER_WIDTH/2.0);
      } else {
        border.size[1] = len;
        border.size[0] = BORDER_WIDTH;
        
        //border.pos[0] -= Math.floor(BORDER_WIDTH/2.0);
      }
    }
  }

  remove(UIElement child) {
    UIFrame.prototype.remove.call(this, child);
    
    if (child instanceof ScreenArea) {
      this.areas.remove(child);
      
      var bs = this.child_borders.get(child);
      for (var i=0; i<4; i++) {
        this.remove(bs[i]);
      }
      
      this.child_borders.remove(child);
    }
  }

  add(UIElement child, packflag) { //packflag is optional
    var view3d;
    
    if (child instanceof ScreenArea) {
      this.areas.push(child);
      
      for (var k in child.editors) {
        var area = child.editors[k];
        if (area instanceof View3DHandler)
          view3d = area;
      }
    }
    
    if (view3d == undefined) {
      for (var c in this.children) {
        if (!(c instanceof ScreenArea))
          continue;
        
        if (View3DHandler.constructor.name in c.editors) {
          view3d = c.editors[View3DHandler.constructor.name];
          break;
        }
      }
    }
    
    if (child instanceof ScreenArea) {
      var canvas = new UICanvas(view3d);
      
      for (var k in child.editors) {
        child.editors[k].canvas  = canvas;
      }
    } else if (child.canvas != undefined) {
      child.canvas = this.canvas;
    }
    
    UIFrame.prototype.add.call(this, child, packflag);
    
    if (child instanceof ScreenArea) {
      var bs = []
      for (var i=0; i<4; i++) {
        bs.push(new ScreenBorder(child, i));
        this.add(bs[bs.length-1]);
      }
      
      this.child_borders.set(child, bs);
      this.recalc_child_borders(child);
    }
  }

  toJSON() {
    var scrareas = new GArray();
    
    for (var c in this.children) {
      if (c instanceof ScreenArea)
        scrareas.push(c);
    }
    
    var ret = {scrareas : [], size : [this.size[0], this.size[1]]}
    for (var a in scrareas) {
      ret.scrareas.push(a.toJSON());
    }
    
    return ret;
  }

  build_draw(canvas, isVertical) {
    prior(Screen, this).build_draw.call(this, canvas, isVertical);
  }

  data_link(block, getblock, getblock_us)
  {
    //have got to decouple context from View3DHandler
    this.ctx = new Context();
    
    for (var c in this.areas) {
      c.data_link(block, getblock, getblock_us);
    }
    
    var areas = this.areas;
    this.areas = new GArray()
    
    for (var a in areas) {
      this.add(a);
    }
  }
}

Screen.STRUCT = """
  Screen { 
    pos   : vec2;
    size  : vec2;
    areas : array(abstract(ScreenArea));
  }
"""

function load_screen(Screen scr, json_obj)
{
  var newsize = [scr.size[0], scr.size[1]]
  
  var obj = json_obj
  
  for (var c in list(scr.children)) {
    if (!(c instanceof ScreenBorder)) {
      console.log(c);
      scr.remove(c);
    }
  }
  scr.children = new GArray();
  
  var scrareas = obj.scrareas;
  for (var i=0; i<scrareas.length; i++) {
    var area = ScreenArea.fromJSON(scrareas[i]);
    scr.add(area);
    
    if (area.area instanceof View3DHandler) {
      scr.view3d = area.area;
      //scr.ctx.view3d = area.area;
      //g_app_state.active_view3d = area.area;
    }
  }
  
  //scale to current window size
  scr.size[0] = obj.size[0]; scr.size[1] = obj.size[1];
  scr.on_resize(newsize, obj.size);
  
  scr.size[0] = newsize[0]; scr.size[1] = newsize[1];
  scr.snap_areas();
}

function gen_screen(WebGLRenderingContext gl, View3DHandler view3d, int width, int height)
{
  var scr = new Screen(gl, view3d, width, height);
  view3d.screen = scr;
  
  g_app_state.screen = scr;
  g_app_state.eventhandler = scr;
  
  g_app_state.gl = gl;
  
  g_app_state.active_view3d = view3d;
  
  view3d.size = [width, height]
  view3d.pos = [0, 0];
  
  scr.ctx = new Context();
  scr.canvas = new UICanvas(view3d, [[0, 0], [width, height]]);
  
  scr.add(new ScreenArea(view3d, scr.ctx, view3d.pos, view3d.size));

  return scr;
}

class HintPickerOpElement extends UIElement {
  constructor(ctx, HintPickerOp op) {
    UIElement.call(this, ctx);
    this.op = op;
  }
  
  build_draw(UICanvas canvas, Boolean isVertical) {
    this.op.canvas = canvas;
    this.op.build_draw();
  }
}

class HintPickerOp extends ToolOp {
  constructor() {
    ToolOp.call(this, "hint_picker", "Hint Picker", 
                "Helper tool to display tooltips on tablets", 
                Icons.HELP_PICKER);
    
    this.canvas = g_app_state.screen.canvas;
    this.undoflag = UndoFlags.IGNORE_UNDO;
    this.is_modal = true;
    
    this.mup_count = 0; //we count the number of mouseups to implement touch tablet mode
    this.inputs = {};
    this.outputs = {};
    this.active = undefined;
    this.hintbox = undefined;
    this.last_mpos = new Vector2([0, 0]);
  }
  
  can_call(Context ctx) {
    return true; //g_app_state.modalhandler == undefined;
  }
  
  find_element(MouseEvent event, Array<float> mpos) {
    function descend(e, mpos) {
      if (e instanceof UIHoverHint) {
        return e;
      } else if (!(e instanceof UIFrame)) {
        return undefined;
      }
      
      mpos = [mpos[0]-e.pos[0], mpos[1]-e.pos[1]];
      for (var c in e.children) {
        if (inrect_2d(mpos, c.pos, c.size))
          return descend(c, mpos);
      }
    }
    
    var ret;
    for (var c in g_app_state.screen.children) {
      if (!(c instanceof ScreenArea)) continue;
      if (!inrect_2d(mpos, c.pos, c.size)) continue;
      
      ret = descend(c, mpos);
      if (ret != undefined)
        break;
    }
    
    this.active = ret;
    
    return ret;
  }
  
  on_mousemove(MouseEvent event) {
    this.canvas = g_app_state.screen.canvas;
    
    var ctx = this.modal_ctx;
    var mpos = [event.x, event.y];
    
    var old = this.active;
    this.find_element(event, mpos);
    
    if (old != this.active && this.active != undefined) {
      if (this.hintbox != undefined) {
        this.hintbox.parent.remove(this.hintbox);
        this.hintbox.parent.do_recalc();
      }
      
      this.helper.do_recalc();
      this.hintbox = this.active.on_hint(false);
      
      console.log("active change");
    } else if (old != this.active && this.active == undefined) {
      this.helper.do_recalc();
    }

    //console.log("active: ", this.active);
    //g_app_state.build_draw(this.canvas, false);
  }
  
  modal_init(Context ctx) {
    console.log("helper tool");
    var helper = new HintPickerOpElement(ctx, this);
    
    g_app_state.screen.add(helper);
    this.helper = helper;
  }
  
  finish() {
    this.canvas.reset();
    this.end_modal();
    
    g_app_state.screen.remove(this.helper);
    
    if (this.hintbox != undefined) {
      this.hintbox.parent.remove(this.hintbox);
      this.hintbox.parent.do_recalc();
    }
  }
  
  on_mousedown(MouseEvent event) {
    this.on_mousemove(event);
  }
  
  on_mouseup(MouseEvent event) {
    console.log("was_touch", this.active, (this.active && g_app_state.was_touch && this.mup_count < 1));
    
    if (g_app_state.was_touch && this.active != undefined) {
      return;
    }
    
    this.finish();
  }
  
  on_keyup(KeyboardEvent event) {
    if (event.keyCode == 27) { //escape key
      this.canvas.reset();
      this.finish();
    }
  }
  
  build_draw() {
    //console.log("rebuilding draw...");
    
    //this.canvas.reset();
    var clr = [0, 0, 0, 0.35];
    
    if (this.active == undefined) {
      this.canvas.simple_box([0, 0], g_app_state.screen.size, clr);
    } else {
      var pos = this.active.get_abs_pos();
      this.canvas.passpart(pos, this.active.size, clr);
    }
  }
  
  on_draw(WebGLRenderingContext gl) {
    this.canvas.on_draw(gl);
  }
}