"use strict";

var GridTypes = {CART: 1, TRIANGLE: 2};
var GridFlags = {
  XRULER: 1,
  YRULER: 2,
  ZRULER: 4
};

class ViewGrid {
  constructor(steps) {
    this.steps = steps;
    this.substeps = substeps;
    this.substep_level = 2;
    
    this.unit = g_all_state.session.settings.unit;
    this.rulerunit = this.unit;
    this.type = GridTypes.CART;
    
    this.bb = [[-10, -10, -10], [10, 10, 10]];
    this.bb[0] = new Vector3(this.bb[0]);
    this.bb[1] = new Vector3(this.bb[1]);
    
    this.dir = new Vector3([0, 0, 1.0]);
    
    this.flag = 0;  
  }

  draw(gl) {
  }
  
  static fromSTRUCT(reader) {
    var grid = new ViewGrid(1);
    
    reader(grid);
    reader.bb = [reader.bb_min, reader.bb_max];
    
    delete reader.bb_min 
    delete reader.bb_max
    
    return grid;
  }
}

ViewGrid.STRUCT = """
  ViewGrid {
    steps         : int;
    substeps      : int;
    substep_level : int;
    unit          : string;
    rulerunit     : string;
    type          : int;
    bb_min        : vec3 | obj.bb[0];
    bb_max        : vec3 | obj.bb[1];
    dir           : vec3;
    flag          : int;
  }
""";
