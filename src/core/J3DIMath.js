"use strict";

/*
 * Copyright (C) 2009 Apple Inc. All Rights Reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE INC. ``AS IS'' AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL APPLE INC. OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
 * OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

 //okay. I just noticed this pun.  ITS HORRIBLE. - joe
 
 //  (Jedi) - A support library for WebGL.

/*
     Math Classes. Currently includes:

        Matrix4 - A 4x4 Matrix
*/

/*
    Matrix4 class

    This class implements a 4x4 matrix. It has functions which duplicate the
    functionality of the OpenGL matrix stack and glut functions. On browsers
    that support it, CSSMatrix is used to accelerate operations.

    IDL:

    [
        Constructor(in Matrix4 matrix),                 // copy passed matrix into new Matrix4
        Constructor(in sequence<float> array)               // create new Matrix4 with 16 floats (row major)
        Constructor()                                       // create new Matrix4 with identity matrix
    ]
    interface Matrix4 {
        void load(in Matrix4 matrix);                   // copy the values from the passed matrix
        void load(in sequence<float> array);                // copy 16 floats into the matrix
        sequence<float> getAsArray();                       // return the matrix as an array of 16 floats
        Float32Array getAsFloat32Array();             // return the matrix as a Float32Array with 16 values
        void setUniform(in WebGLRenderingContext ctx,       // Send the matrix to the passed uniform location in the passed context
                        in WebGLUniformLocation loc,
                        in boolean transpose);
        void makeIdentity();                                // replace the matrix with identity
        void transpose();                                   // replace the matrix with its transpose
        void invert();                                      // replace the matrix with its inverse

        void translate(in float x, in float y, in float z); // multiply the matrix by passed translation values on the right
        void translate(in J3DVector3 v);                    // multiply the matrix by passed translation values on the right
        void scale(in float x, in float y, in float z);     // multiply the matrix by passed scale values on the right
        void scale(in J3DVector3 v);                        // multiply the matrix by passed scale values on the right
        void rotate(in float angle,                         // multiply the matrix by passed rotation values on the right
                    in float x, in float y, in float z);    // (angle is in radians)
        void rotate(in float angle, in J3DVector3 v);       // multiply the matrix by passed rotation values on the right
                                                            // (angle is in radians)
        void multiply(in CanvasMatrix matrix);              // multiply the matrix by the passed matrix on the right
        void divide(in float divisor);                      // divide the matrix by the passed divisor
        void ortho(in float left, in float right,           // multiply the matrix by the passed ortho values on the right
                   in float bottom, in float top,
                   in float near, in float far);
        void frustum(in float left, in float right,         // multiply the matrix by the passed frustum values on the right
                     in float bottom, in float top,
                     in float near, in float far);
        void perspective(in float fovy, in float aspect,    // multiply the matrix by the passed perspective values on the right
                         in float zNear, in float zFar);
        void lookat(in J3DVector3 eye,                      // multiply the matrix by the passed lookat
                in J3DVector3 center,  in J3DVector3 up);   // values on the right
         bool decompose(in J3DVector3 translate,            // decompose the matrix into the passed vector
                        in J3DVector3 rotate,
                        in J3DVector3 scale,
                        in J3DVector3 skew,
                        in sequence<float> perspective);
    }

    [
        Constructor(in J3DVector3 vector),                  // copy passed vector into new J3DVector3
        Constructor(in sequence<float> array)               // create new J3DVector3 with 3 floats from array
        Constructor(in float x, in float y, in float z)     // create new J3DVector3 with 3 floats
        Constructor()                                       // create new J3DVector3 with (0,0,0)
    ]
    interface J3DVector3 {
        void load(in J3DVector3 vector);                    // copy the values from the passed vector
        void load(in sequence<float> array);                // copy 3 floats into the vector from array
        void load(in float x, in float y, in float z);      // copy 3 floats into the vector
        sequence<float> getAsArray();                       // return the vector as an array of 3 floats
        Float32Array getAsFloat32Array();             // return the matrix as a Float32Array with 16 values
        void multVecMatrix(in Matrix4 matrix);             // multiply the vector by the passed matrix (on the right)
        float vectorLength();                               // return the length of the vector
        float dot();                                        // return the dot product of the vector
        void cross(in J3DVector3 v);                        // replace the vector with vector x v
        void divide(in float divisor);                      // divide the vector by the passed divisor
    }
*/

var HasCSSMatrix = false;
var HasCSSMatrixCopy = false;
/*
if ("WebKitCSSMatrix" in window && ("media" in window && window.media.matchMedium("(-webkit-transform-3d)")) ||
                                   ("styleMedia" in window && window.styleMedia.matchMedium("(-webkit-transform-3d)"))) {
    HasCSSMatrix = true;
    if ("copy" in WebKitCSSMatrix.prototype)
        HasCSSMatrixCopy = true;
}
*/

//  console.log("HasCSSMatrix="+HasCSSMatrix);
//  console.log("HasCSSMatrixCopy="+HasCSSMatrixCopy);

//
// Matrix4
//

var M_SQRT2 = Math.sqrt(2.0);
var FLT_EPSILON = 2.22e-16;

function internal_matrix() {
  this.m11 = 0.0; this.m12 = 0.0; this.m13 = 0.0; this.m14 = 0.0;
  this.m21 = 0.0; this.m22 = 0.0; this.m23 = 0.0; this.m24 = 0.0;
  this.m31 = 0.0; this.m32 = 0.0; this.m33 = 0.0; this.m34 = 0.0;
  this.m41 = 0.0; this.m42 = 0.0; this.m43 = 0.0; this.m44 = 0.0;
}

class Matrix4 {
  constructor(Array<float> m) {
      if (HasCSSMatrix)
          this.$matrix = new WebKitCSSMatrix;
      else
          this.$matrix = new internal_matrix();
    
      this.isPersp = false;
      
      if (typeof m == 'object') {
          if ("length" in m && m.length >= 16) {
              this.load(m);
              return;
          }
          else if (m instanceof Matrix4) {
              this.load(m);
              return;
          }
      }
      this.makeIdentity();
  }

  load() {
      if (arguments.length == 1 && typeof arguments[0] == 'object') {
          var matrix;

          if (arguments[0] instanceof Matrix4) {
              matrix = arguments[0].$matrix;
              
              this.isPersp = arguments[0].isPersp;

              this.$matrix.m11 = matrix.m11;
              this.$matrix.m12 = matrix.m12;
              this.$matrix.m13 = matrix.m13;
              this.$matrix.m14 = matrix.m14;

              this.$matrix.m21 = matrix.m21;
              this.$matrix.m22 = matrix.m22;
              this.$matrix.m23 = matrix.m23;
              this.$matrix.m24 = matrix.m24;

              this.$matrix.m31 = matrix.m31;
              this.$matrix.m32 = matrix.m32;
              this.$matrix.m33 = matrix.m33;
              this.$matrix.m34 = matrix.m34;

              this.$matrix.m41 = matrix.m41;
              this.$matrix.m42 = matrix.m42;
              this.$matrix.m43 = matrix.m43;
              this.$matrix.m44 = matrix.m44;
              return;
          }
          else
              matrix = arguments[0];

          if ("length" in matrix && matrix.length >= 16) {
              this.$matrix.m11 = matrix[0];
              this.$matrix.m12 = matrix[1];
              this.$matrix.m13 = matrix[2];
              this.$matrix.m14 = matrix[3];

              this.$matrix.m21 = matrix[4];
              this.$matrix.m22 = matrix[5];
              this.$matrix.m23 = matrix[6];
              this.$matrix.m24 = matrix[7];

              this.$matrix.m31 = matrix[8];
              this.$matrix.m32 = matrix[9];
              this.$matrix.m33 = matrix[10];
              this.$matrix.m34 = matrix[11];

              this.$matrix.m41 = matrix[12];
              this.$matrix.m42 = matrix[13];
              this.$matrix.m43 = matrix[14];
              this.$matrix.m44 = matrix[15];
              return;
          }
      }

      this.makeIdentity();
  }

  toJSON() {
    return {isPersp: this.isPersp, items: this.getAsArray()};
  }
  
  static fromJSON(json) {
  //Matrix4.fromJSON = function(json) {
    var mat = new Matrix4()
    
    mat.load(json.items)
    mat.isPersp = json.isPersp
    
    return mat;
  }
  //}

  getAsArray() : Array<float>
  {
      return [
          this.$matrix.m11, this.$matrix.m12, this.$matrix.m13, this.$matrix.m14,
          this.$matrix.m21, this.$matrix.m22, this.$matrix.m23, this.$matrix.m24,
          this.$matrix.m31, this.$matrix.m32, this.$matrix.m33, this.$matrix.m34,
          this.$matrix.m41, this.$matrix.m42, this.$matrix.m43, this.$matrix.m44
      ];
  }

  getAsFloat32Array() : Float32Array
  {
      if (HasCSSMatrixCopy) {
          var array = new Float32Array(16);
          this.$matrix.copy(array);
          return array;
      }
      return new Float32Array(this.getAsArray());
  }

  setUniform(WebGLRenderingContext ctx, WebGLUniformLocation loc, Boolean transpose)
  {
      if (Matrix4.setUniformArray == undefined) {
          Matrix4.setUniformWebGLArray = new Float32Array(16);
          Matrix4.setUniformArray = new Array(16);
      }

      if (HasCSSMatrixCopy)
          this.$matrix.copy(Matrix4.setUniformWebGLArray);
      else {
          Matrix4.setUniformArray[0] = this.$matrix.m11;
          Matrix4.setUniformArray[1] = this.$matrix.m12;
          Matrix4.setUniformArray[2] = this.$matrix.m13;
          Matrix4.setUniformArray[3] = this.$matrix.m14;
          Matrix4.setUniformArray[4] = this.$matrix.m21;
          Matrix4.setUniformArray[5] = this.$matrix.m22;
          Matrix4.setUniformArray[6] = this.$matrix.m23;
          Matrix4.setUniformArray[7] = this.$matrix.m24;
          Matrix4.setUniformArray[8] = this.$matrix.m31;
          Matrix4.setUniformArray[9] = this.$matrix.m32;
          Matrix4.setUniformArray[10] = this.$matrix.m33;
          Matrix4.setUniformArray[11] = this.$matrix.m34;
          Matrix4.setUniformArray[12] = this.$matrix.m41;
          Matrix4.setUniformArray[13] = this.$matrix.m42;
          Matrix4.setUniformArray[14] = this.$matrix.m43;
          Matrix4.setUniformArray[15] = this.$matrix.m44;

          Matrix4.setUniformWebGLArray.set(Matrix4.setUniformArray);
      }

      ctx.uniformMatrix4fv(loc, transpose, Matrix4.setUniformWebGLArray);
  }

  makeIdentity()
  {
      this.$matrix.m11 = 1;
      this.$matrix.m12 = 0;
      this.$matrix.m13 = 0;
      this.$matrix.m14 = 0;

      this.$matrix.m21 = 0;
      this.$matrix.m22 = 1;
      this.$matrix.m23 = 0;
      this.$matrix.m24 = 0;

      this.$matrix.m31 = 0;
      this.$matrix.m32 = 0;
      this.$matrix.m33 = 1;
      this.$matrix.m34 = 0;

      this.$matrix.m41 = 0;
      this.$matrix.m42 = 0;
      this.$matrix.m43 = 0;
      this.$matrix.m44 = 1;
  }

  transpose()
  {
      var tmp = this.$matrix.m12;
      this.$matrix.m12 = this.$matrix.m21;
      this.$matrix.m21 = tmp;

      tmp = this.$matrix.m13;
      this.$matrix.m13 = this.$matrix.m31;
      this.$matrix.m31 = tmp;

      tmp = this.$matrix.m14;
      this.$matrix.m14 = this.$matrix.m41;
      this.$matrix.m41 = tmp;

      tmp = this.$matrix.m23;
      this.$matrix.m23 = this.$matrix.m32;
      this.$matrix.m32 = tmp;

      tmp = this.$matrix.m24;
      this.$matrix.m24 = this.$matrix.m42;
      this.$matrix.m42 = tmp;

      tmp = this.$matrix.m34;
      this.$matrix.m34 = this.$matrix.m43;
      this.$matrix.m43 = tmp;
  }

  invert()
  {
      if (HasCSSMatrix) {
          this.$matrix = this.$matrix.inverse();
          return;
      }

      // Calculate the 4x4 determinant
      // If the determinant is zero,
      // then the inverse matrix is not unique.
      var det = this._determinant4x4();

      if (Math.abs(det) < 1e-8)
          return null;

      this._makeAdjoint();

      // Scale the adjoint matrix to get the inverse
      this.$matrix.m11 /= det;
      this.$matrix.m12 /= det;
      this.$matrix.m13 /= det;
      this.$matrix.m14 /= det;

      this.$matrix.m21 /= det;
      this.$matrix.m22 /= det;
      this.$matrix.m23 /= det;
      this.$matrix.m24 /= det;

      this.$matrix.m31 /= det;
      this.$matrix.m32 /= det;
      this.$matrix.m33 /= det;
      this.$matrix.m34 /= det;

      this.$matrix.m41 /= det;
      this.$matrix.m42 /= det;
      this.$matrix.m43 /= det;
      this.$matrix.m44 /= det;
  }

  translate(float x, float y, float z)
  {
      if (typeof x == 'object' && "length" in x) {
          var t = x;
          x = t[0];
          y = t[1];
          z = t[2];
      }
      else {
          if (x == undefined)
              x = 0;
          if (y == undefined)
              y = 0;
          if (z == undefined)
              z = 0;
      }

      if (HasCSSMatrix) {
          this.$matrix = this.$matrix.translate(x, y, z);
          return;
      }

      var matrix = new Matrix4();
      matrix.$matrix.m41 = x;
      matrix.$matrix.m42 = y;
      matrix.$matrix.m43 = z;

      this.multiply(matrix);
  }

  scale(float x, float y, float z)
  {
      if (typeof x == 'object' && "length" in x) {
          var t = x;
          x = t[0];
          y = t[1];
          z = t[2];
      }
      else {
          if (x == undefined)
              x = 1;
          if (z == undefined) {
              if (y == undefined) {
                  y = x;
                  z = x;
              }
              else
                  z = 1;
          }
          else if (y == undefined)
              y = x;
      }

      if (HasCSSMatrix) {
          this.$matrix = this.$matrix.scale(x, y, z);
          return;
      }

      var matrix = new Matrix4();
      matrix.$matrix.m11 = x;
      matrix.$matrix.m22 = y;
      matrix.$matrix.m33 = z;

      this.multiply(matrix);
  }

  rotate(float angle,float x,float y,float z)
  {
      // Forms are (angle, x,y,z), (angle,vector), (angleX, angleY, angleZ), (angle)
      if (typeof x == 'object' && "length" in x) {
          var t = x;
          x = t[0];
          y = t[1];
          z = t[2];
      }
      else {
          if (arguments.length == 1) {
              x = 0;
              y = 0;
              z = 1;
          }
          else if (arguments.length == 3) {
              this.rotate(angle, 1,0,0); // about X axis
              this.rotate(x, 0,1,0); // about Y axis
              this.rotate(y, 0,0,1); // about Z axis
              return;
          }
      }

      if (HasCSSMatrix) {
          this.$matrix = this.$matrix.rotateAxisAngle(x, y, z, angle);
          return;
      }

      angle /= 2;
      var sinA = Math.sin(angle);
      var cosA = Math.cos(angle);
      var sinA2 = sinA * sinA;

      // normalize
      var len = Math.sqrt(x * x + y * y + z * z);
      if (len == 0) {
          // bad vector, just use something reasonable
          x = 0;
          y = 0;
          z = 1;
      } else if (len != 1) {
          x /= len;
          y /= len;
          z /= len;
      }

      var mat = new Matrix4();

      // optimize case where axis is along major axis
      if (x == 1 && y == 0 && z == 0) {
          mat.$matrix.m11 = 1;
          mat.$matrix.m12 = 0;
          mat.$matrix.m13 = 0;
          mat.$matrix.m21 = 0;
          mat.$matrix.m22 = 1 - 2 * sinA2;
          mat.$matrix.m23 = 2 * sinA * cosA;
          mat.$matrix.m31 = 0;
          mat.$matrix.m32 = -2 * sinA * cosA;
          mat.$matrix.m33 = 1 - 2 * sinA2;
          mat.$matrix.m14 = mat.$matrix.m24 = mat.$matrix.m34 = 0;
          mat.$matrix.m41 = mat.$matrix.m42 = mat.$matrix.m43 = 0;
          mat.$matrix.m44 = 1;
      } else if (x == 0 && y == 1 && z == 0) {
          mat.$matrix.m11 = 1 - 2 * sinA2;
          mat.$matrix.m12 = 0;
          mat.$matrix.m13 = -2 * sinA * cosA;
          mat.$matrix.m21 = 0;
          mat.$matrix.m22 = 1;
          mat.$matrix.m23 = 0;
          mat.$matrix.m31 = 2 * sinA * cosA;
          mat.$matrix.m32 = 0;
          mat.$matrix.m33 = 1 - 2 * sinA2;
          mat.$matrix.m14 = mat.$matrix.m24 = mat.$matrix.m34 = 0;
          mat.$matrix.m41 = mat.$matrix.m42 = mat.$matrix.m43 = 0;
          mat.$matrix.m44 = 1;
      } else if (x == 0 && y == 0 && z == 1) {
          mat.$matrix.m11 = 1 - 2 * sinA2;
          mat.$matrix.m12 = 2 * sinA * cosA;
          mat.$matrix.m13 = 0;
          mat.$matrix.m21 = -2 * sinA * cosA;
          mat.$matrix.m22 = 1 - 2 * sinA2;
          mat.$matrix.m23 = 0;
          mat.$matrix.m31 = 0;
          mat.$matrix.m32 = 0;
          mat.$matrix.m33 = 1;
          mat.$matrix.m14 = mat.$matrix.m24 = mat.$matrix.m34 = 0;
          mat.$matrix.m41 = mat.$matrix.m42 = mat.$matrix.m43 = 0;
          mat.$matrix.m44 = 1;
      } else {
          var x2 = x*x;
          var y2 = y*y;
          var z2 = z*z;

          mat.$matrix.m11 = 1 - 2 * (y2 + z2) * sinA2;
          mat.$matrix.m12 = 2 * (x * y * sinA2 + z * sinA * cosA);
          mat.$matrix.m13 = 2 * (x * z * sinA2 - y * sinA * cosA);
          mat.$matrix.m21 = 2 * (y * x * sinA2 - z * sinA * cosA);
          mat.$matrix.m22 = 1 - 2 * (z2 + x2) * sinA2;
          mat.$matrix.m23 = 2 * (y * z * sinA2 + x * sinA * cosA);
          mat.$matrix.m31 = 2 * (z * x * sinA2 + y * sinA * cosA);
          mat.$matrix.m32 = 2 * (z * y * sinA2 - x * sinA * cosA);
          mat.$matrix.m33 = 1 - 2 * (x2 + y2) * sinA2;
          mat.$matrix.m14 = mat.$matrix.m24 = mat.$matrix.m34 = 0;
          mat.$matrix.m41 = mat.$matrix.m42 = mat.$matrix.m43 = 0;
          mat.$matrix.m44 = 1;
      }
      this.multiply(mat);
  }

  multiply(Matrix4 mat)
  {
      if (HasCSSMatrix) {
          this.$matrix = this.$matrix.multiply(mat.$matrix);
          return;
      }

      var m11 = (mat.$matrix.m11 * this.$matrix.m11 + mat.$matrix.m12 * this.$matrix.m21
                 + mat.$matrix.m13 * this.$matrix.m31 + mat.$matrix.m14 * this.$matrix.m41);
      var m12 = (mat.$matrix.m11 * this.$matrix.m12 + mat.$matrix.m12 * this.$matrix.m22
                 + mat.$matrix.m13 * this.$matrix.m32 + mat.$matrix.m14 * this.$matrix.m42);
      var m13 = (mat.$matrix.m11 * this.$matrix.m13 + mat.$matrix.m12 * this.$matrix.m23
                 + mat.$matrix.m13 * this.$matrix.m33 + mat.$matrix.m14 * this.$matrix.m43);
      var m14 = (mat.$matrix.m11 * this.$matrix.m14 + mat.$matrix.m12 * this.$matrix.m24
                 + mat.$matrix.m13 * this.$matrix.m34 + mat.$matrix.m14 * this.$matrix.m44);

      var m21 = (mat.$matrix.m21 * this.$matrix.m11 + mat.$matrix.m22 * this.$matrix.m21
                 + mat.$matrix.m23 * this.$matrix.m31 + mat.$matrix.m24 * this.$matrix.m41);
      var m22 = (mat.$matrix.m21 * this.$matrix.m12 + mat.$matrix.m22 * this.$matrix.m22
                 + mat.$matrix.m23 * this.$matrix.m32 + mat.$matrix.m24 * this.$matrix.m42);
      var m23 = (mat.$matrix.m21 * this.$matrix.m13 + mat.$matrix.m22 * this.$matrix.m23
                 + mat.$matrix.m23 * this.$matrix.m33 + mat.$matrix.m24 * this.$matrix.m43);
      var m24 = (mat.$matrix.m21 * this.$matrix.m14 + mat.$matrix.m22 * this.$matrix.m24
                 + mat.$matrix.m23 * this.$matrix.m34 + mat.$matrix.m24 * this.$matrix.m44);

      var m31 = (mat.$matrix.m31 * this.$matrix.m11 + mat.$matrix.m32 * this.$matrix.m21
                 + mat.$matrix.m33 * this.$matrix.m31 + mat.$matrix.m34 * this.$matrix.m41);
      var m32 = (mat.$matrix.m31 * this.$matrix.m12 + mat.$matrix.m32 * this.$matrix.m22
                 + mat.$matrix.m33 * this.$matrix.m32 + mat.$matrix.m34 * this.$matrix.m42);
      var m33 = (mat.$matrix.m31 * this.$matrix.m13 + mat.$matrix.m32 * this.$matrix.m23
                 + mat.$matrix.m33 * this.$matrix.m33 + mat.$matrix.m34 * this.$matrix.m43);
      var m34 = (mat.$matrix.m31 * this.$matrix.m14 + mat.$matrix.m32 * this.$matrix.m24
                 + mat.$matrix.m33 * this.$matrix.m34 + mat.$matrix.m34 * this.$matrix.m44);

      var m41 = (mat.$matrix.m41 * this.$matrix.m11 + mat.$matrix.m42 * this.$matrix.m21
                 + mat.$matrix.m43 * this.$matrix.m31 + mat.$matrix.m44 * this.$matrix.m41);
      var m42 = (mat.$matrix.m41 * this.$matrix.m12 + mat.$matrix.m42 * this.$matrix.m22
                 + mat.$matrix.m43 * this.$matrix.m32 + mat.$matrix.m44 * this.$matrix.m42);
      var m43 = (mat.$matrix.m41 * this.$matrix.m13 + mat.$matrix.m42 * this.$matrix.m23
                 + mat.$matrix.m43 * this.$matrix.m33 + mat.$matrix.m44 * this.$matrix.m43);
      var m44 = (mat.$matrix.m41 * this.$matrix.m14 + mat.$matrix.m42 * this.$matrix.m24
                 + mat.$matrix.m43 * this.$matrix.m34 + mat.$matrix.m44 * this.$matrix.m44);

      this.$matrix.m11 = m11;
      this.$matrix.m12 = m12;
      this.$matrix.m13 = m13;
      this.$matrix.m14 = m14;

      this.$matrix.m21 = m21;
      this.$matrix.m22 = m22;
      this.$matrix.m23 = m23;
      this.$matrix.m24 = m24;

      this.$matrix.m31 = m31;
      this.$matrix.m32 = m32;
      this.$matrix.m33 = m33;
      this.$matrix.m34 = m34;

      this.$matrix.m41 = m41;
      this.$matrix.m42 = m42;
      this.$matrix.m43 = m43;
      this.$matrix.m44 = m44;
  }

  divide(float divisor)
  {
      this.$matrix.m11 /= divisor;
      this.$matrix.m12 /= divisor;
      this.$matrix.m13 /= divisor;
      this.$matrix.m14 /= divisor;

      this.$matrix.m21 /= divisor;
      this.$matrix.m22 /= divisor;
      this.$matrix.m23 /= divisor;
      this.$matrix.m24 /= divisor;

      this.$matrix.m31 /= divisor;
      this.$matrix.m32 /= divisor;
      this.$matrix.m33 /= divisor;
      this.$matrix.m34 /= divisor;

      this.$matrix.m41 /= divisor;
      this.$matrix.m42 /= divisor;
      this.$matrix.m43 /= divisor;
      this.$matrix.m44 /= divisor;

  }

  ortho(float left, float right, float bottom, float top, float near, float far)
  {
      var tx = (left + right) / (left - right);
      var ty = (top + bottom) / (top - bottom);
      var tz = (far + near) / (far - near);

      var matrix = new Matrix4();
      matrix.$matrix.m11 = 2 / (left - right);
      matrix.$matrix.m12 = 0;
      matrix.$matrix.m13 = 0;
      matrix.$matrix.m14 = 0;
      matrix.$matrix.m21 = 0;
      matrix.$matrix.m22 = 2 / (top - bottom);
      matrix.$matrix.m23 = 0;
      matrix.$matrix.m24 = 0;
      matrix.$matrix.m31 = 0;
      matrix.$matrix.m32 = 0;
      matrix.$matrix.m33 = -2 / (far - near);
      matrix.$matrix.m34 = 0;
      matrix.$matrix.m41 = tx;
      matrix.$matrix.m42 = ty;
      matrix.$matrix.m43 = tz;
      matrix.$matrix.m44 = 1;

      this.multiply(matrix);
  }

  frustum(float left, float right, float bottom, float top, float near, float far)
  {
      var matrix = new Matrix4();
      var A = (right + left) / (right - left);
      var B = (top + bottom) / (top - bottom);
      var C = -(far + near) / (far - near);
      var D = -(2 * far * near) / (far - near);

      matrix.$matrix.m11 = (2 * near) / (right - left);
      matrix.$matrix.m12 = 0;
      matrix.$matrix.m13 = 0;
      matrix.$matrix.m14 = 0;

      matrix.$matrix.m21 = 0;
      matrix.$matrix.m22 = 2 * near / (top - bottom);
      matrix.$matrix.m23 = 0;
      matrix.$matrix.m24 = 0;

      matrix.$matrix.m31 = A;
      matrix.$matrix.m32 = B;
      matrix.$matrix.m33 = C;
      matrix.$matrix.m34 = -1;

      matrix.$matrix.m41 = 0;
      matrix.$matrix.m42 = 0;
      matrix.$matrix.m43 = D;
      matrix.$matrix.m44 = 0;
      
      this.isPersp = true;
      this.multiply(matrix);
  }

  perspective(float fovy, float aspect, float zNear, float zFar)
  {
      var top = Math.tan(fovy * Math.PI / 360) * zNear;
      var bottom = -top;
      var left = aspect * bottom;
      var right = aspect * top;
      this.frustum(left, right, bottom, top, zNear, zFar);
  }

  lookat(float eyex, float eyey, float eyez, float centerx, float centery, float centerz, float upx, float upy, float upz)
  {
      if (typeof eyez == 'object' && "length" in eyez) {
          var t = eyez;
          upx = t[0];
          upy = t[1];
          upz = t[2];

          t = eyey;
          centerx = t[0];
          centery = t[1];
          centerz = t[2];

          t = eyex;
          eyex = t[0];
          eyey = t[1];
          eyez = t[2];
      }

      var matrix = new Matrix4();

      // Make rotation matrix

      // Z vector
      var zx = eyex - centerx;
      var zy = eyey - centery;
      var zz = eyez - centerz;
      var mag = Math.sqrt(zx * zx + zy * zy + zz * zz);
      if (mag) {
          zx /= mag;
          zy /= mag;
          zz /= mag;
      }

      // Y vector
      var yx = upx;
      var yy = upy;
      var yz = upz;
      var xx, xy, xz;
      
      // X vector = Y cross Z
      xx =  yy * zz - yz * zy;
      xy = -yx * zz + yz * zx;
      xz =  yx * zy - yy * zx;

      // Recompute Y = Z cross X
      yx = zy * xz - zz * xy;
      yy = -zx * xz + zz * xx;
      yx = zx * xy - zy * xx;

      // cross product gives area of parallelogram, which is < 1.0 for
      // non-perpendicular unit-length vectors; so normalize x, y here

      mag = Math.sqrt(xx * xx + xy * xy + xz * xz);
      if (mag) {
          xx /= mag;
          xy /= mag;
          xz /= mag;
      }

      mag = Math.sqrt(yx * yx + yy * yy + yz * yz);
      if (mag) {
          yx /= mag;
          yy /= mag;
          yz /= mag;
      }

      matrix.$matrix.m11 = xx;
      matrix.$matrix.m12 = xy;
      matrix.$matrix.m13 = xz;
      matrix.$matrix.m14 = 0;

      matrix.$matrix.m21 = yx;
      matrix.$matrix.m22 = yy;
      matrix.$matrix.m23 = yz;
      matrix.$matrix.m24 = 0;

      matrix.$matrix.m31 = zx;
      matrix.$matrix.m32 = zy;
      matrix.$matrix.m33 = zz;
      matrix.$matrix.m34 = 0;

      matrix.$matrix.m41 = 0;
      matrix.$matrix.m42 = 0;
      matrix.$matrix.m43 = 0;
      matrix.$matrix.m44 = 1;
      matrix.translate(-eyex, -eyey, -eyez);

      this.multiply(matrix);
  }

  // Returns true on success, false otherwise. All params are Array objects
  decompose(Vector3 _translate, Vector3 _rotate, Vector3 _scale, Vector3 _skew, Vector3 _perspective)
  {
      // Normalize the matrix.
      if (this.$matrix.m44 == 0)
          return false;

      // Gather the params
      var translate, rotate, scale, skew, perspective;

      var translate = (_translate == undefined || !("length" in _translate)) ? new Vector3 : _translate;
      var rotate = (_rotate == undefined || !("length" in _rotate)) ? new Vector3 : _rotate;
      var scale = (_scale == undefined || !("length" in _scale)) ? new Vector3 : _scale;
      var skew = (_skew == undefined || !("length" in _skew)) ? new Vector3 : _skew;
      var perspective = (_perspective == undefined || !("length" in _perspective)) ? new Array(4) : _perspective;

      var matrix = new Matrix4(this);

      matrix.divide(matrix.$matrix.m44);

      // perspectiveMatrix is used to solve for perspective, but it also provides
      // an easy way to test for singularity of the upper 3x3 component.
      var perspectiveMatrix = new Matrix4(matrix);

      perspectiveMatrix.$matrix.m14 = 0;
      perspectiveMatrix.$matrix.m24 = 0;
      perspectiveMatrix.$matrix.m34 = 0;
      perspectiveMatrix.$matrix.m44 = 1;

      if (perspectiveMatrix._determinant4x4() == 0)
          return false;

      // First, isolate perspective.
      if (matrix.$matrix.m14 != 0 || matrix.$matrix.m24 != 0 || matrix.$matrix.m34 != 0) {
          // rightHandSide is the right hand side of the equation.
          var rightHandSide = [ matrix.$matrix.m14, matrix.$matrix.m24, matrix.$matrix.m34, matrix.$matrix.m44 ];

          // Solve the equation by inverting perspectiveMatrix and multiplying
          // rightHandSide by the inverse.
          var inversePerspectiveMatrix = new Matrix4(perspectiveMatrix);
          inversePerspectiveMatrix.invert();
          var transposedInversePerspectiveMatrix = new Matrix4(inversePerspectiveMatrix);
          transposedInversePerspectiveMatrix.transpose();
          transposedInversePerspectiveMatrix.multVecMatrix(perspective, rightHandSide);

          // Clear the perspective partition
          matrix.$matrix.m14 = matrix.$matrix.m24 = matrix.$matrix.m34 = 0
          matrix.$matrix.m44 = 1;
      }
      else {
          // No perspective.
          perspective[0] = perspective[1] = perspective[2] = 0;
          perspective[3] = 1;
      }

      // Next take care of translation
      translate[0] = matrix.$matrix.m41
      matrix.$matrix.m41 = 0
      translate[1] = matrix.$matrix.m42
      matrix.$matrix.m42 = 0
      translate[2] = matrix.$matrix.m43
      matrix.$matrix.m43 = 0

      // Now get scale and shear. 'row' is a 3 element array of 3 component vectors
      var row0 = new Vector3([matrix.$matrix.m11, matrix.$matrix.m12, matrix.$matrix.m13]);
      var row1 = new Vector3([matrix.$matrix.m21, matrix.$matrix.m22, matrix.$matrix.m23]);
      var row2 = new Vector3([matrix.$matrix.m31, matrix.$matrix.m32, matrix.$matrix.m33]);

      // Compute X scale factor and normalize first row.
      scale[0] = row0.vectorLength();
      row0.divide(scale[0]);

      // Compute XY shear factor and make 2nd row orthogonal to 1st.
      skew[0] = row0.dot(row1);
      row1.combine(row0, 1.0, -skew[0]);

      // Now, compute Y scale and normalize 2nd row.
      scale[1] = row1.vectorLength();
      row1.divide(scale[1]);
      skew[0] /= scale[1];

      // Compute XZ and YZ shears, orthogonalize 3rd row
      skew[1] = row1.dot(row2);
      row2.combine(row0, 1.0, -skew[1]);
      skew[2] = row1.dot(row2);
      row2.combine(row1, 1.0, -skew[2]);

      // Next, get Z scale and normalize 3rd row.
      scale[2] = row2.vectorLength();
      row2.divide(scale[2]);
      skew[1] /= scale[2];
      skew[2] /= scale[2];

      // At this point, the matrix (in rows) is orthonormal.
      // Check for a coordinate system flip.  If the determinant
      // is -1, then negate the matrix and the scaling factors.
      var pdum3 = new Vector3(row1);
      pdum3.cross(row2);
      if (row0.dot(pdum3) < 0) {
          for (var i = 0; i < 3; i++) {
              scale[i] *= -1;
              row[0][i] *= -1;
              row[1][i] *= -1;
              row[2][i] *= -1;
          }
      }

      // Now, get the rotations out
      rotate[1] = Math.asin(-row0[2]);
      if (Math.cos(rotate[1]) != 0) {
          rotate[0] = Math.atan2(row1[2], row2[2]);
          rotate[2] = Math.atan2(row0[1], row0[0]);
      }
      else {
          rotate[0] = Math.atan2(-row2[0], row1[1]);
          rotate[2] = 0;
      }

      // Convert rotations to radians
      var rad2deg = 180 / Math.PI;
      rotate[0] *= rad2deg;
      rotate[1] *= rad2deg;
      rotate[2] *= rad2deg;

      return true;
  }

  _determinant2x2(float a, float b, float c, float d)
  {
      return a * d - b * c;
  }

  _determinant3x3(float a1, float a2, float a3, 
              float b1, float b2, float b3, float c1, float c2, float c3)
  {
      return a1 * this._determinant2x2(b2, b3, c2, c3)
           - b1 * this._determinant2x2(a2, a3, c2, c3)
           + c1 * this._determinant2x2(a2, a3, b2, b3);
  }

  _determinant4x4()
  {
      var a1 = this.$matrix.m11;
      var b1 = this.$matrix.m12;
      var c1 = this.$matrix.m13;
      var d1 = this.$matrix.m14;

      var a2 = this.$matrix.m21;
      var b2 = this.$matrix.m22;
      var c2 = this.$matrix.m23;
      var d2 = this.$matrix.m24;

      var a3 = this.$matrix.m31;
      var b3 = this.$matrix.m32;
      var c3 = this.$matrix.m33;
      var d3 = this.$matrix.m34;

      var a4 = this.$matrix.m41;
      var b4 = this.$matrix.m42;
      var c4 = this.$matrix.m43;
      var d4 = this.$matrix.m44;

      return a1 * this._determinant3x3(b2, b3, b4, c2, c3, c4, d2, d3, d4)
           - b1 * this._determinant3x3(a2, a3, a4, c2, c3, c4, d2, d3, d4)
           + c1 * this._determinant3x3(a2, a3, a4, b2, b3, b4, d2, d3, d4)
           - d1 * this._determinant3x3(a2, a3, a4, b2, b3, b4, c2, c3, c4);
  }

  _makeAdjoint()
  {
      var a1 = this.$matrix.m11;
      var b1 = this.$matrix.m12;
      var c1 = this.$matrix.m13;
      var d1 = this.$matrix.m14;

      var a2 = this.$matrix.m21;
      var b2 = this.$matrix.m22;
      var c2 = this.$matrix.m23;
      var d2 = this.$matrix.m24;

      var a3 = this.$matrix.m31;
      var b3 = this.$matrix.m32;
      var c3 = this.$matrix.m33;
      var d3 = this.$matrix.m34;

      var a4 = this.$matrix.m41;
      var b4 = this.$matrix.m42;
      var c4 = this.$matrix.m43;
      var d4 = this.$matrix.m44;

      // Row column labeling reversed since we transpose rows & columns
      this.$matrix.m11  =   this._determinant3x3(b2, b3, b4, c2, c3, c4, d2, d3, d4);
      this.$matrix.m21  = - this._determinant3x3(a2, a3, a4, c2, c3, c4, d2, d3, d4);
      this.$matrix.m31  =   this._determinant3x3(a2, a3, a4, b2, b3, b4, d2, d3, d4);
      this.$matrix.m41  = - this._determinant3x3(a2, a3, a4, b2, b3, b4, c2, c3, c4);

      this.$matrix.m12  = - this._determinant3x3(b1, b3, b4, c1, c3, c4, d1, d3, d4);
      this.$matrix.m22  =   this._determinant3x3(a1, a3, a4, c1, c3, c4, d1, d3, d4);
      this.$matrix.m32  = - this._determinant3x3(a1, a3, a4, b1, b3, b4, d1, d3, d4);
      this.$matrix.m42  =   this._determinant3x3(a1, a3, a4, b1, b3, b4, c1, c3, c4);

      this.$matrix.m13  =   this._determinant3x3(b1, b2, b4, c1, c2, c4, d1, d2, d4);
      this.$matrix.m23  = - this._determinant3x3(a1, a2, a4, c1, c2, c4, d1, d2, d4);
      this.$matrix.m33  =   this._determinant3x3(a1, a2, a4, b1, b2, b4, d1, d2, d4);
      this.$matrix.m43  = - this._determinant3x3(a1, a2, a4, b1, b2, b4, c1, c2, c4);

      this.$matrix.m14  = - this._determinant3x3(b1, b2, b3, c1, c2, c3, d1, d2, d3);
      this.$matrix.m24  =   this._determinant3x3(a1, a2, a3, c1, c2, c3, d1, d2, d3);
      this.$matrix.m34  = - this._determinant3x3(a1, a2, a3, b1, b2, b3, d1, d2, d3);
      this.$matrix.m44  =   this._determinant3x3(a1, a2, a3, b1, b2, b3, c1, c2, c3);
  }
}

#define USE_OLD_VECLIB
#ifdef USE_OLD_VECLIB
var M_SQRT2 = Math.sqrt(2.0);
var FLT_EPSILON = 2.22e-16;

function saacos(float fac)
{
	if (fac <= -1.0) return Math.pi;
	else if (fac >=  1.0) return 0.0;
	else return Math.acos(fac);
}

function saasin(float fac)
{
	if (fac <= -1.0) return -Math.pi / 2.0;
	else if (fac >=  1.0) return  Math.pi / 2.0;
	else return Math.asin(fac);
}

var _temp_xyz_vecs = []
for (var i=0; i<32; i++) {
  _temp_xyz_vecs.push(null);
}

var _temp_xyz_cur = 0;

//
// Vector3
//
class Vector3 extends Array {
  constructor(Array<float> vec) {
    static init = [0, 0, 0];
    
    if (init == undefined)
      init = [0, 0, 0];
    if (vec == undefined)
      vec = init;
      
    if (vec[0] == undefined) vec[0] = 0;
    if (vec[1] == undefined) vec[1] = 0;
    if (vec[2] == undefined) vec[2] = 0;
    
    if (typeof(vec) == "number" || typeof(vec[0]) != "number")
      throw new Error("Invalid argument to new Vector3(vec)")
    
    this.length = 3;
    
    this[0] = vec[0];
    this[1] = vec[1];
    this[2] = vec[2];
  }

  toJSON() {
    var arr = new Array(this.length);
    
    var i = 0;
    for (var i=0; i<this.length; i++) {
      arr[i] = this[i];
    }
    
    return arr;
  }

  zero()
  {
    this[0] = 0.0;
    this[1] = 0.0;
    this[2] = 0.0;
    
    return this;
  }

  floor() {
    this[0] = Math.floor(this[0]);
    this[1] = Math.floor(this[1]);
    this[2] = Math.floor(this[2]);
    
    return this;
  }

  ceil() {
    this[0] = Math.ceil(this[0]);
    this[1] = Math.ceil(this[1]);
    this[2] = Math.ceil(this[2]);
    
    return this;
  }

  loadxy(Array<float> vec2, float z=0) {
    this[0] = vec2[0];
    this[1] = vec2[1];
    this[3] = z;
  }
  
  load(Array<float> vec3)
  {
    this[0] = vec3[0];
    this[1] = vec3[1];
    this[2] = vec3[2];
    
    return this;
  }

  loadXYZ(float x, float y, float z)
  {
    this[0] = x;
    this[1] = y;
    this[2] = z;
    
    return this;
  }

  static temp_xyz(float x, float y, float z)
  {
    var vec = _temp_xyz_vecs[_temp_xyz_cur];
    
    if (vec == null) {
      vec = new Vector3();
      _temp_xyz_vecs[_temp_xyz_cur] = vec;
    }
    
    _temp_xyz_cur = (_temp_xyz_cur+1) % _temp_xyz_vecs.length;
    
    vec.loadXYZ(x, y, z);
    
    return vec;
  }

  getAsArray() : Array<float>
  {
      return [ this[0], this[1], this[2] ];
  }

  min(Vector3 b)
  {
    this[0] = Math.min(this[0], b[0]);
    this[1] = Math.min(this[1], b[1]);
    this[2] = Math.min(this[2], b[2]);
    
    return this;
  }

  max(Vector3 b)
  {
    this[0] = Math.max(this[0], b[0]);
    this[1] = Math.max(this[1], b[1]);
    this[2] = Math.max(this[2], b[2]);
    
    return this;
  }

  floor(Vector3 b)
  {
    this[0] = Math.floor(this[0], b[0]);
    this[1] = Math.floor(this[1], b[1]);
    this[2] = Math.floor(this[2], b[2]);
    
    return this;
  }

  ceil(Vector3 b)
  {
    this[0] = Math.ceil(this[0], b[0]);
    this[1] = Math.ceil(this[1], b[1]);
    this[2] = Math.ceil(this[2], b[2]);
    
    return this;
  }

  round(Vector3 b)
  {
    this[0] = Math.round(this[0], b[0]);
    this[1] = Math.round(this[1], b[1]);
    this[2] = Math.round(this[2], b[2]);
    
    return this;
  }

  getAsFloat32Array()
  {
      return new Float32Array(this.getAsArray());
  }

  vectorLength()
  {
      return Math.sqrt(this[0] * this[0] + this[1] * this[1] + this[2] * this[2]);
  }

  normalize()
  {
    var len = this.vectorLength();
    if (len > FLT_EPSILON*2) this.mulScalar(1.0/len);
    
    return this;
  }

  negate()
  {
    this[0] = -this[0];
    this[1] = -this[1];
    this[2] = -this[2];
    
    return this;
  }

  fast_normalize()
  {
    var d = this[0]*this[0] + this[1]*this[1] + this[2]*this[2];
    //var n = d > 1.0 ? d*0.5 : d*2;
    //var n2=n*n, n4=n2*n2, n8=n4*n4;
    //var n6=n4*n2;
    
    var len = Math.sqrt(d); //n*n*n*n + 6*n*n*d + d*d;
    if (len > FLT_EPSILON) 
      return 0;
      
    //var div = 4*n*(n*n + d);
    //len = len / div;
    
    this[0] /= len;
    this[1] /= len;
    this[2] /= len;
    
    return this;
  }

  divide(float divisor)
  {
      this[0] /= divisor; this[1] /= divisor; this[2] /= divisor;
      
      return this;
  }

  divideScalar(float divisor)
  {
      this[0] /= divisor; this[1] /= divisor; this[2] /= divisor;
      
      return this;
  }

  divScalar(float divisor)
  {
      this[0] /= divisor; this[1] /= divisor; this[2] /= divisor;
      
      return this;
  }

  divVector(Vector3 vec)
  {
      this[0] /= vec[0]; this[1] /= vec[1]; this[2] /= vec[2];
      
      return this;
  }

  mulScalar(float scalar)
  {
      this[0] *= scalar; this[1] *= scalar; this[2] *= scalar;
      
      return this;
  }

  mul(Vector3 v)
  {
      this[0] =  this[0] * v[0];
      this[1] =  this[1] * v[1];
      this[2] =  this[2] * v[2];
      
      return this;
  }

  cross(Vector3 v)
  {
    static _tmp = [0, 0, 0];
    _tmp[0] = this[1] * v[2] - this[2] * v[1];
    _tmp[1] = this[2] * v[0] - this[0] * v[2];
    _tmp[2] = this[0] * v[1] - this[1] * v[0];

    this[0] = _tmp[0]; this[1] = _tmp[1]; this[2] = _tmp[2];

    return this;
  }

  vectorDistance(Vector3 v2) {
    static vec = new Vector3();
    
    vec.load(this);
    vec.sub(v2);
    
    return vec.vectorLength();
  }

  vectorDotDistance(Vector3 v2) {
    static vec = new Vector3();
    
    vec.load(this);
    vec.sub(v2);
    
    return vec.dot(vec);
  }

  sub(Vector3 v)
  {
    if (v == null || v == undefined)
      console.trace()
      
    this[0] =  this[0] - v[0];
    this[1] =  this[1] - v[1];
    this[2] =  this[2] - v[2];
    
    return this;
  }

  add(Vector3 v)
  {
      this[0] =  this[0] + v[0];
      this[1] =  this[1] + v[1];
      this[2] =  this[2] + v[2];
      
      return this;
  }

  static_add(Vector3 v)
  {
    static add = new Vector3();
    
    add[0] =  this[0] + v[0];
    add[1] =  this[1] + v[1];
    add[2] =  this[2] + v[2];
    
    return add;
  }

  static_sub(Vector3 v)
  {
    static _static_sub = new Vector3();
    _static_sub[0] =  this[0] - v[0];
    _static_sub[1] =  this[1] - v[1];
    _static_sub[2] =  this[2] - v[2];

    return _static_sub;
  }

  static_mul(Vector3 v)
  {
    static _static_mul = new Vector3();
    _static_mul[0] =  this[0] * v[0];
    _static_mul[1] =  this[1] * v[1];
    _static_mul[2] =  this[2] * v[2];
    
    return _static_mul;
  }

  static_divide(Vector3 v)
  {
      static _static_divide = new Vector3();
      _static_divide[0] =  this[0] / v[0];
      _static_divide[1] =  this[1] / v[1];
      _static_divide[2] =  this[2] / v[2];
      
      return _static_divide;
  }

  static_addScalar(float s)
  {
      static _static_addScalar = new Vector3();
      _static_addScalar[0] =  this[0] + s;
      _static_addScalar[1] =  this[1] + s;
      _static_addScalar[2] =  this[2] + s;
      
      return _static_addScalar;
  }

  static_subScalar(float s)
  {
      static _static_subScalar = new Vector3();
      _static_subScalar[0] =  this[0] - s;
      _static_subScalar[1] =  this[1] - s;
      _static_subScalar[2] =  this[2] - s;
      
      return _static_subScalar;
  }

  static_mulScalar(float s)
  {
      static _static_mulScalar = new Vector3();
      _static_mulScalar[0] =  this[0] * s;
      _static_mulScalar[1] =  this[1] * s;
      _static_mulScalar[2] =  this[2] * s;
      
      return _static_mulScalar;
  }

  _static_divideScalar(float s)
  {
      static _static_divideScalar = new Vector3();
      _static_divideScalar[0] =  this[0] / s;
      _static_divideScalar[1] =  this[1] / s;
      _static_divideScalar[2] =  this[2] / s;
      
      return _static_divideScalar;
  }

  dot(Vector3 v)
  {
      return this[0] * v[0] + this[1] * v[1] + this[2] * v[2];
  }

  normalizedDot(Vector3 v)
  {
    static _v3nd_n1 = new Vector3()
    static _v3nd_n2 = new Vector3()
    _v3nd_n1.load(this);
    _v3nd_n2.load(v);
    
    _v3nd_n1.normalize();
    _v3nd_n2.normalzie();
    
    return _v3nd_n1.dot(_v3nd_n2);
  }

  static normalizedDot4(Vector3 v1, Vector3 v2, Vector3 v3, Vector3 v4)
  {
    static _v3nd4_n1 = new Vector3();
    static _v3nd4_n2 = new Vector3();
    
    _v3nd4_n1.load(v2).sub(v1).normalize();
    _v3nd4_n2.load(v4).sub(v3).normalize();
    
    return _v3nd4_n1.dot(_v3nd4_n2);
  }

  preNormalizedAngle(Vector3 v2)
  {
    /* this is the same as acos(dot_v3v3(this, v2)), but more accurate */
    if (this.dot(v2) < 0.0) {
      var vec = new Vector3();

      vec[0] = -v2[0];
      vec[1] = -v2[1];
      vec[2] = -v2[2];

      return Math.pi - 2.0 * saasin(vec.vectorDistance(this) / 2.0);
    }
    else
      return 2.0 * saasin(v2.vectorDistance(this) / 2.0);
  }

  combine(Vector3 v, float ascl, float bscl)
  {
      this[0] = (ascl * this[0]) + (bscl * v[0]);
      this[1] = (ascl * this[1]) + (bscl * v[1]);
      this[2] = (ascl * this[2]) + (bscl * v[2]);
  }

  mulVecQuat(Vector4 q)
  {
    var t0 = -this[1] * this[0] - this[2] * this[1] - this[3] * this[2];
    var t1 = this[0] * this[0] + this[2] * this[2] - this[3] * this[1];
    var t2 = this[0] * this[1] + this[3] * this[0] - this[1] * this[2];
    this[2] = this[0] * this[2] + this[1] * this[1] - this[2] * this[0];
    this[0] = t1;
    this[1] = t2;

    t1 = t0 * -this[1] + this[0] * this[0] - this[1] * this[3] + this[2] * this[2];
    t2 = t0 * -this[2] + this[1] * this[0] - this[2] * this[1] + this[0] * this[3];
    this[2] = t0 * -this[3] + this[2] * this[0] - this[0] * this[2] + this[1] * this[1];
    this[0] = t1;
    this[1] = t2;
  }

  multVecMatrix(Matrix4 matrix)
  {
      var x = this[0];
      var y = this[1];
      var z = this[2];

      this[0] = matrix.$matrix.m41 + x * matrix.$matrix.m11 + y * matrix.$matrix.m21 + z * matrix.$matrix.m31;
      this[1] = matrix.$matrix.m42 + x * matrix.$matrix.m12 + y * matrix.$matrix.m22 + z * matrix.$matrix.m32;
      this[2] = matrix.$matrix.m43 + x * matrix.$matrix.m13 + y * matrix.$matrix.m23 + z * matrix.$matrix.m33;
      var w = matrix.$matrix.m44 + x * matrix.$matrix.m14 + y * matrix.$matrix.m24 + z * matrix.$matrix.m34;
      if (w != 1 && w != 0 && matrix.isPersp) {
          this[0] /= w;
          this[1] /= w;
          this[2] /= w;
      }
  }

  interp(Vector3 b, Number t) {
    this[0] += (b[0]-this[0])*t;
    this[1] += (b[1]-this[1])*t;
    this[2] += (b[2]-this[2])*t;
  }

  toString() : String
  {
      return "["+this[0]+","+this[1]+","+this[2]+"]";
  }
}

var _vec2_init = [0, 0];
function Vector2(Array<float> vec) {
  Array<float>.call(this, 2);
  
  if (vec == undefined)
    vec = _vec2_init;
  
  if (vec[0] == undefined) vec[0] = 0;
  if (vec[1] == undefined) vec[1] = 0;
  
  if (typeof(vec) == "number" || typeof(vec[0]) != "number")
    throw new Error("Invalid argument to new Vector2(vec)")
  
  this[0] = vec[0];
  this[1] = vec[1];
  
  this.length = 2;
}
inherit(Vector2, Array);

Vector2.prototype.toJSON = function() {
  var arr = new Array(this.length);
  
  var i = 0;
  for (var i=0; i<this.length; i++) {
    arr[i] = this[i];
  }
  
  return arr;
}

Vector2.prototype.dot = function(b) {
  return this[0]*b[0] + this[1]*b[1]
}

Vector2.prototype.load = function(b) {
  this[0] = b[0];
  this[1] = b[1];
  
  return this;
}

Vector2.prototype.zero = function() {
  this[0] = this[1] = 0.0;
  
  return this;
}

Vector2.prototype.floor = function() {
  this[0] = Math.floor(this[0]);
  this[1] = Math.floor(this[1]);
  
  return this;
}

Vector2.prototype.ceil = function() {
  this[0] = Math.ceil(this[0]);
  this[1] = Math.ceil(this[1]);
  
  return this;
}

Vector2.prototype.vectorDistance = function(b) {
  var x, y;
  
  x = this[0]-b[0]
  y = this[1]-b[1];
  return Math.sqrt(x*x + y*y);
}


Vector2.prototype.vectorLength = function() {
  return Math.sqrt(this[0]*this[0] + this[1]*this[1]);
}

Vector2.prototype.sub = function(b) {
  this[0] -= b[0];
  this[1] -= b[1];
  
  return this;
}

Vector2.prototype.add = function(b) {
  this[0] += b[0];
  this[1] += b[1];
  
  return this;
}

Vector2.prototype.mul = function(b) {
  this[0] *= b[0];
  this[1] *= b[1];
  
  return this;
}

Vector2.prototype.divide = function(b) {
  this[0] /= b[0];
  this[1] /= b[1];
  
  return this;
}

Vector2.prototype.divideScalar = function(b) {
  this[0] /= b;
  this[1] /= b;
  
  return this;
}

Vector2.prototype.negate = function()
{
  this[0] = -this[0];
  this[1] = -this[1];
  
  return this;
}

Vector2.prototype.mulScalar = function(b) {
  this[0] *= b;
  this[1] *= b;
  
  return this;
}

Vector2.prototype.addScalar = function(b) {
  this[0] += b;
  this[1] += b;
  
  return this;
}

Vector2.prototype.subScalar = function(b) {
  this[0] -= b;
  this[1] -= b;
  
  return this;
}

var _v2_static_mvm_co = new Vector3();
Vector2.prototype.multVecMatrix = function(mat) {
  var v3 = _v2_static_mvm_co;
  
  v3.load(self)
  v3[2] = 0.0;
  v3.multVecMatrix(mat);
  
  this[0] = v3[0];
  this[1] = v3[1];
  
  return this;
}

Vector2.prototype.normalize = function() {
  var vlen = this.vectorLength();
  if (vlen < FLT_EPSILON) {
    this[0] = this[1] = 0.0;
    return;
  }
  
  this[0] /= vlen;
  this[1] /= vlen;
  
  return this;
}

Vector2.prototype.toSource = function() {
  return "new Vector2([" + this[0] + ", " + this[1] + "])";
}

Vector2.prototype.toString = function() {
  return "[" + this[0] + ", " + this[1] + "]";
}

Vector2.prototype.interp = function(Vector2 b, Number t) {
  this[0] += (b[0]-this[0])*t;
  this[1] += (b[1]-this[1])*t;
}

//XX Kill this function!
function Color(Array<float> color) {
  var c = new Array<float>();
  c[0] = color[0]
  c[1] = color[1]
  c[2] = color[2]
  c[3] = color[3]
  
  return c;
}


//
// Vector4
//
function Vector4(float x, float y, float z, float w)
{
    this.length = 4;
    this.load(x,y,z,w);
}
inherit(Vector4, Array);

Vector4.prototype.toJSON = function() {
  var arr = new Array(this.length);
  
  var i = 0;
  for (var i=0; i<this.length; i++) {
    arr[i] = this[i];
  }
  
  return arr;
}

Vector4.prototype.load = function(x,y,z,w)
{
    if (typeof x == 'object' && "length" in x) {
        this[0] = x[0];
        this[1] = x[1];
        this[2] = x[2];
        this[3] = x[3];
    }
    else if (typeof x == 'number') {
        this[0] = x;
        this[1] = y;
        this[2] = z;
        this[3] = w;
    }
    else {
        this[0] = 0;
        this[1] = 0;
        this[2] = 0;
        this[3] = 0;
    }
    
    return this;
}

Vector4.prototype.floor = function() {
  this[0] = Math.floor(this[0]);
  this[1] = Math.floor(this[1]);
  this[2] = Math.floor(this[2]);
  this[3] = Math.floor(this[3]);
  
  return this;
}

Vector4.prototype.ceil = function() {
  this[0] = Math.ceil(this[0]);
  this[1] = Math.ceil(this[1]);
  this[2] = Math.ceil(this[2]);
  this[3] = Math.ceil(this[3]);
  
  return this;
}

Vector4.prototype.getAsArray = function() : Array<float>
{
    return [ this[0], this[1], this[2], this[3] ];
}

Vector4.prototype.getAsFloat32Array = function() : Float32Array
{
    return new Float32Array(this.getAsArray());
}

Vector4.prototype.vectorLength = function() : float
{
    return Math.sqrt(this[0] * this[0] + this[1] * this[1] + this[2] * this[2] + this[3] * this[3]);
}

Vector4.prototype.normalize = function()
{
  var len = this.vectorLength();
  if (len > FLT_EPSILON) this.mulScalar(1.0/len);
  
  return len;
}

Vector4.prototype.divide = function(float divisor)
{
    this[0] /= divisor; this[1] /= divisor; this[2] /= divisor; this[3] /= divisor;
}

Vector4.prototype.negate = function()
{
  this[0] = -this[0];
  this[1] = -this[1];
  this[2] = -this[2];
  this[3] = -this[3];
  
  return this;
}

Vector4.prototype.mulScalar = function(float scalar)
{
    this[0] *= scalar; this[1] *= scalar; this[2] *= scalar; this[3] *= scalar;
    
    return this;
}

Vector4.prototype.mul = function(float scalar)
{
    this[0] =  this[0] * v[0];
    this[1] =  this[1] * v[1];
    this[2] =  this[2] * v[2];
    this[3] =  this[3] * v[3];
}

Vector4.prototype.cross = function(Vector4 v)
{
    this[0] =  this[1] * v[2] - this[2] * v[1];
    this[1] = -this[0] * v[2] + this[2] * v[0];
    this[2] =  this[0] * v[1] - this[1] * v[0];
    //what do I do with the fourth component?
}

Vector4.prototype.sub = function(Vector4 v)
{
    this[0] =  this[0] - v[0];
    this[1] =  this[1] - v[1];
    this[2] =  this[2] - v[2];
    this[3] =  this[3] - v[3];
}

Vector4.prototype.add = function(Vector4 v)
{
    this[0] =  this[0] + v[0];
    this[1] =  this[1] + v[1];
    this[2] =  this[2] + v[2];
    this[3] =  this[3] + v[3];
}

Vector4.prototype.dot = function(Vector4 v)
{
    return this[0] * v[0] + this[1] * v[1] + this[2] * v[2] + this[3] * v[3];
}

Vector4.prototype.combine = function(Vector4 v, float ascl, float bscl)
{
    this[0] = (ascl * this[0]) + (bscl * v[0]);
    this[1] = (ascl * this[1]) + (bscl * v[1]);
    this[2] = (ascl * this[2]) + (bscl * v[2]);
    this[3] = (ascl * this[3]) + (bscl * v[3]);
}

Vector4.prototype.multVecMatrix = function(Matrix4 matrix)
{
    var x = this[0];
    var y = this[1];
    var z = this[2];
    var w = this[3];

    this[0] = matrix.$matrix.m41 + x * matrix.$matrix.m11 + y * matrix.$matrix.m21 + z * matrix.$matrix.m31 + w*matrix.$matrix.m41;
    this[1] = matrix.$matrix.m42 + x * matrix.$matrix.m12 + y * matrix.$matrix.m22 + z * matrix.$matrix.m32 + w*matrix.$matrix.m42;
    this[2] = matrix.$matrix.m43 + x * matrix.$matrix.m13 + y * matrix.$matrix.m23 + z * matrix.$matrix.m33 + w*matrix.$matrix.m43;
    this[3] = w*matrix.$matrix.m44 + x * matrix.$matrix.m14 + y * matrix.$matrix.m24 + z * matrix.$matrix.m34;
}

Vector4.prototype.interp = function(Vector4 b, Number t) {
  this[0] += (b[0]-this[0])*t;
  this[1] += (b[1]-this[1])*t;
  this[2] += (b[2]-this[2])*t;
  this[3] += (b[3]-this[3])*t;  
}

Vector4.prototype.toString = function() : String
{
    return "["+this[0]+","+this[1]+","+this[2]+","+this[3]+"]";
}
#endif

//Quaternion
class Quat extends Vector4 {
  constructor(float x, float y, float z, float w)
  {
    static v4init = [0, 0, 0, 0]
    var vec = v4init;
    
    if (typeof(x) == "number") {
      v4init[0] = x; v4init[1] = y; v4init[2] = z; v4init[3] = w;
    } else {
      vec = x;
    }
    
    Vector4.call(this, vec);
  }

  load(x,y,z,w)
  {
      if (typeof x == 'object' && "length" in x) {
          this[0] = x[0];
          this[1] = x[1];
          this[2] = x[2];
          this[3] = x[3];
      }
      else if (typeof x == 'number') {
          this[0] = x;
          this[1] = y;
          this[2] = z;
          this[3] = w;
      }
      else {
          this[0] = 0;
          this[1] = 0;
          this[2] = 0;
          this[3] = 0;
      }
  }

  makeUnitQuat()
  {
    this[0] = 1.0;
    this[1] = this[2] = this[3] = 0.0;
  }

  isZero() : Boolean
  {
    return (this[0] == 0 && this[1] == 0 && this[2] == 0 && this[3] == 0);
  }

  mulQuat(Quat q2)
  {
    var t0 = this[0] * q2[0] - this[1] * q2[1] - this[2] * q2[2] - this[3] * q2[3];
    var t1 = this[0] * q2[1] + this[1] * q2[0] + this[2] * q2[3] - this[3] * q2[2];
    var t2 = this[0] * q2[2] + this[2] * q2[0] + this[3] * q2[1] - this[1] * q2[3];
    this[3] = this[0] * q2[3] + this[3] * q2[0] + this[1] * q2[2] - this[2] * q2[1];
    this[0] = t0;
    this[1] = t1;
    this[2] = t2;
  }

  conjugate()
  {
    this[1] = -this[1];
    this[2] = -this[2];
    this[3] = -this[3];
  }

  dotWithQuat(Quat q2)
  {
    return this[0] * q2[0] + this[1] * q2[1] + this[2] * q2[2] + this[3] * q2[3];
  }

  invert()
  {
    var f = this.dot();

    if (f == 0.0)
      return;

    conjugate_qt(q);
    this.mulscalar(1.0 / f);
  }

  sub(Quat q2)
  {
    var nq2 = new Quat();

    nq2[0] = -q2[0];
    nq2[1] = q2[1];
    nq2[2] = q2[2];
    nq2[3] = q2[3];
    
    this.mul(nq2);
  }

  mulScalarWithFactor(float fac)
  {
    var angle = fac * saacos(this[0]);
    var co = Math.cos(angle);
    var si = Math.sin(angle);
    this[0] = co;
    
    var last3 = Vector3([this[1], this[2], this[3]]);
    last3.normalize();
    
    last3.mulScalar(si);
    this[1] = last3[0];
    this[2] = last3[1];
    this[3] = last3[2];
    
    return this;
  }

  toMatrix()
  {
    var m = new Matrix4()
    
    var q0 = M_SQRT2 * this[0];
    var q1 = M_SQRT2 * this[1];
    var q2 = M_SQRT2 * this[2];
    var q3 = M_SQRT2 * this[3];

    var qda = q0 * q1;
    var qdb = q0 * q2;
    var qdc = q0 * q3;
    var qaa = q1 * q1;
    var qab = q1 * q2;
    var qac = q1 * q3;
    var qbb = q2 * q2;
    var qbc = q2 * q3;
    var qcc = q3 * q3;
    
    m.$matrix.m11 = (1.0 - qbb - qcc);
    m.$matrix.m12 = (qdc + qab);
    m.$matrix.m13 = (-qdb + qac);
    m.$matrix.m14 = 0.0;

    m.$matrix.m21 = (-qdc + qab);
    m.$matrix.m22 = (1.0 - qaa - qcc);
    m.$matrix.m23 = (qda + qbc);
    m.$matrix.m24 = 0.0;

    m.$matrix.m31 = (qdb + qac);
    m.$matrix.m32 = (-qda + qbc);
    m.$matrix.m33 = (1.0 - qaa - qbb);
    m.$matrix.m34 = 0.0;

    m.$matrix.m41 = m.$matrix.m42 = m.$matrix.m43 = 0.0;
    m.$matrix.m44 = 1.0;
    
    return m;
  }

  matrixToQuat(Matrix4 wmat)
  {
    var mat = new Matrix4(wmat);
    
    /* work on a copy */
    
    /*normalize the input matrix, as if it were a 3x3 mat. This is needed AND a 'normalize_qt' in the end */
    mat.$matrix.m41 = mat.$matrix.m42 = mat.$matrix.m43 = 0;
    mat.$matrix.m44 = 1.0;
    
    var r1 = new Vector3([mat.$matrix.m11, mat.$matrix.m12, mat.$matrix.m13]);
    var r2 = new Vector3([mat.$matrix.m21, mat.$matrix.m22, mat.$matrix.m23]);
    var r3 = new Vector3([mat.$matrix.m31, mat.$matrix.m32, mat.$matrix.m33]);
    r1.normalize();
    r2.normalize();
    r3.normalize();

    mat.$matrix.m11 = r1[0]; mat.$matrix.m12 = r1[1]; mat.$matrix.m13 = r1[2]; 
    mat.$matrix.m21 = r2[0]; mat.$matrix.m22 = r2[1]; mat.$matrix.m23 = r2[2]; 
    mat.$matrix.m31 = r3[0]; mat.$matrix.m32 = r3[1]; mat.$matrix.m33 = r3[2]; 
    
    /*now for the main calculations*/
    var tr = 0.25 * (1.0 + mat[0][0] + mat[1][1] + mat[2][2]);
    var s = 0;
    
    if (tr > FLT_EPSILON) {
      s = Math.sqrt(tr);
      this[0] = s;
      s = 1.0 / (4.0 * s);
      this[1] = ((mat[1][2] - mat[2][1]) * s);
      this[2] = ((mat[2][0] - mat[0][2]) * s);
      this[3] = ((mat[0][1] - mat[1][0]) * s);
    }
    else {
      if (mat[0][0] > mat[1][1] && mat[0][0] > mat[2][2]) {
        s = 2.0 * Math.sqrt(1.0 + mat[0][0] - mat[1][1] - mat[2][2]);
        this[1] = (0.25 * s);

        s = 1.0 / s;
        this[0] = ((mat[2][1] - mat[1][2]) * s);
        this[2] = ((mat[1][0] + mat[0][1]) * s);
        this[3] = ((mat[2][0] + mat[0][2]) * s);
      }
      else if (mat[1][1] > mat[2][2]) {
        s = 2.0 * Math.sqrt(1.0 + mat[1][1] - mat[0][0] - mat[2][2]);
        this[2] = (0.25 * s);

        s = 1.0 / s;
        this[0] = ((mat[2][0] - mat[0][2]) * s);
        this[1] = ((mat[1][0] + mat[0][1]) * s);
        this[3] = ((mat[2][1] + mat[1][2]) * s);
      }
      else {
        s = 2.0 * Math.sqrt(1.0 + mat[2][2] - mat[0][0] - mat[1][1]);
        this[3] = (0.25 * s);

        s = 1.0 / s;
        this[0] = ((mat[1][0] - mat[0][1]) * s);
        this[1] = ((mat[2][0] + mat[0][2]) * s);
        this[2] = ((mat[2][1] + mat[1][2]) * s);
      }
    }

    this.normalize();
  }

  normalize() : float
  {

    var len = Math.sqrt(this.dot(this))
    if (len != 0.0) {
      this.mulScalar(1.0 / len);
    }
    else {
      this[1] = 1.0;
      this[0] = this[2] = this[3] = 0.0;
    }

    return len;
  }

  /* Axis angle to Quaternions */
  axisAngleToQuat(Vector3 axis, float angle)
  {
    var nor = new Vector3(axis);
    
    if (nor.normalize() != 0.0) {
      var phi = angle / 2.0;
      var si = Math.sin(phi);
      this[0] = Math.cos(phi);
      this[1] = nor[0] * si;
      this[2] = nor[1] * si;
      this[3] = nor[2] * si;
    }
    else {
      this.makeUnitQuat();
    }
  }

  rotationBetweenVecs(Vector3 v1, Vector3 v2) 
  {
    v1 = new Vector3(v1);
    v2 = new Vector3(v2);
    v1.normalize();
    v2.normalize();
    
    var axis = new Vector3(v1);
    axis.cross(v2);

    var angle = v1.preNormalizedAngle(v2);
    
    this.axisAngleToQuat(axis, angle);
  }

  quatInterp(Quat quat2, float t)
  {
    var quat = new Quat();
    
    var cosom = this[0] * quat2[0] + this[1] * quat2[1] + this[2] * quat2[2] + this[3] * quat2[3];

    /* rotate around shortest angle */
    if (cosom < 0.0) {
      cosom = -cosom;
      quat[0] = -this[0];
      quat[1] = -this[1];
      quat[2] = -this[2];
      quat[3] = -this[3];
    }
    else {
      quat[0] = this[0];
      quat[1] = this[1];
      quat[2] = this[2];
      quat[3] = this[3];
    }
    
    var omega, sinom, sc1, sc2;
    if ((1.0 - cosom) > 0.0001) {
      omega = Math.acos(cosom);
      sinom = Math.sin(omega);
      sc1 = Math.sin((1.0 - t) * omega) / sinom;
      sc2 = Math.sin(t * omega) / sinom;
    }
    else {
      sc1 = 1.0 - t;
      sc2 = t;
    }

    this[0] = sc1 * quat[0] + sc2 * quat2[0];
    this[1] = sc1 * quat[1] + sc2 * quat2[1];
    this[2] = sc1 * quat[2] + sc2 * quat2[2];
    this[3] = sc1 * quat[3] + sc2 * quat2[3];
  }
}
