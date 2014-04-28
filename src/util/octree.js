"use strict";

class OcNode {
  constructor() {
    this.children = new GArray();
    this.data = undefined;
    
    this.min = new Vector3();
    this.max = new Vector3();
    this.id = undefined;
  }
}

class OcTree {
  constructor() {
    this.nodes = new GArray();
    this.root = OcNode();
  }
}